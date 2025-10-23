const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireOrganizer } = require('../middleware/auth'); 

// Utility function for basic validation 
const validateEventData = (data) => {
    const { title, description, event_date, event_time, location, capacity, price, organization, category } = data;
    const errors = [];
    const validCategories = ["sports","academics","social","club"];

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

module.exports = router;
