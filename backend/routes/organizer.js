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

    const {
        title, description, event_date, event_time, location, 
        capacity, organization, category, price
    } = eventData;

    //Important Note, the Columns in the SQL string must match the order of variables in the 'params' array
    const sql = `
        INSERT INTO events
        (organizer_id, title, description, event_date, event_time, location, capacity, organization, category, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        organizer_Id, title, description || null, event_date, event_time, location,
        capacity, organization, category, price
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
            ...eventData
        };

        res.status(201).json({ 
            success: true, 
            message: "Event successfully created.",
            event: newEvent
        });

    }); // end db.query for event creation

}); // end POST /api/organizer/events

/**
 * Route: PUT /api/organizer/events/:id
 * Function: Allows an authenticated and APPROVED organizer to update their own event.
 */
router.put('/events/:id', requireApprovedOrganizer, (req, res) => {
    const eventId = req.params.id;
    const organizerId = req.session.userId;
    const eventData = req.body || {};

    const validCategories = ["sports","academic","social","club"];
    const errors = [];

    // Validate only provided fields
    if (eventData.title !== undefined) {
        if (!eventData.title) errors.push('title: Required if provided.');
        else if (typeof eventData.title !== 'string' || eventData.title.length > 255) errors.push('title: Must be string <=255 chars.');
    }
    if (eventData.description !== undefined && eventData.description && eventData.description.length > 5000) {
        errors.push('description: Must be <=5000 chars.');
    }
    if (eventData.location !== undefined) {
        if (!eventData.location) errors.push('location: Required if provided.');
        else if (typeof eventData.location !== 'string' || eventData.location.length > 255) errors.push('location: Must be string <=255 chars.');
    }
    if (eventData.organization !== undefined) {
        if (!eventData.organization) errors.push('organization: Required if provided.');
        else if (typeof eventData.organization !== 'string' || eventData.organization.length > 100) errors.push('organization: Must be string <=100 chars.');
    }
    if (eventData.event_date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(eventData.event_date) || isNaN(Date.parse(eventData.event_date))) {
            errors.push('event_date: Must be YYYY-MM-DD');
        } else {
            const d = new Date(eventData.event_date);
            const today = new Date(); today.setHours(0,0,0,0);
            if (d < today) errors.push('event_date: Cannot be in the past');
        }
    }
    if (eventData.event_time !== undefined) {
        if (!/^\d{2}:\d{2}:\d{2}$/.test(eventData.event_time)) errors.push('event_time: Must be HH:MM:SS');
    }
    if (eventData.capacity !== undefined) {
        const cInt = parseInt(eventData.capacity); if (isNaN(cInt) || cInt < 1 || cInt > 10000) errors.push('capacity: 1-10000');
    }
    if (eventData.price !== undefined) {
        const pStr = String(eventData.price); const pF = parseFloat(pStr);
        if (isNaN(pF) || pF < 0) errors.push('price: Non-negative number');
        else if (!/^\d+(\.\d{1,2})?$/.test(pStr)) errors.push('price: Max two decimals');
    }
    if (eventData.category !== undefined) {
        if (!validCategories.includes(eventData.category)) errors.push(`category: Must be one of ${validCategories.join(', ')}`);
    }
    if (errors.length) return res.status(400).json({ success:false, errors });

    // Ownership check
    db.query('SELECT organizer_id FROM events WHERE id = ?', [eventId], (err, rows) => {
        if (err) { console.error('DB ownership check error:', err); return res.status(500).json({ success:false, error:'Internal Server Error' }); }
        if (!rows.length) return res.status(404).json({ success:false, error:'Event not found' });
        if (rows[0].organizer_id !== organizerId) return res.status(403).json({ success:false, error:'Unauthorized' });

        const setClauses = [];
        const values = [];
        ['title','description','event_date','event_time','location','capacity','price','organization','category'].forEach(field => {
            if (eventData[field] !== undefined) { setClauses.push(`${field} = ?`); values.push(eventData[field] || null); }
        });
        if (!setClauses.length) return res.status(400).json({ success:false, error:'No fields provided for update' });
        setClauses.push('updated_at = CURRENT_TIMESTAMP');
        values.push(eventId);
        const updateSql = `UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`;
        db.query(updateSql, values, (e2) => {
            if (e2) { console.error('DB event update error:', e2); return res.status(500).json({ success:false, error:'Failed to update event'}); }
            db.query('SELECT * FROM events WHERE id = ?', [eventId], (e3, rs2) => {
                if (e3) { console.error('DB fetch updated event error:', e3); return res.status(500).json({ success:false, error:'Fetch failed'}); }
                if (!rs2.length) return res.status(500).json({ success:false, error:'Updated event not retrievable'});
                return res.status(200).json({ success:true, message:'Event updated', event: rs2[0] });
            });
        });
    });
});


// POST /api/organizer/request
// Submit a NEW organizer request. If status is 'refused', allows resubmission. Blocks if 'pending' exists.
router.post('/request', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { organization_id, new_organization_name, category, details } = req.body || {};

    if (!organization_id && !new_organization_name) {
        return res.status(400).json({ success: false, error: 'Provide organization_id or new_organization_name' });
    }

    // Check for existing pending request - user should use PATCH to modify it instead
    db.query('SELECT organizer_auth_status FROM users WHERE id = ?', [userId], (err, userRows) => {
        if (err) {
            console.error('DB error checking user status:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        
        const currentStatus = userRows[0]?.organizer_auth_status;
        
        if (currentStatus === 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: 'You already have a pending request. Use PATCH /api/organizer/request/:id to modify it.' 
            });
        }
        
        if (currentStatus === 'approved') {
            return res.status(400).json({ 
                success: false, 
                error: 'You are already an approved organizer.' 
            });
        }
        
        // Status is 'refused' or NULL - allow new submission
        function finalizeWithOrgId(orgId, orgName) {
            // Insert new request into organizer_requests (history/audit)
            const insertRequest = `INSERT INTO organizer_requests
                (user_id, organization_id, request_type, status, details)
                VALUES (?, ?, ?, 'pending', ?)`;
            const reqType = organization_id ? 'join' : 'create';
            db.query(insertRequest, [userId, orgId, reqType, details || null], (err) => {
                if (err) {
                    console.error('DB error inserting organizer request:', err);
                    return res.status(500).json({ success: false, error: 'Internal Server Error' });
                }
                // Update user status to pending (role should already be 'organizer' from registration)
                const sql = `UPDATE users
                    SET organization_id = ?, organizer_auth_status = 'pending', organization_role = 'Member',
                        request_date = CURRENT_TIMESTAMP, approval_date = NULL
                    WHERE id = ?`;
                db.query(sql, [orgId, userId], (err2) => {
                    if (err2) {
                        console.error('DB error updating user organizer request:', err2);
                        return res.status(500).json({ success: false, error: 'Internal Server Error' });
                    }
                    // Notify admins of new/updated request
                    notifyAdminOfRequest(userId, orgId, orgName);
                    res.status(200).json({ success: true, message: 'Request submitted. Status set to pending.' });
                });
            });
        }

        if (organization_id) {
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
});

// PATCH /api/organizer/request/:id
// Modify a PENDING request (change organization or details). Cannot modify refused/approved requests.
router.patch('/request/:id', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const requestId = req.params.id;
    const { organization_id, new_organization_name, category, details } = req.body || {};

    // Fetch the existing request
    db.query('SELECT * FROM organizer_requests WHERE id = ? AND user_id = ?', [requestId, userId], (err, rows) => {
        if (err) {
            console.error('DB error fetching request:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found or not owned by you' });
        }
        
        const request = rows[0];
        
        // Only allow modification if status is 'pending'
        if (request.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: `Cannot modify ${request.status} request. Only pending requests can be modified.`,
                hint: request.status === 'refused' 
                    ? 'Submit a new request instead using POST /api/organizer/request'
                    : 'Request already processed'
            });
        }
        
        // Determine what to update
        const updates = {};
        if (details !== undefined) updates.details = details;
        
        // Handle organization change
        function applyUpdate(finalOrgId) {
            const setClauses = [];
            const values = [];
            
            if (finalOrgId !== undefined && finalOrgId !== request.organization_id) {
                setClauses.push('organization_id = ?');
                values.push(finalOrgId);
                // Update request_type if switching between join/create
                if (finalOrgId && !request.organization_id) {
                    setClauses.push('request_type = ?');
                    values.push('join');
                } else if (!finalOrgId && request.organization_id) {
                    setClauses.push('request_type = ?');
                    values.push('create');
                }
            }
            
            if (updates.details !== undefined) {
                setClauses.push('details = ?');
                values.push(updates.details);
            }
            
            if (setClauses.length === 0) {
                return res.status(400).json({ success: false, error: 'No changes provided' });
            }
            
            setClauses.push('updated_at = CURRENT_TIMESTAMP');
            values.push(requestId);
            
            const updateSql = `UPDATE organizer_requests SET ${setClauses.join(', ')} WHERE id = ?`;
            db.query(updateSql, values, (err2) => {
                if (err2) {
                    console.error('DB error updating request:', err2);
                    return res.status(500).json({ success: false, error: 'Internal Server Error' });
                }
                
                // Also update users table if organization changed
                if (finalOrgId !== undefined && finalOrgId !== request.organization_id) {
                    db.query('UPDATE users SET organization_id = ? WHERE id = ?', [finalOrgId, userId], (err3) => {
                        if (err3) console.error('DB error updating user org:', err3);
                    });
                }
                
                res.status(200).json({ success: true, message: 'Request updated successfully' });
            });
        }
        
        // Handle organization_id change
        if (organization_id !== undefined) {
            db.query('SELECT id FROM organizations WHERE id = ?', [organization_id], (err, orgRows) => {
                if (err) {
                    console.error('DB error fetching organization:', err);
                    return res.status(500).json({ success: false, error: 'Internal Server Error' });
                }
                if (!orgRows || orgRows.length === 0) {
                    return res.status(400).json({ success: false, error: 'Invalid organization_id' });
                }
                applyUpdate(organization_id);
            });
        } else if (new_organization_name) {
            // Creating new organization - validate category
            if (!category || !['sports','academic','social','club'].includes(category)) {
                return res.status(400).json({ success: false, error: 'Valid category required for new organization' });
            }
            const insertOrg = `INSERT INTO organizations (name, description, category, is_default) VALUES (?, ?, ?, FALSE)`;
            db.query(insertOrg, [new_organization_name, `Requested by user ${userId}`, category], (err, result) => {
                if (err) {
                    console.error('DB error creating organization:', err);
                    return res.status(500).json({ success: false, error: 'Failed to create organization' });
                }
                applyUpdate(result.insertId);
            });
        } else {
            // Just updating details
            applyUpdate();
        }
    });
});

// GET /api/organizer/requests
// Returns all requests submitted by the current user
router.get('/requests', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = `SELECT r.*, o.name AS organization_name, o.category AS organization_category
        FROM organizer_requests r
        LEFT JOIN organizations o ON r.organization_id = o.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC`;
    db.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error('DB error fetching organizer requests:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, requests: rows });
    });
});

// GET /api/organizer/memberships
// Returns all organization memberships for the current user
router.get('/memberships', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const sql = `SELECT m.*, o.name AS organization_name, o.category AS organization_category
        FROM organization_members m
        LEFT JOIN organizations o ON m.organization_id = o.id
        WHERE m.user_id = ?
        ORDER BY m.assigned_at DESC`;
    db.query(sql, [userId], (err, rows) => {
        if (err) {
            console.error('DB error fetching organization memberships:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
        res.status(200).json({ success: true, memberships: rows });
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
              COUNT(t.id) AS tickets_issued,
              COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) AS tickets_checked_in,
              (e.capacity - COUNT(t.id)) AS remaining_capacity,
              (CASE WHEN COUNT(t.id) > 0 THEN (COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) / COUNT(t.id)) * 100 ELSE 0 END) AS attendance_rate,
              (COUNT(t.id) * e.price) AS total_revenue
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
        SELECT e.id, e.title, e.description, e.organizer_id, e.organization,
               e.event_date, e.event_time, e.location, e.capacity, e.price,
               e.category, e.is_flagged, e.moderation_notes, e.created_at, e.updated_at,
            COUNT(t.id) AS tickets_issued,
            COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) AS tickets_checked_in,
            (e.capacity - COUNT(t.id)) AS remaining_capacity,
            (CASE WHEN COUNT(t.id) > 0 THEN (COUNT(CASE WHEN t.checked_in = TRUE THEN 1 END) / COUNT(t.id)) * 100 ELSE 0 END) AS attendance_rate,
            (COUNT(t.id) * e.price) AS total_revenue
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id
        WHERE e.organizer_id = ?
        GROUP BY e.id, e.title, e.description, e.organizer_id, e.organization,
                 e.event_date, e.event_time, e.location, e.capacity, e.price,
                 e.category, e.is_flagged, e.moderation_notes, e.created_at, e.updated_at
        ORDER BY e.event_date ASC, e.event_time ASC
    `;
    db.query(sql, [organizerId], async (err, results) => {
        if (err) {
            console.error('DB error fetching organizer events:', err);
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch events.' });
        }
        console.log('Found events:', results.length);

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
                    event.remaining_capacity = event.remaining_capacity || 0;
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

// Ensure file ends with a single export
