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

// Endpoint for Organizer Approval
//router GET: /api/admin/organizer/pending (Fetches pending Requests)
router.get('/organizer/pending', requireAdmin, (req,res) => {
    const sql = `
    SELECT id, name, email, organization, created_at
    FROM users
    WHERE role = 'pending'
    ORDER BY created_at ASC`; 

    db.query(sql, (err, results)=> {
        if(err){
            console.error("DB Error Fetching Pending organizers:" , err);
            return res.status(500).json({success: false, error: "Internal Server Error", message: "Failed to retrieve the pending requests."});
        }
        //Returns the list of pending organizers (name, email, organizations, etc...
        res.status(200).json({success: true, pendingOrganizer: results});
    });
});

// ROUTER POST /api/admin/organizer/:id/approve
router.post('/organizers/:id/approve', requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Updates role to 'organizer' only if the current role is 'pending'
    const sql = 'UPDATE users SET role = ? WHERE id = ? AND role = "pending"';
    
    db.query(sql, ['organizer', userId], (err, result) => {
        if (err) {
            console.error(`DB Error approving user ${userId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Database update failed during approval." });
        }
        
        if (result.affectedRows === 0) {
             return res.status(404).json({ success: false, message: "User not found or not eligible for approval (role is not 'pending')." });
        }
        // ADDED: Audit Log for successful rejection
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) APPROVED user ID: ${userId}`);

        signalEmailNotification(userId, 'approved');
        
        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} approved. Role updated to 'organizer'.` });
    });
});

// ROUTER POST /api/admin/organizer/:id/reject
router.post('/organizers/:id/reject', requireAdmin, (req, res) => {
    const userId = req.params.id;

    // Updates role to 'rejected' only if the current role is 'pending'
    const sql = 'UPDATE users SET role = ? WHERE id = ? AND role = "pending"';

    db.query(sql, ['rejected', userId], (err, result) => {
        if (err) {
            console.error(`DB Error rejecting user ${userId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Database update failed during rejection." });
        }

        if (result.affectedRows === 0) {
             return res.status(404).json({ success: false, message: "User not found or not eligible for rejection (role is not 'pending')." });
        }
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) REJECTED user ID: ${userId}`);
        signalEmailNotification(userId, 'rejected');

        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} rejected. Role updated to 'rejected'.` });
    });
});

//-- User Management Endpoints -- 
/**
 * Route GET /api/admin/users\
 * AC: Return list of all users with current roles
 */
router.get('/users', requireAdmin, (req, res) => {
    const sql = `
    SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        u.organization_id,
        o.name AS organization_name,
        o.logo_url AS organization_logo
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    ORDER BY u.created_at DESC`;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("DB Error Fetching all users:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to retrieve user list." });
        }
        res.status(200).json({ success: true, users: results });
    });
});

/**
 * Route: PUT /api/admin/users/:id/role
 * AC: Allows assigning user roles (admin, organizer, student, user).
 * AC: Role types validated.
 */

router.put('/users/:id/role', requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { newRole, organizationId } = req.body;

    const VALID_ROLES = ['admin', 'organizer', 'student', 'user', 'pending', 'rejected'];

    const fields = [];
    const params = [];

    if (newRole !== undefined) {
        if (!VALID_ROLES.includes(newRole)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role provided. Must be one of: ${VALID_ROLES.join(', ')}`,
            });
        }
        fields.push('role = ?');
        params.push(newRole);
    }

    if (organizationId !== undefined) {
        const orgValue = organizationId === null || organizationId === '' ? null : Number(organizationId);
        if (orgValue !== null && Number.isNaN(orgValue)) {
            return res.status(400).json({
                success: false,
                message: 'organizationId must be a number or null.',
            });
        }
        fields.push('organization_id = ?');
        params.push(orgValue);
    }

    if (fields.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No fields provided to update.',
        });
    }

    params.push(userId);

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(`DB Error assigning role to user ${userId}:`, err);
            if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
                return res.status(400).json({
                    success: false,
                    message: 'Organization not found. Please choose a valid organization.',
                });
            }
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) updated user ID ${userId} with fields: ${fields.join(', ')}`);
        res.status(200).json({ success: true, message: 'User updated successfully.' });
    });
});

// -- New Organization Management Endpoint ---

/**
 * ROUTE: GET /api/admin/organization
 * AC: Return Lists of all organization with details
 */
function fetchOrganizations(res) {
    const orgSql = `
        SELECT id, name, logo_url, description, created_at, updated_at
        FROM organizations
        ORDER BY name ASC`;

    const memberSql = `
        SELECT u.id, u.name, u.email, u.role, u.organization_id
        FROM users u
        WHERE u.organization_id IS NOT NULL
          AND u.role IN ('organizer', 'admin')
        ORDER BY u.name ASC`;

    db.query(orgSql, (orgErr, orgResults) => {
        if (orgErr) {
            console.error("DB Error fetching organizations:", orgErr);
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to retrieve organization list." });
        }

        db.query(memberSql, (memberErr, memberResults) => {
            if (memberErr) {
                console.error("DB Error fetching organization members:", memberErr);
                return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to retrieve organization members." });
            }

            const membersByOrg = memberResults.reduce((acc, user) => {
                if (!acc[user.organization_id]) acc[user.organization_id] = [];
                acc[user.organization_id].push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                });
                return acc;
            }, {});

            const payload = orgResults.map((org) => ({
                ...org,
                members: membersByOrg[org.id] || [],
            }));

            res.status(200).json({ success: true, organizations: payload });
        });
    });
}

router.get('/organizations', requireAdmin, (req, res) => {
    fetchOrganizations(res);
});

router.get('/organization', requireAdmin, (req, res) => {
    fetchOrganizations(res);
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
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (logo_url !== undefined) { fields.push('logo_url = ?'); params.push(logo_url); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }

    if (fields.length === 0) {
        return res.status(400).json({ success: false, message: "No editable fields provided for organization update." });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
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

router.post('/organizations', requireAdmin, (req, res) => {
    const { name, logo_url, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Organization name is required.' });
    }

    const sql = `INSERT INTO organizations (name, logo_url, description) VALUES (?, ?, ?)`;
    db.query(sql, [name.trim(), logo_url || null, description || null], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, message: 'An organization with that name already exists.' });
            }
            console.error('DB Error creating organization:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }

        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) created organization ID: ${result.insertId}`);
        res.status(201).json({ success: true, message: 'Organization created successfully.', organizationId: result.insertId });
    });
});
// --- EVENT MODERATION ENDPOINTS ---

/**
 * Route: GET /api/admin/events
 * AC: Returns list of all event details.
 */
router.get('/events', requireAdmin, (req, res) => {
    const sql = `SELECT * FROM events ORDER BY event_date DESC`;

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
    const sql = `SELECT * FROM events 
                 WHERE is_flagged = TRUE 
                    OR moderation_status IN ('pending', 'rejected')
                 ORDER BY created_at DESC`;

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
 * Route: POST /api/admin/events/:id/approve
 * AC: Marks event as reviewed and visible to everyone.
 */
router.post('/events/:id/approve', requireAdmin, (req, res) => {
    const eventId = req.params.id;
    const sql = `
        UPDATE events
        SET is_flagged = FALSE,
            is_visible = TRUE,
            moderation_status = 'approved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    db.query(sql, [eventId], (err, result) => {
        if (err) {
            console.error(`DB Error approving event ${eventId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Event not found." });
        }

        console.log(`AUDIT: Moderator (User ID: ${req.session.userId}) APPROVED Event ID: ${eventId}`);
        res.status(200).json({ success: true, message: `Event ${eventId} approved and restored to listings.` });
    });
});

/**
 * Route: POST /api/admin/events/:id/reject
 * AC: Hides event from public browse lists while keeping record for admins.
 */
router.post('/events/:id/reject', requireAdmin, (req, res) => {
    const eventId = req.params.id;
    const sql = `
        UPDATE events
        SET is_flagged = TRUE,
            is_visible = FALSE,
            moderation_status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    db.query(sql, [eventId], (err, result) => {
        if (err) {
            console.error(`DB Error rejecting event ${eventId}:`, err);
            return res.status(500).json({ success: false, error: "Internal Server Error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Event not found." });
        }

        console.log(`AUDIT: Moderator (User ID: ${req.session.userId}) REJECTED Event ID: ${eventId}`);
        res.status(200).json({ success: true, message: `Event ${eventId} rejected and hidden from browse.` });
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
