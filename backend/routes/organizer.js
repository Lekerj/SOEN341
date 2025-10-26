const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireOrganizer } = require('../middleware/auth'); 

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
 * Function: Allows an authenticated 'organizer' user to create a new event.
 * Middleware: requireOrganizer (Checks session and role)
 */
router.post('/events', requireOrganizer, (req, res) => {
    const eventData = req.body;

    // 1. Validation 
    const validationError = validateEventData(eventData);
    if (validationError) {
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
 * Function: Allows an authenticated 'organizer' user to update an existing event.
 * Middleware: requireOrganizer (Checks session and role)
 */
router.put('/events/:id', requireOrganizer, (req, res) => {
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
 * Middleware: requireOrganizer
 */
router.get('/events/:id/analytics', requireOrganizer, async (req, res) => {
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

module.exports = router;
