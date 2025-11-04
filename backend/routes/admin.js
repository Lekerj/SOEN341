const express = require('express');
const router = express.Router();
const db = require('..config/db'); 
const{ requireAdmin } = require('../middleware/auth');

/**
 * Placeholder function to signal/trigger email notification (#176) 
 * In a real application, this would use a dedicated email service or queue.
 */

const signalEmailNotification = (userID, decision) => {
    console.log(`[Email Notification Signal] Decision: ${decision} for User ID: ${userID}`);
};

// Endpoint for Organizer Approval

//router GET
router.get('/organizer/pending', requireAdmin, (req,res) => {
    const sql = `
    SELECT id, name, email, organization, created_at
    FROM users
    WHERE role = 'pending
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

// ROUTER POST FOR APPROVAL
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

        signalEmailNotification(userId, 'approved');
        
        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} approved. Role updated to 'organizer'.` });
    });
});

// ROUTER POSST FOR REJECTION 
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
        
        signalEmailNotification(userId, 'rejected');

        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} rejected. Role updated to 'rejected'.` });
    });
});

module.exports = router; 