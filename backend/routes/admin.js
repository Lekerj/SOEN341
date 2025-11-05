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
router.get('/users', requireAdmin, (req,res)=>{
    const sql = `
    SELECT id, name, email, role, created_at, organization
    FROM users
    ORDER BY created_at DESC`;

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
    const VALID_ROLES = ['admin', 'organizer', 'student','user','pending','rejected'];

    //400 Bad Request Check: Validate role input 
    if(!newRole || !VALID_ROLES.includes(newRole)){
        return res.status(400).json({
            success: false,
            message: `Invalid or missing role provided. Must be one of: ${VALID_ROLES.join(', ')}.`
        })
    }
    const sql = 'UPDATE usuers SET role = ? WHERE id = ?';

    db.query(sql,[newRole,userId], (err,result) =>{
        if(err){
            console.error(`DB Error assinging role to user ${userId}:`, err);
            return res.status(500).json({success:false, erorr:"Internal Server Error"});
        }
        if(results.affectedRows===0){
            return res.status(404).json({success: false, message: "User not found."});
        }

        //Audit Trail Log:
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) assigned role '${newRole}' to User ID: ${userId}`);
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
    FROM ogranization
    ORDER BY name ASC`;

    db.query(sql,(err,results)=>{
        if(err){
            console.error("DB Error Fetching all organizations:", err);
            return res.status(500).json({succes: false, error: "Internal Server Error", message: "Failed to retrieve organization list."});
        }
        res.status(200).json({sucess: true, organization: results});
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
    const sql = `SELECT * FROM events WHERE is_flagged = TRUE ORDER BY created_at DESC`;

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