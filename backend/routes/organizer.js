const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireOrganizer, requireApprovedOrganizer, requireAuth } = require('../middleware/auth'); 
const { attendeesToCsv } = require('../utils/csv');

// Utility function for basic validation 
const validateEventData = (data) => {
    const { title, description, event_date, event_time, location, capacity, price, organization, category } = data;
    const errors = [];
    const validCategories = ["sports","academic","social","club"];

    // Error handling for missing fields. 
    // if (!title || !description || !event_date || !event_time || !location || !organization || !category) {
    //     return "Missing required field(s).";
    // }

//  --- 1. Required Feilds and Length Checks ---
    // Title: Max 255 Characters
    if (!title) {
        errors.push('title: Required.');
    } else if (typeof title !== 'string' || title.length > 255) {
        errors.push('title: Must be a string, max 255 characters.');
    }

    // Description: Optional, string, max 5000 chars
    if (description && description.length > 5000) {
        errors.push('description: Must not exceed 5000 characters.');
    }

    // Location: Required, string, max 255 chars
    if (!location) {
        errors.push('location: Required.');
    } else if (typeof location !== 'string' || location.length > 255) {
        errors.push('location: Must be a string, max 255 characters.');
    }

    // Organization: Required, string, max 100 chars
    if (!organization) {
        errors.push('organization: Required.');
    } else if (typeof organization !== 'string' || organization.length > 100) {
        errors.push('organization: Must be a string, max 100 characters.');
    }
    // --- 2. Date and Time Validation ---
    
    // event_date: Required, valid date format (YYYY-MM-DD), not in past
    if (!event_date) {
        errors.push('event_date: Required.');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date) || isNaN(Date.parse(event_date))) {
        errors.push('event_date: Must be in YYYY-MM-DD format.');
    } else {
        // Check if date is in the past (only compare date, ignore time for simplicity)
        const eventDate = new Date(event_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

        if (eventDate < today) {
            errors.push('event_date: Must be a date in the future or today.');
        }
    }

    // event_time: Required, valid time format (HH:MM:SS)
    if (!event_time) {
        errors.push('event_time: Required.');
    } else if (!/^\d{2}:\d{2}:\d{2}$/.test(event_time)) {
        errors.push('event_time: Must be in HH:MM:SS format.');
    }
    
    // --- 3. Numeric and Categorical Validation ---

    // Capacity: Required, integer, minimum 1, maximum 10000
    const capacityInt = parseInt(capacity);
    if (isNaN(capacityInt) || capacityInt < 1 || capacityInt > 10000) {
        errors.push('capacity: Required, must be an integer between 1 and 10000.');
    }
    
    // Price: Required, decimal, minimum 0.00
    const priceString = String(price);
    const priceFloat = parseFloat(priceString);

    if (isNaN(priceFloat) || priceFloat < 0) {
        errors.push('price: Required, must be a non-negative number.');
    } else if (!/^\d+(\.\d{1,2})?$/.test(priceString)) {
        // Regex checks for a number followed by an optional decimal point and 1-2 digits.
        errors.push('price: Must have at most two decimal places (e.g., 10 or 10.99).');
    }

    
    // Category: Required, one of: sports, academic, social, club
    if (!category || !validCategories.includes(category)) {
        errors.push(`category: Required, must be one of: ${validCategories.join(', ')}.`);
    }

    return errors; // Returns an array of errors (empty if validation passes)
}

/**
 * Route: POST /api/organizer/events
 * Function: Allows an authenticated and APPROVED 'organizer' user to create a new event.
 * Middleware: requireApprovedOrganizer (Checks session, role, and approval status)
 */
router.post('/events', requireApprovedOrganizer, (req, res) => {
    const eventData = req.body;

    // 1. Validation 
    const validationError = validateEventData(eventData);
    if (validationError.length > 0) {
        console.warn('Event creation validation failed:', validationError);
        return res.status(400).json({ success: false, error: "Invalid Data", message: validationError });
    }

    // 2. Prepare Data 
    const organizer_Id = req.session.userId; 
    const tickets_Available = eventData.capacity; 

    const {
        title, description, event_date, event_time, location, 
        capacity, organization, category, price
    } = eventData;

    //Important Note, the Columns in the SQL string must match the order of variables in the 'params' array
    const sql = `
        INSERT INTO events 
        (organizer_id, title, description, event_date, event_time, location, capacity, organization, category, price, tickets_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        organizer_Id, title, description || null, event_date, event_time, location, 
        capacity, organization, category, price, tickets_Available
    ];

    // 3. Execute Database Insertion 
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database error during event creation:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to create event due to a database issue." });
        }

        // 4. Success Response: Return created event with ID and all details
        const newEvent = {
            id: result.insertId, // The ID is critical for the success response
            organizer_id: organizer_Id,
            tickets_available: tickets_Available,
            ...eventData
        };

        res.status(201).json({ 
            success: true, 
            message: "Event successfully created.",
            event: newEvent
        });
    });
});

/**
 * Route: PUT /api/organizer/events/:id
 * Function: Allows an authenticated and APPROVED 'organizer' user to update an existing event.
 * Middleware: requireApprovedOrganizer (Checks session, role, and approval status)
 */
router.put('/events/:id', requireApprovedOrganizer, (req, res) => {
    const eventId = req.params.id;
    const organizerId = req.session.userId;
    const eventData = req.body;

    // 1. Validate provided event data (only validate fields that are being updated)
    const validateUpdateData = (data) => {
        const errors = [];
        const validCategories = ["sports","academic","social","club"];

        // Title validation if provided
        if (data.title !== undefined) {
            if (!data.title) {
                errors.push('title: Required.');
            } else if (typeof data.title !== 'string' || data.title.length > 255) {
                errors.push('title: Must be a string, max 255 characters.');
            }
        }

        // Description validation if provided
        if (data.description !== undefined && data.description && data.description.length > 5000) {
            errors.push('description: Must not exceed 5000 characters.');
        }

        // Location validation if provided
        if (data.location !== undefined) {
            if (!data.location) {
                errors.push('location: Required.');
            } else if (typeof data.location !== 'string' || data.location.length > 255) {
                errors.push('location: Must be a string, max 255 characters.');
            }
        }

        // Organization validation if provided
        if (data.organization !== undefined) {
            if (!data.organization) {
                errors.push('organization: Required.');
            } else if (typeof data.organization !== 'string' || data.organization.length > 100) {
                errors.push('organization: Must be a string, max 100 characters.');
            }
        }

        // event_date validation if provided
        if (data.event_date !== undefined) {
            if (!data.event_date) {
                errors.push('event_date: Required.');
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.event_date) || isNaN(Date.parse(data.event_date))) {
                errors.push('event_date: Must be in YYYY-MM-DD format.');
            } else {
                const eventDate = new Date(data.event_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (eventDate < today) {
                    errors.push('event_date: Must be a date in the future or today.');
                }
            }
        }

        // event_time validation if provided
        if (data.event_time !== undefined) {
            if (!data.event_time) {
                errors.push('event_time: Required.');
            } else if (!/^\d{2}:\d{2}:\d{2}$/.test(data.event_time)) {
                errors.push('event_time: Must be in HH:MM:SS format.');
            }
        }

        // Capacity validation if provided
        if (data.capacity !== undefined) {
            const capacityInt = parseInt(data.capacity);
            if (isNaN(capacityInt) || capacityInt < 1 || capacityInt > 10000) {
                errors.push('capacity: Required, must be an integer between 1 and 10000.');
            }
        }

        // Price validation if provided
        if (data.price !== undefined) {
            const priceString = String(data.price);
            const priceFloat = parseFloat(priceString);
            if (isNaN(priceFloat) || priceFloat < 0) {
                errors.push('price: Required, must be a non-negative number.');
            } else if (!/^\d+(\.\d{1,2})?$/.test(priceString)) {
                errors.push('price: Must have at most two decimal places (e.g., 10 or 10.99).');
            }
        }

        // Category validation if provided
        if (data.category !== undefined) {
            if (!data.category || !validCategories.includes(data.category)) {
                errors.push(`category: Required, must be one of: ${validCategories.join(', ')}.`);
            }
        }

        return errors;
    };

    // Validate the update data
    const validationErrors = validateUpdateData(eventData);
    if (validationErrors.length > 0) {
        console.warn('Event update validation failed:', validationErrors);
        return res.status(400).json({ success: false, error: "Invalid Data", message: validationErrors });
    }

    // 2. Verify ownership of the event (Issue #113)
    const ownershipCheckSql = 'SELECT organizer_id FROM events WHERE id = ?';
    db.query(ownershipCheckSql, [eventId], (err, results) => {
        if (err) {
            console.error("Database error during ownership check:", err);
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to verify event ownership." });
        }

        // Check if event exists (404)
        if (results.length === 0) {
            console.warn(`Event update attempt for non-existent event ID: ${eventId}`);
            return res.status(404).json({ success: false, error: "Event not found" });
        }

        // Check if organizer owns the event (403)
        const event = results[0];
        if (event.organizer_id !== organizerId) {
            console.warn(`Unauthorized event update attempt: User ${organizerId} tried to update event owned by ${event.organizer_id}`);
            return res.status(403).json({ success: false, error: "Unauthorized", message: "You can only update your own events" });
        }

        // 3. Build dynamic SQL UPDATE query based on provided fields
        const updateFields = [];
        const updateValues = [];

        if (eventData.title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(eventData.title);
        }
        if (eventData.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(eventData.description || null);
        }
        if (eventData.event_date !== undefined) {
            updateFields.push('event_date = ?');
            updateValues.push(eventData.event_date);
        }
        if (eventData.event_time !== undefined) {
            updateFields.push('event_time = ?');
            updateValues.push(eventData.event_time);
        }
        if (eventData.location !== undefined) {
            updateFields.push('location = ?');
            updateValues.push(eventData.location);
        }
        if (eventData.capacity !== undefined) {
            updateFields.push('capacity = ?');
            updateValues.push(eventData.capacity);
        }
        if (eventData.price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(eventData.price);
        }
        if (eventData.organization !== undefined) {
            updateFields.push('organization = ?');
            updateValues.push(eventData.organization);
        }
        if (eventData.category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(eventData.category);
        }

        // Always update the updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        // If no fields provided, return error
        if (updateFields.length === 1) { // Only updated_at would be set
            console.warn('Event update attempt with no fields provided');
            return res.status(400).json({ success: false, error: "Invalid Data", message: "At least one field must be provided for update." });
        }

        // Add event ID to values for WHERE clause
        updateValues.push(eventId);

        const updateSql = `
            UPDATE events
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;

        // 4. Execute database update
        db.query(updateSql, updateValues, (err, result) => {
            if (err) {
                console.error("Database error during event update:", err);
                return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to update event due to a database issue." });
            }

            // 5. Fetch the updated event and return it
            const fetchSql = 'SELECT * FROM events WHERE id = ?';
            db.query(fetchSql, [eventId], (err, results) => {
                if (err) {
                    console.error("Database error fetching updated event:", err);
                    return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to fetch updated event." });
                }

                if (results.length === 0) {
                    console.error("Updated event not found after update");
                    return res.status(500).json({ success: false, error: "Internal Server Error", message: "Event was updated but could not be retrieved." });
                }

                const updatedEvent = results[0];
                res.status(200).json({
                    success: true,
                    message: "Event successfully updated.",
                    event: updatedEvent
                });
            });
        });
    });
});

/**
 * Route: GET /api/organizer/events/:id/analytics
 * Function: Returns detailed analytics for a specific event owned by the organizer.
 * Middleware: requireApprovedOrganizer
 */
router.get('/events/:id/analytics', requireApprovedOrganizer, async (req, res) => {
    const eventId = req.params.id;
    const organizerId = req.session.userId;

    // 1. Verify event ownership
    const ownershipSql = 'SELECT * FROM events WHERE id = ? AND organizer_id = ?';
    db.query(ownershipSql, [eventId, organizerId], (err, eventResults) => {
        if (err) {
            console.error('DB error during event ownership check:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to verify event ownership.' });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found or not owned by organizer.' });
        }
        const event = eventResults[0];

        // 2. Get main metrics
        const metricsSql = `
            SELECT 
              (e.capacity - e.tickets_available) AS tickets_issued,
              COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) AS tickets_checked_in,
              e.tickets_available AS remaining_capacity,
              ((COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) / NULLIF((e.capacity - e.tickets_available),0)) * 100) AS attendance_rate,
              ((e.capacity - e.tickets_available) * e.price) AS total_revenue
            FROM events e
            LEFT JOIN tickets t ON e.id = t.event_id
            WHERE e.id = ? AND e.organizer_id = ?
            GROUP BY e.id
        `;
        db.query(metricsSql, [eventId, organizerId], (err, metricsResults) => {
            if (err) {
                console.error('DB error during metrics query:', err);
                return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to calculate event metrics.' });
            }
            const metrics = metricsResults[0] || {
                tickets_issued: 0,
                tickets_checked_in: 0,
                attendance_rate: 0,
                remaining_capacity: event.capacity,
                total_revenue: 0
            };

            // 3. Get timeline (claims by date)
            const timelineSql = `
                SELECT DATE(created_at) AS date, COUNT(*) AS claims
                FROM tickets
                WHERE event_id = ?
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `;
            db.query(timelineSql, [eventId], (err, timelineResults) => {
                if (err) {
                    console.error('DB error during timeline query:', err);
                    return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch claim timeline.' });
                }
                return res.status(200).json({
                    success: true,
                    analytics: {
                        event,
                        metrics: {
                            tickets_issued: metrics.tickets_issued || 0,
                            tickets_checked_in: metrics.tickets_checked_in || 0,
                            attendance_rate: metrics.attendance_rate && !isNaN(metrics.attendance_rate)
                                ? Number(metrics.attendance_rate).toFixed(2)
                                : 0,
                            remaining_capacity: metrics.remaining_capacity || event.tickets_available,
                            total_revenue: metrics.total_revenue || 0
                        },
                        timeline: timelineResults || []
                    }
                });
            });
        });
    });
});



/**
 * Route: GET /api/organizer/events
 * Function: Returns all events owned by the authenticated organizer.
 * Middleware: requireApprovedOrganizer
 */

router.get('/events', requireApprovedOrganizer, (req, res) => {
    const organizerId = req.session.userId;
    console.log('Fetching events for organizer:', organizerId);
    const sql = `
        SELECT e.*, 
            (e.capacity - e.tickets_available) AS tickets_issued,
            COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) AS tickets_checked_in,
            e.tickets_available AS remaining_capacity,
            (CASE WHEN (e.capacity - e.tickets_available) > 0 THEN (COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) / (e.capacity - e.tickets_available)) * 100 ELSE 0 END) AS attendance_rate,
            ((e.capacity - e.tickets_available) * e.price) AS total_revenue
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id
        WHERE e.organizer_id = ?
        GROUP BY e.id
        ORDER BY e.event_date ASC, e.event_time ASC
    `;
    db.query(sql, [organizerId], async (err, results) => {
        if (err) {
            console.error('DB error fetching organizer events:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch events.' });
        }
        console.log('Found events:', results.length);
        console.log('Events:', JSON.stringify(results, null, 2));

        // For each event, fetch timeline data
        const eventsWithTimeline = await Promise.all(results.map(event => {
            return new Promise((resolve, reject) => {
                const timelineSql = `
                    SELECT DATE(created_at) AS date, COUNT(*) AS claims
                    FROM tickets
                    WHERE event_id = ?
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                `;
                db.query(timelineSql, [event.id], (err, timelineResults) => {
                    if (err) {
                        // If timeline fails, just return event without timeline
                        event.timeline = [];
                    } else {
                        event.timeline = timelineResults || [];
                    }
                    // Format metrics for consistency
                    event.attendance_rate = event.attendance_rate && !isNaN(event.attendance_rate)
                        ? Number(event.attendance_rate).toFixed(2)
                        : 0;
                    event.total_revenue = event.total_revenue || 0;
                    event.remaining_capacity = event.remaining_capacity || event.tickets_available;
                    resolve(event);
                });
            });
        }));

        return res.status(200).json({ success: true, events: eventsWithTimeline });
    });
});


/**
 * Route: GET /api/organizer/events/:id/export-csv
 * Function: Provides attendee list CSV download for organizer-owned event.
 * Middleware: requireApprovedOrganizer
 */
router.get('/events/:id/export-csv', requireApprovedOrganizer, (req, res) => {
    const eventId = req.params.id;
    const organizerId = req.session.userId;

    const ownershipSql = 'SELECT organizer_id FROM events WHERE id = ?';
    db.query(ownershipSql, [eventId], (err, eventResults) => {
        if (err) {
            console.error('DB error during event ownership check:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to verify event ownership.' });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found.' });
        }
        if (eventResults[0].organizer_id !== organizerId) {
            return res.status(403).json({ success: false, error: 'Unauthorized', message: 'You do not own this event.' });
        }

        const attendeeSql = `
            SELECT 
              u.name, u.email,
              t.ticket_type, t.qr_code,
              t.checked_in, t.created_at as claimed_at
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.event_id = ?
            ORDER BY t.created_at DESC
        `;

        db.query(attendeeSql, [eventId], (err, attendeeResults) => {
            if (err) {
                console.error('DB error during attendee query:', err);
                return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch attendees.' });
            }

            const csvContent = '\uFEFF' + attendeesToCsv(attendeeResults);

            const today = new Date().toISOString().split('T')[0];
            const filename = `event-${eventId}-attendees-${today}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send(csvContent);
        });
    });
});

/**
 * Route: GET /api/organizer/events/:id/attendees
 * Function: Returns detailed attendee info for a specific event owned by the organizer.
 * Middleware: requireApprovedOrganizer
 */
router.get('/events/:id/attendees', requireApprovedOrganizer, async (req, res) => {
    const eventId = req.params.id;
    const organizerId = req.session.userId;
    const checkedInParam = req.query.checked_in;

    // 1. Verify event ownership
    const ownershipSql = 'SELECT organizer_id FROM events WHERE id = ?';
    db.query(ownershipSql, [eventId], (err, eventResults) => {
        if (err) {
            console.error('DB error during event ownership check:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to verify event ownership.' });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found.' });
        }
        if (eventResults[0].organizer_id !== organizerId) {
            return res.status(403).json({ success: false, error: 'Unauthorized', message: 'You do not own this event.' });
        }

        // 2. Build attendee query
        let attendeeSql = `
            SELECT 
              u.name, u.email,
              t.id as ticket_id, t.ticket_type, t.qr_code, 
              t.checked_in, t.created_at as claimed_at
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.event_id = ?
        `;
        const params = [eventId];
        if (checkedInParam !== undefined) {
            if (checkedInParam === 'true') {
                attendeeSql += ' AND t.checked_in = TRUE';
            } else if (checkedInParam === 'false') {
                attendeeSql += ' AND t.checked_in = FALSE';
            }
        }
        attendeeSql += ' ORDER BY t.created_at DESC';

        db.query(attendeeSql, params, (err, attendeeResults) => {
            if (err) {
                console.error('DB error during attendee query:', err);
                return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch attendees.' });
            }
            return res.status(200).json({
                success: true,
                attendees: attendeeResults.map(a => ({
                    name: a.name,
                    email: a.email,
                    ticket_id: a.ticket_id,
                    ticket_type: a.ticket_type,
                    qr_code: a.qr_code,
                    checked_in: !!a.checked_in,
                    claimed_at: a.claimed_at
                }))
            });
        });
    });
});

module.exports = router;

/**
 * ---- NEW: Organizer Request & Notifications Endpoints ----
 * Keeping changes minimal and scoped to this file to avoid new route files.
 */

// Helper: insert admin notification
function notifyAdminOfRequest(requesterId, orgId, orgName) {
    const sql = `INSERT INTO notifications
        (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
        VALUES (NULL, 'admin', 'organizer_request', ?, ?, ?, ?, 'pending')`;
    const title = 'New organizer request';
    const message = `User ID ${requesterId} requested organizer access for organization: ${orgName}`;
    db.query(sql, [title, message, requesterId, orgId], (err) => {
        if (err) console.error('Failed to insert admin notification:', err);
    });
}

// Helper: insert user notification
function notifyUserOfDecision(userId, orgId, status) {
    const isApproved = status === 'approved';
    const type = isApproved ? 'request_approved' : 'request_refused';
    const title = isApproved ? 'Organizer request approved' : 'Organizer request refused';
    const message = isApproved
        ? 'Your organizer request has been approved.'
        : 'Your organizer request has been refused. You may modify and resubmit.';
    const sql = `INSERT INTO notifications
        (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
        VALUES (?, 'user', ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [userId, type, title, message, userId, orgId || null, status], (err) => {
        if (err) console.error('Failed to insert user notification:', err);
    });
}

/**
 * GET /api/organizer/organizations
 * Optional query ?category=sports|academic|social|club
 */
router.get('/organizations', (req, res) => {
    const { category } = req.query;
    let sql = `SELECT id, name, category, is_default FROM organizations`;
    const params = [];
    if (category) {
        sql += ` WHERE category = ?`;
        params.push(category);
    }
    sql += ` ORDER BY category ASC, name ASC`;
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('DB error fetching organizations:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, organizations: results });
    });
});

/**
 * GET /api/organizer/status
 * Returns current user's organizer_auth_status and organization info
 */
router.get('/status', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = `SELECT u.organizer_auth_status, u.organization_role, u.request_date, u.approval_date,
                                            o.id AS organization_id, o.name AS organization_name, o.category AS organization_category
                             FROM users u
                             LEFT JOIN organizations o ON u.organization_id = o.id
                             WHERE u.id = ?`;
    db.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error('DB error fetching organizer status:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.status(200).json({ success: true, status: rows[0] });
    });
});

/**
 * POST /api/organizer/request
 * Body: { organization_id } OR { new_organization_name, category }
 * Sets organizer_auth_status='pending', organization_role='Member', request_date=NOW(), approval_date=NULL
 */
router.post('/request', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { organization_id, new_organization_name, category } = req.body || {};

    // Validate input
    if (!organization_id && !new_organization_name) {
        return res.status(400).json({ success: false, error: 'Provide organization_id or new_organization_name' });
    }

    function finalizeWithOrgId(orgId, orgName) {
        const sql = `UPDATE users
                                 SET organization_id = ?, organizer_auth_status = 'pending', organization_role = 'Member',
                                         request_date = CURRENT_TIMESTAMP, approval_date = NULL
                                 WHERE id = ?`;
        db.query(sql, [orgId, userId], (err) => {
            if (err) {
                console.error('DB error updating user organizer request:', err);
                return res.status(500).json({ success: false, error: 'Internal Server Error' });
            }
            // Notify admins of new/updated request
            notifyAdminOfRequest(userId, orgId, orgName);
            res.status(200).json({ success: true, message: 'Request submitted. Status set to pending.' });
        });
    }

    if (organization_id) {
        // Use existing organization
        db.query('SELECT id, name FROM organizations WHERE id = ?', [organization_id], (err, rows) => {
            if (err) {
                console.error('DB error fetching organization:', err);
                return res.status(500).json({ success: false, error: 'Internal Server Error' });
            }
            if (!rows || rows.length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid organization_id' });
            }
            finalizeWithOrgId(rows[0].id, rows[0].name);
        });
    } else {
        // Create new organization then proceed
        if (!category || !['sports','academic','social','club'].includes(category)) {
            return res.status(400).json({ success: false, error: 'Valid category required for new organization' });
        }
        const insertOrg = `INSERT INTO organizations (name, description, category, is_default)
                                             VALUES (?, ?, ?, FALSE)`;
        const desc = `Requested by user ${userId}`;
        db.query(insertOrg, [new_organization_name, desc, category], (err, result) => {
            if (err) {
                console.error('DB error creating organization:', err);
                return res.status(500).json({ success: false, error: 'Failed to create organization' });
            }
            finalizeWithOrgId(result.insertId, new_organization_name);
        });
    }
});

/**
 * ---- User Notifications (Organizer/User side) ----
 */
router.get('/notifications/unread-count', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = `SELECT COUNT(*) AS cnt
                             FROM notifications
                             WHERE audience = 'user' AND user_id = ? AND is_read = FALSE`;
    db.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error('DB error fetching unread count:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, count: rows[0].cnt });
    });
});

router.get('/notifications', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 20, 100));
    const sql = `SELECT * FROM notifications
                             WHERE audience = 'user' AND user_id = ?
                             ORDER BY created_at DESC
                             LIMIT ?`;
    db.query(sql, [userId, limit], (err, rows) => {
        if (err) {
            console.error('DB error fetching notifications:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, notifications: rows });
    });
});

router.post('/notifications/:id/read', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const id = req.params.id;
    const sql = `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                             WHERE id = ? AND audience = 'user' AND user_id = ?`;
    db.query(sql, [id, userId], (err, result) => {
        if (err) {
            console.error('DB error marking notification read:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.status(200).json({ success: true });
    });
});

router.post('/notifications/read-all', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                             WHERE audience = 'user' AND user_id = ? AND is_read = FALSE`;
    db.query(sql, [userId], (err) => {
        if (err) {
            console.error('DB error marking all notifications read:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true });
    });
});
