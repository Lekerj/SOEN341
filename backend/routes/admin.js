>>>>>>> c1314db (API and Routes implemented)
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
        SELECT id, name, email, organization, created_at
        FROM users
        WHERE role = 'pending'
        ORDER BY created_at ASC`;

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

    // Updates role to 'organizer' only if the current role is 'pending'
    const sql = 'UPDATE users SET role = ? WHERE id = ? AND role = "pending"';

    db.query(sql, ['organizer', userId], (err, result) => {
        if (err) {
            console.error(`DB Error approving user ${userId}:`, err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Database update failed during approval.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User not found or not eligible for approval (role is not 'pending')." });
        }

        // Audit Log for successful approval
        console.log(`AUDIT: Admin (User ID: ${req.session.userId}) APPROVED user ID: ${userId}`);

        signalEmailNotification(userId, 'approved');

        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} approved. Role updated to 'organizer'.` });
    });
});

// ROUTER POST /api/admin/organizers/:id/reject
router.post('/organizers/:id/reject', requireAdmin, (req, res) => {
    const userId = req.params.id;

    // Updates role to 'rejected' only if the current role is 'pending'
    const sql = 'UPDATE users SET role = ? WHERE id = ? AND role = "pending"';

    db.query(sql, ['rejected', userId], (err, result) => {
        if (err) {
            console.error(`DB Error rejecting user ${userId}:`, err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Database update failed during rejection.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User not found or not eligible for rejection (role is not 'pending')." });
        }

        signalEmailNotification(userId, 'rejected');

        res.status(200).json({ success: true, message: `Organizer request for ID ${userId} rejected. Role updated to 'rejected'.` });
    });
});

// --- EVENT MODERATION ENDPOINTS ---

// Route: GET /api/admin/events - Returns list of all events
router.get('/events', requireAdmin, (req, res) => {
    const sql = `SELECT * FROM events ORDER BY event_date DESC`;

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
    const sql = `SELECT * FROM events WHERE is_flagged = TRUE ORDER BY created_at DESC`;

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
