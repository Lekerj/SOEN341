const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const{ requireAdmin } = require('../middleware/auth');

/**
 * Placeholder function to signal/trigger email notification (#176) 
 * In a real application, this would use a dedicated email service or queue.
 */

const signalEmailNotification = (userID, decision) => {
    console.log(`[Email Notification Signal] Decision: ${decision} for User ID: ${userID}`);
};

// NOTE: Legacy endpoints for direct approval/rejection via users table have been removed.
// Use GET /api/admin/organizer/requests and PATCH /api/admin/organizer/requests/:id/decision instead.

// ROUTER POST /api/admin/organizer/:id/approve
// (Removed) POST /api/admin/organizers/:id/approve
// (Removed) POST /api/admin/organizers/:id/reject

//-- User Management Endpoints -- 
/**
 * Route GET /api/admin/users\
 * AC: Return list of all users with current roles
 */
router.get('/users', requireAdmin, (req,res)=>{
    const sql = `
    SELECT u.id, u.name, u.email, u.role, u.created_at, u.organization_id, o.name AS organization_name
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    ORDER BY u.created_at DESC`;

    db.query(sql, (err, results)=>{
        if(err){
            console.error("DB Error Fetching all users:", err);
            return res.status(500).json({success: false, error: "Internal Server Error", message: "Failed to retrieve user list."});
        }
        res.status(200).json({success:true, users: results});
    })
})

/**
 * Route: PUT /api/admin/users/:id/role
 * AC: Allows assigning user roles (admin, organizer, student, user).
 * AC: Role types validated.
 */

router.put('/users/:id/role', requireAdmin, (req,res)=>{
    const userId = req.params.id;
    const { newRole } = req.body;

    //Define valid roles for validation
    const VALID_ROLES = ['admin', 'organizer', 'student','user'];

    //400 Bad Request Check: Validate role input 
    if(!newRole || !VALID_ROLES.includes(newRole)){
        return res.status(400).json({
            success: false,
            message: `Invalid or missing role provided. Must be one of: ${VALID_ROLES.join(', ')}.`
        })
    }
    const sql = 'UPDATE users SET role = ? WHERE id = ?';

    db.query(sql,[newRole,userId], (err,result) =>{
        if(err){
            console.error(`DB Error assinging role to user ${userId}:`, err);
            return res.status(500).json({success:false, error:"Internal Server Error"});
        }
        if(result.affectedRows===0){
            return res.status(404).json({success: false, message: "User not found."});
        }

        //Audit Trail Log:
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) assigned role '${newRole}' to User ID: ${userId}`);
        return res.status(200).json({ success: true, message: `Role for user ${userId} updated to ${newRole}`});
    })
})

// -- New Organization Management Endpoint ---

/**
 * ROUTE: GET /api/admin/organization
 * AC: Return Lists of all organization with details
 */
router.get('/organization', requireAdmin, (req,res)=>{
    const sql = `
    SELECT id, name, logo_url, description, created_at
    FROM organizations
    ORDER BY name ASC`;

    db.query(sql,(err,results)=>{
        if(err){
            console.error("DB Error Fetching all organizations:", err);
            return res.status(500).json({success: false, error: "Internal Server Error", message: "Failed to retrieve organization list."});
        }
        res.status(200).json({success: true, organization: results});
    });
});

/**
 * GET /api/admin/organizer/requests
 * Returns list of organizer_requests with pending status for review.
 */
// GET /api/admin/organizer/requests?status=pending|approved|refused|all
// Returns filtered organizer requests (default: pending) including refusal_reason.
router.get('/organizer/requests', requireAdmin, (req, res) => {
    const statusFilter = (req.query.status || 'pending').toLowerCase();
    const VALID = ['pending','approved','refused','all'];
    if (!VALID.includes(statusFilter)) {
        return res.status(400).json({ success:false, message:`Invalid status filter. Use one of ${VALID.join(', ')}`});
    }
    const whereClause = statusFilter === 'all' ? '1=1' : 'r.status = ?';
    const params = statusFilter === 'all' ? [] : [statusFilter];
    const sql = `SELECT r.id, r.user_id, r.organization_id, r.request_type, r.status, r.refusal_reason, r.details, r.created_at, r.updated_at,
                        u.name AS user_name, u.email AS user_email,
                        o.name AS organization_name, o.category AS organization_category
                 FROM organizer_requests r
                 LEFT JOIN users u ON r.user_id = u.id
                 LEFT JOIN organizations o ON r.organization_id = o.id
                 WHERE ${whereClause}
                 ORDER BY r.created_at ASC`;
    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error('DB error fetching organizer requests:', err);
            return res.status(500).json({ success:false, message:'Internal Server Error'});
        }
        return res.status(200).json({ success:true, count: rows.length, requests: rows });
    });
});

/**
 * PATCH /api/admin/organizer/requests/:id/decision
 * Body: { decision: 'approved' | 'refused', role? }
 * Applies decision to organizer_requests row & updates users / memberships.
 */
router.patch('/organizer/requests/:id/decision', requireAdmin, (req, res) => {
    const requestId = req.params.id;
    const { decision, role, refusal_reason } = req.body || {};
    if (!['approved','refused'].includes(decision)) {
        return res.status(400).json({ success:false, message:'Decision must be either approved or refused.' });
    }
    const trimmedReason = typeof refusal_reason === 'string' ? refusal_reason.trim() : '';
    if (decision === 'refused' && !trimmedReason) {
        return res.status(400).json({ success:false, message:'Refusal reason is required when declining a request.' });
    }
    const normalizedReason = decision === 'refused' ? trimmedReason : null;
    const ALLOWED_ORG_ROLES = ['Member','Event Manager','Vice President','President'];
    if (role && !ALLOWED_ORG_ROLES.includes(role)) {
        return res.status(400).json({ success:false, message:`Invalid organization role. Use one of ${ALLOWED_ORG_ROLES.join(', ')}.` });
    }
    db.beginTransaction(err => {
        if (err) { console.error('Transaction begin error:', err); return res.status(500).json({ success:false, message:'Internal Server Error'}); }
        const fetchSql = `SELECT r.*, u.role AS user_role, u.organizer_auth_status, u.id AS user_id
                          FROM organizer_requests r
                          JOIN users u ON r.user_id = u.id
                          WHERE r.id = ? FOR UPDATE`;
        db.query(fetchSql, [requestId], (fe, rows) => {
            if (fe) { console.error('Fetch request error:', fe); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
            if (!rows.length) return db.rollback(() => res.status(404).json({ success:false, message:'Request not found'}));
            const reqRow = rows[0];
            if (reqRow.status !== 'pending') {
                return db.rollback(() => res.status(409).json({ success:false, message:`Request already decided (status=${reqRow.status}).` }));
            }
            const updateRequestSql = `UPDATE organizer_requests SET status = ?, refusal_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            const refusalReasonVal = decision === 'refused' ? normalizedReason : null;
            db.query(updateRequestSql, [decision, refusalReasonVal, requestId], (urErr) => {
                if (urErr) { console.error('Update request error:', urErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                if (decision === 'approved') {
                    const finalRole = role || 'Member';
                    const updateUserSql = `UPDATE users SET role='organizer', organizer_auth_status='approved', organization_role=?, approval_date=CURRENT_TIMESTAMP WHERE id=?`;
                    db.query(updateUserSql, [finalRole, reqRow.user_id], (uuErr) => {
                        if (uuErr) { console.error('Update user error:', uuErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                        if (reqRow.organization_id) {
                            const memberSql = `INSERT IGNORE INTO organization_members (user_id, organization_id, role, status) VALUES (?, ?, ?, 'active')`;
                            db.query(memberSql, [reqRow.user_id, reqRow.organization_id, finalRole], (mErr) => {
                                if (mErr) { console.error('Membership insert error:', mErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                                // Notifications will be implemented later; commit transaction now
                                db.commit(cErr => {
                                    if (cErr) { console.error('Commit error:', cErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                                    return res.status(200).json({ success:true, message:`Request ${requestId} approved`, data:{ request_id: requestId, user_id: reqRow.user_id, role: finalRole } });
                                });
                            });
                        } else {
                            // No organization membership to add
                            db.commit(cErr => {
                                if (cErr) { console.error('Commit error:', cErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                                return res.status(200).json({ success:true, message:`Request ${requestId} approved`, data:{ request_id: requestId, user_id: reqRow.user_id, role: finalRole } });
                            });
                        }
                    });
                } else { // refused
                    const updateUserSql = `UPDATE users SET organizer_auth_status='refused', organization_role = NULL, approval_date=NULL WHERE id=?`;
                    db.query(updateUserSql, [reqRow.user_id], (uuErr) => {
                        if (uuErr) { console.error('Update user refusal error:', uuErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                        // Notifications will be implemented later; commit transaction now
                        db.commit(cErr => {
                            if (cErr) { console.error('Commit error:', cErr); return db.rollback(() => res.status(500).json({ success:false, message:'Internal Server Error'})); }
                            return res.status(200).json({ success:true, message:`Request ${requestId} refused`, data:{ request_id: requestId, user_id: reqRow.user_id, refusal_reason: refusalReasonVal } });
                        });
                    });
                }
            });
        });
    });
});

/**
 * PUT /api/admin/members/:id/role
 * Body: { role }
 * Updates role of a membership row in organization_members.
 */
router.put('/members/:id/role', requireAdmin, (req, res) => {
    const membershipId = req.params.id;
    const { role } = req.body || {};
    const VALID = ['Member','Event Manager','Vice President','President'];
    if (!VALID.includes(role)) return res.status(400).json({ success:false, error:`Invalid role. Must be one of ${VALID.join(', ')}` });
    const sql = `UPDATE organization_members SET role = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.query(sql, [role, membershipId], (err, result) => {
        if (err) { console.error('DB membership role update error:', err); return res.status(500).json({ success:false, error:'Internal Server Error'}); }
        if (result.affectedRows === 0) return res.status(404).json({ success:false, error:'Membership not found'});
        return res.status(200).json({ success:true, message:`Membership ${membershipId} role updated to ${role}` });
    });
});

// ---- Admin Notifications Endpoints ----
router.get('/notifications/unread-count', requireAdmin, (req, res) => {
    const sql = `SELECT COUNT(*) AS cnt FROM notifications WHERE audience = 'admin' AND is_read = FALSE`;
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('DB error fetching admin unread count:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, count: rows[0].cnt });
    });
});

router.get('/notifications', requireAdmin, (req, res) => {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 20, 100));
    const sql = `SELECT * FROM notifications WHERE audience = 'admin' ORDER BY created_at DESC LIMIT ?`;
    db.query(sql, [limit], (err, rows) => {
        if (err) {
            console.error('DB error fetching admin notifications:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, notifications: rows });
    });
});

router.post('/notifications/:id/read', requireAdmin, (req, res) => {
    const id = req.params.id;
    const sql = `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND audience = 'admin'`;
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('DB error marking admin notification read:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true });
    });
});

router.post('/notifications/read-all', requireAdmin, (req, res) => {
    const sql = `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                 WHERE audience = 'admin' AND is_read = FALSE`;
    db.query(sql, (err) => {
        if (err) {
            console.error('DB error marking all admin notifications read:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true });
    });
});

/**
 * Route: PUT /api/admin/organizations/:id
 * AC: Allows editing orgranizations name, logo, description.
 */
router.put('/organizations/:id', requireAdmin, (req, res) => {
    const orgId = req.params.id;
    const { name, logo_url, description } = req.body;
    
    const fields = [];
    const params = [];

    // Dynamic whitelisting for update
    if (name) { fields.push('name = ?'); params.push(name); }
    if (logo_url) { fields.push('logo_url = ?'); params.push(logo_url); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }

    if (fields.length === 0) {
        return res.status(400).json({ success: false, message: "No editable fields provided for organization update." });
    }

    params.push(orgId);

    const sql = `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`;

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(`DB Error updating organization ${orgId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Organization not found." });
        }

        // Audit Trail Log
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) edited Organization ID: ${orgId}. Fields: ${fields.join(', ')}`);

        res.status(200).json({ success: true, message: `Organization ${orgId} updated successfully.` });
    });
});
// --- EVENT MODERATION ENDPOINTS ---

/**
 * Route: GET /api/admin/events
 * AC: Returns list of all event details with organizer information.
 */
router.get('/events', requireAdmin, (req, res) => {
    const sql = `
    SELECT
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    ORDER BY e.event_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("DB Error fetching all events:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }
        res.status(200).json({ success: true, events: results });
    });
});

/**
 * Route: GET /api/admin/events/flagged
 * ADDED: Returns list of flagged/reported events only. (Required for Task #194)
 */
router.get('/events/flagged', requireAdmin, (req, res) => {
    const sql = `
    SELECT
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    WHERE e.is_flagged = TRUE
    ORDER BY e.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("DB Error fetching flagged events:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }
        res.status(200).json({ success: true, flaggedEvents: results });
    });
});

/**
 * Route: PUT /api/admin/events/:id
 * AC: Allows editing event details.
 */
router.put('/events/:id', requireAdmin, (req, res) => {
    const eventId = req.params.id;
    const { title, description, event_date, event_time, location, capacity, price, category } = req.body;
    
    const fields = [];
    const params = [];

    if (title) { fields.push('title = ?'); params.push(title); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (event_date) { fields.push('event_date = ?'); params.push(event_date); }
    if (event_time) { fields.push('event_time = ?'); params.push(event_time); }
    if (location) { fields.push('location = ?'); params.push(location); }
    if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity); }
    if (price !== undefined) { fields.push('price = ?'); params.push(price); }
    if (category) { fields.push('category = ?'); params.push(category); }

    if (fields.length === 0) {
        return res.status(400).json({ success: false, message: "No fields provided for update." });
    }

    params.push(eventId);

    const sql = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(`DB Error updating event ${eventId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Event not found." });
        }

        // Audit Trail Log
        console.log(`AUDIT: Moderator (User ID: ${req.session.userId}) edited Event ID: ${eventId}`);

        res.status(200).json({ success: true, message: `Event ${eventId} updated successfully.` });
    });
});

/**
 * Route: DELETE /api/admin/events/:id
 * AC: Deletes event from system.
 */
router.delete('/events/:id', requireAdmin, (req, res) => {
    const eventId = req.params.id;
    const sql = 'DELETE FROM events WHERE id = ?';

    db.query(sql, [eventId], (err, result) => {
        if (err) {
            console.error(`DB Error deleting event ${eventId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Event not found." });
        }

        // Audit Trail Log
        console.log(`AUDIT: Moderator (User ID: ${req.session.userId}) DELETED Event ID: ${eventId}`);

        res.status(200).json({ success: true, message: `Event ${eventId} successfully deleted.` });
    });
});

module.exports = router;