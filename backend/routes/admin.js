const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

/**
 * Placeholder function to signal/trigger email notification
 * In a real application, this would use a dedicated email service or queue.
 */
const signalEmailNotification = (userID, decision) => {
    console.log(`[Email Notification Signal] Decision: ${decision} for User ID: ${userID}`);
};

// Endpoint: GET /api/admin/organizer/pending (Fetch pending organizer requests)
router.get('/organizer/pending', requireAdmin, (req, res) => {
    const sql = `
        SELECT 
            u.id, u.name, u.email, u.request_date, u.organization_role,
            o.id AS organization_id, o.name AS organization_name, o.category AS organization_category
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.organizer_auth_status = 'pending'
        ORDER BY u.request_date ASC`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('DB Error Fetching Pending organizers:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to retrieve the pending requests.' });
        }
        res.status(200).json({ success: true, pendingOrganizer: results });
    });
});

// ROUTER POST /api/admin/organizers/:id/approve
router.post('/organizers/:id/approve', requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { organization_role } = req.body || {};
    const roleToAssign = organization_role || 'Member';

    const sql = `UPDATE users 
                             SET role = 'organizer', organizer_auth_status = 'approved', 
                                     organization_role = ?, approval_date = CURRENT_TIMESTAMP
                             WHERE id = ?`;

    db.query(sql, [roleToAssign, userId], (err, result) => {
        if (err) {
            console.error(`DB Error approving user ${userId}:`, err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Database update failed during approval.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User not found or not eligible for approval." });
        }

        // Audit Log for successful approval
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) APPROVED user ID: ${userId}`);

        // Fetch organization_id to add membership & notify user
        const getOrgSql = 'SELECT organization_id FROM users WHERE id = ?';
        db.query(getOrgSql, [userId], (e2, rows) => {
            if (e2) {
                console.error('Failed fetching org for approved user:', e2);
            } else if (rows && rows[0] && rows[0].organization_id) {
                const orgId = rows[0].organization_id;
                // Insert membership if not already present
                const memberSql = `INSERT IGNORE INTO organization_members (user_id, organization_id, role, status) VALUES (?, ?, ?, 'active')`;
                db.query(memberSql, [userId, orgId, roleToAssign], (e3) => {
                    if (e3) console.error('Membership insert failed:', e3);
                });
                // Notify user
                const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                                            VALUES (?, 'user', 'request_approved', 'Organizer request approved', 'Your organizer request has been approved.', ?, ?, 'approved')`;
                db.query(nsql, [userId, userId, orgId], (e4) => { if (e4) console.error('Notification insert failed (approval):', e4); });
            }
        });

        // Also send signal/email if available
        try { signalEmailNotification(userId, 'approved'); } catch (e) { /* ignore */ }

        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} approved. Role updated to 'organizer'.` });
    });
});

// ROUTER POST /api/admin/organizers/:id/reject
router.post('/organizers/:id/reject', requireAdmin, (req, res) => {
    const userId = req.params.id;

    const sql = `UPDATE users 
                             SET organizer_auth_status = 'refused', approval_date = CURRENT_TIMESTAMP
                             WHERE id = ?`;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(`DB Error rejecting user ${userId}:`, err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Database update failed during rejection.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User not found or not eligible for rejection." });
        }

        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) REJECTED user ID: ${userId}`);

        // Notify user of rejection
        const getOrgSql = 'SELECT organization_id FROM users WHERE id = ?';
        db.query(getOrgSql, [userId], (e2, rows) => {
            const orgId = !e2 && rows && rows[0] ? rows[0].organization_id : null;
            const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                                        VALUES (?, 'user', 'request_refused', 'Organizer request refused', 'Your organizer request has been refused. You may modify and resubmit.', ?, ?, 'refused')`;
            db.query(nsql, [userId, userId, orgId], (e3) => {
                if (e3) console.error('Notification insert failed (rejection):', e3);
            });
        });

        try { signalEmailNotification(userId, 'rejected'); } catch (e) { /* ignore */ }

        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} rejected. Role updated to 'rejected'.` });
    });
});

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
router.get('/organizer/requests', requireAdmin, (req, res) => {
    const sql = `SELECT r.id, r.user_id, r.organization_id, r.request_type, r.status, r.details, r.created_at,
                        u.name AS user_name, u.email AS user_email,
                        o.name AS organization_name, o.category AS organization_category
                 FROM organizer_requests r
                 LEFT JOIN users u ON r.user_id = u.id
                 LEFT JOIN organizations o ON r.organization_id = o.id
                 WHERE r.status = 'pending'
                 ORDER BY r.created_at ASC`;
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('DB error fetching pending organizer requests:', err);
            return res.status(500).json({ success:false, error:'Internal Server Error' });
        }
        res.status(200).json({ success:true, requests: rows });
    });
});

/**
 * PATCH /api/admin/organizer/requests/:id/decision
 * Body: { decision: 'approved' | 'refused', role? }
 * Applies decision to organizer_requests row & updates users / memberships.
 */
router.patch('/organizer/requests/:id/decision', requireAdmin, (req, res) => {
    const requestId = req.params.id;
    const { decision, role } = req.body || {};
    if (!['approved','refused'].includes(decision)) {
        return res.status(400).json({ success:false, error:'decision must be approved or refused'});
    }
    // Fetch request & user
    const fetchSql = `SELECT r.*, u.role AS user_role, u.organizer_auth_status, u.id AS user_id, u.organization_id AS user_org_id
                      FROM organizer_requests r
                      JOIN users u ON r.user_id = u.id
                      WHERE r.id = ?`;
    db.query(fetchSql, [requestId], (err, rows) => {
        if (err) { console.error('DB error fetching request:', err); return res.status(500).json({ success:false, error:'Internal'}); }
        if (!rows.length) return res.status(404).json({ success:false, error:'Request not found' });
        const reqRow = rows[0];
        // Update request status
        db.query('UPDATE organizer_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [decision, requestId], (e2) => {
            if (e2) { console.error('DB error updating request status:', e2); return res.status(500).json({ success:false, error:'Internal'}); }
            if (decision === 'approved') {
                // Update user record
                db.query(`UPDATE users SET role='organizer', organizer_auth_status='approved', organization_role=?, approval_date=CURRENT_TIMESTAMP WHERE id=?`, [role || 'Member', reqRow.user_id], (e3) => {
                    if (e3) { console.error('User update fail:', e3); }
                    // Insert membership
                    if (reqRow.organization_id) {
                        db.query(`INSERT IGNORE INTO organization_members (user_id, organization_id, role, status) VALUES (?, ?, ?, 'active')`, [reqRow.user_id, reqRow.organization_id, role || 'Member']);
                    }
                    // Notify user
                    const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                                   VALUES (?, 'user', 'request_approved', 'Organizer request approved', 'Your organizer request has been approved.', ?, ?, 'approved')`;
                    db.query(nsql, [reqRow.user_id, reqRow.user_id, reqRow.organization_id]);
                });
            } else { // refused
                db.query(`UPDATE users SET organizer_auth_status='refused', approval_date=CURRENT_TIMESTAMP WHERE id=?`, [reqRow.user_id], (e4) => {
                    if (e4) console.error('User refusal update fail:', e4);
                    const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                                   VALUES (?, 'user', 'request_refused', 'Organizer request refused', 'Your organizer request has been refused. You may modify and resubmit.', ?, ?, 'refused')`;
                    db.query(nsql, [reqRow.user_id, reqRow.user_id, reqRow.organization_id]);
                });
            }
            return res.status(200).json({ success:true, message:`Request ${requestId} ${decision}` });
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

// Route: GET /api/admin/events - Returns list of all events
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
            console.error('DB Error fetching all events:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, events: results });
    });
});

// Route: GET /api/admin/events/flagged - Returns flagged events
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
            console.error('DB Error fetching flagged events:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, flaggedEvents: results });
    });
});

// Route: PUT /api/admin/events/:id - Update event
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
        return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(eventId);

    const sql = `UPDATE events SET ${fields.join(', ')} WHERE id = ?`;

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(`DB Error updating event ${eventId}:`, err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        // Audit Trail Log
        console.log(`AUDIT: Moderator (User ID: ${req.session.userId}) edited Event ID: ${eventId}`);

        res.status(200).json({ success: true, message: `Event ${eventId} updated successfully.` });
    });
});

// Route: DELETE /api/admin/events/:id - Delete event
router.delete('/events/:id', requireAdmin, (req, res) => {
    const eventId = req.params.id;
    const sql = 'DELETE FROM events WHERE id = ?';

    db.query(sql, [eventId], (err, result) => {
        if (err) {
            console.error(`DB Error deleting event ${eventId}:`, err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        // Audit Trail Log
        console.log(`AUDIT: Moderator (User ID: ${req.session.userId}) DELETED Event ID: ${eventId}`);

        res.status(200).json({ success: true, message: `Event ${eventId} successfully deleted.` });
    });
});

// Analytics handler (aggregated stats)
function getAnalyticsHandler(database) {
    return (req, res) => {
        const start = Date.now();
        const { organization } = req.query;

        let sql = `
            SELECT 
                COUNT(DISTINCT e.id) AS total_events,
                COUNT(t.id) AS total_tickets_issued,
                SUM(CASE WHEN t.checked_in = 1 THEN 1 ELSE 0 END) AS total_checked_in
            FROM events e
            LEFT JOIN tickets t ON t.event_id = e.id
        `;
        const params = [];

        if (organization && organization.trim() !== "") {
            sql += ' WHERE e.organization = ?';
            params.push(organization.trim());
        }

        database.query(sql, params, (err, rows) => {
            if (err) {
                console.error('Admin analytics query error:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const row = rows && rows[0] ? rows[0] : {};

            const totalEvents = Number(row.total_events || 0);
            const totalTickets = Number(row.total_tickets_issued || 0);
            const totalCheckedIn = Number(row.total_checked_in || 0);
            const totalNotCheckedIn = Math.max(totalTickets - totalCheckedIn, 0);
            const attendanceRate = totalTickets > 0 ? totalCheckedIn / totalTickets : 0;

            const duration = Date.now() - start;

            return res.json({
                success: true,
                data: {
                    total_events: totalEvents,
                    total_tickets_issued: totalTickets,
                    total_checked_in: totalCheckedIn,
                    total_not_checked_in: totalNotCheckedIn,
                    attendance_rate: Number(attendanceRate.toFixed(4)),
                },
                filters_applied: {
                    organization: organization && organization.trim() !== "" ? organization.trim() : null,
                },
                meta: {
                    query_ms: duration,
                },
            });
        });
    };
}

router.get('/analytics', requireAdmin, getAnalyticsHandler(db));

module.exports = router;
module.exports.getAnalyticsHandler = getAnalyticsHandler;
