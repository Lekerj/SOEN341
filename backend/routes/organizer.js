const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireOrganizer } = require('../middleware/auth'); 

// Utility function for basic validation 
const validateEventData = (data) => {
    const { title, description, event_date, event_time, location, capacity, price, organization, category } = data;
    
    // Error handling for missing fields. 
    if (!title || !description || !event_date || !event_time || !location || !organization || !category) {
        return "Missing required field(s).";
    }

    // Error handling for non-positive Capacity
    if (isNaN(capacity) || capacity <= 0) {
        return "Capacity must be a positive number.";
    }

    // Error handling for negative pricing (Handles free tickets when price is 0)
    if (isNaN(price) || price < 0) {
        return "Price must be a non-negative number.";
    }

    // CORRECTED: Category validation check 
    const validCategories = ["sports", "academic", "social", "club"];
    if (!validCategories.includes(category)) {
         return `Category must be one of: ${validCategories.join(', ')}`;
    }

    return null; // Return null if validation passes
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

    const sql = `
        INSERT INTO events 
        (organizer_id, title, description, event_date, event_time, location, capacity, organization, category, price, tickets_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        organizer_Id, title, description, event_date, event_time, location, 
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

module.exports = router;
