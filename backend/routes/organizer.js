const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireOrganizer } = require('../middleware/auth'); 

// Utility function for basic validation 
const validateEventData = (data) => {
    const { title, description, event_date, event_time, location, capacity, price, organization, category } = data;
    //Error handling for missing fields. 
    if (!title || !description || !event_date || !event_time || !location || !organization || !category) {
        return "Missing required field(s).";
    }
    //Error handling for negative Capacity
    if (isNaN(capacity) || capacity <= 0) { 
        return "Capacity must be a positive number.";
    }
    //Error handling for negative pricing
    if (isNaN(price) || price < 0) { // This will also handle if the price of the ticket is free or not. 
        return "Price must be a non-negative number.";
    }
    const validCategories = ["sports", "academic", "social", "club"];
    if (!validCategories.includes(category)) {
        return `Category must be one of: ${validCategories.join(', ')}`;
    }

    //Im assuming the fields for the event time and date will be only capable through a dedicated time input that limits the organizers inputs. So i don't have to 
    // Take into consideration the Cases for it. 

    return null; // Return null if validation passes
}

/**
 * Route: POST /api/organizer/events
 * Function: Allows an authenticated 'organizer' user to create a new event.
 * Middleware: requireOrganizer (Checks session and role)
 */
router.post('/events', requireOrganizer, (req, res) => {
    const eventData = req.body;

    // 1. Validation (Step 4)
    const validationError = validateEventData(eventData);
    if (validationError) {
        console.warn('Event creation validation failed:', validationError);
        return res.status(400).json({ success: false, error: "Invalid Data", message: validationError });
    }

    // 2. Prepare Data (Step 5)
    // NOTE: req.session.userId must be populated by your authentication middleware
    const organizer_Id = req.session.userId; 
    const tickets_Available = eventData.capacity; // Acceptance Criteria: tickets_available = capacity initially

    const {
        title, description, event_date, event_time, location, 
        capacity, organization, category, price
    } = eventData;

    const sql = `
        INSERT INTO events 
        (organizer_id, title, description, event_date, event_time, location, capacity, organization, category, price, tickets_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        organizer_Id, title, description, event_date, event_time, location, 
        capacity, organization, category, price, tickets_Available
    ];

    // 3. Execute Database Insertion (Step 5/6)
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database error during event creation:", err);
            // Handle specific errors like SQL format errors if possible
            return res.status(500).json({ success: false, error: "Internal Server Error", message: "Failed to create event due to a database issue." });
        }

        // 4. Success Response (Step 6)
        const newEvent = {
            id: result.insertId, // Get the ID of the newly created event
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

module.exports = router;
