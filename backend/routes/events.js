const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validateSearchFilters, sanitizeSearchFilters } = require('../utils/validation');

// Enhanced Event Search API with comprehensive filtering
router.get('/', (req, res) => {
    // 1. Validate input parameters
    const validationErrors = validateSearchFilters(req.query);
    if (validationErrors.length > 0) {
        return res.status(400).json({
            error: 'Invalid input parameters',
            message: 'Please check your filter parameters',
            details: validationErrors
        });
    }

    // 2. Sanitize and extract all possible filters
    const sanitizedQuery = sanitizeSearchFilters(req.query);
    const {
        search, // Search in title OR organizer name
        category, 
        organization, 
        location,
        price_min, 
        price_max, 
        date_start, 
        date_end,
        time_start,
        time_end,
        min_tickets_needed, // For checking if enough tickets are available
        min_capacity // Filter by minimum capacity
    } = sanitizedQuery;

    let sql = `
    SELECT 
        e.id, e.title, e.description, e.event_date, e.event_time, 
        e.location, e.price, e.category, e.organization, 
        e.capacity, e.tickets_available, e.image_url,
        u.username as organizer_name
    FROM 
        events e
    LEFT JOIN 
        users u ON e.organizer_id = u.id
    WHERE 1=1
`;
    const params = [];

    // 2. Search functionality - search in title OR organizer name
    if (search && search.trim() !== '') {
        sql += `\n AND (e.title LIKE ? OR u.username LIKE ? OR e.organization LIKE ?)`;
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // 3. Category filter
    if (category && category !== '') {
        sql += `\n AND e.category = ?`;
        params.push(category);
    }
    
    // 4. Organization filter
    if (organization && organization !== '') {
        sql += `\n AND e.organization LIKE ?`;
        params.push(`%${organization}%`);
    }

    // 5. Location filter
    if (location && location !== '') {
        sql += `\n AND e.location LIKE ?`;
        params.push(`%${location}%`);
    }
    
    // 6. Price range filtering (like Amazon slider)
    if (price_min !== undefined && price_min !== '') {
        sql += `\n AND e.price >= ?`;
        params.push(parseFloat(price_min));
    }
    
    if (price_max !== undefined && price_max !== '') {
        sql += `\n AND e.price <= ?`;
        params.push(parseFloat(price_max));
    }
    
    // 7. Date range filtering
    if (date_start && date_start !== '') {
        sql += `\n AND e.event_date >= ?`;
        params.push(date_start);
    }
    
    if (date_end && date_end !== '') {
        sql += `\n AND e.event_date <= ?`;
        params.push(date_end);
    }

    // 8. Time range filtering
    if (time_start && time_start !== '') {
        sql += `\n AND e.event_time >= ?`;
        params.push(time_start);
    }
    
    if (time_end && time_end !== '') {
        sql += `\n AND e.event_time <= ?`;
        params.push(time_end);
    }

    // 9. Ticket availability filter (for claiming multiple tickets)
    if (min_tickets_needed && min_tickets_needed !== '') {
        const ticketsNeeded = parseInt(min_tickets_needed);
        sql += `\n AND e.tickets_available >= ?`;
        params.push(ticketsNeeded);
    }

    // 10. Minimum capacity filter
    if (min_capacity && min_capacity !== '') {
        sql += `\n AND e.capacity >= ?`;
        params.push(parseInt(min_capacity));
    }

    // 11. Only show events with available tickets
    sql += `\n AND e.tickets_available > 0`;

    // 12. Final ordering - prioritize upcoming events
    sql += `\n ORDER BY e.event_date ASC, e.event_time ASC`;

    // 13. Execute the Query
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Database Query Error:', err);
            return res.status(500).json({ 
                error: 'Internal Server Error', 
                message: 'Failed to fetch events.' 
            });
        }
        
        // Success: Send the results with additional metadata
        res.json({
            success: true,
            count: results.length,
            events: results,
            filters_applied: {
                search: search || null,
                category: category || null,
                organization: organization || null,
                location: location || null,
                price_range: {
                    min: price_min || null,
                    max: price_max || null
                },
                date_range: {
                    start: date_start || null,
                    end: date_end || null
                },
                time_range: {
                    start: time_start || null,
                    end: time_end || null
                },
                min_tickets_needed: min_tickets_needed || null,
                min_capacity: min_capacity || null
            }
        });
    });
});

// Get filter options for dropdowns (categories, organizations, locations)
router.get('/filter-options', (req, res) => {
    const queries = {
        categories: 'SELECT DISTINCT category FROM events ORDER BY category',
        organizations: 'SELECT DISTINCT organization FROM events WHERE organization IS NOT NULL ORDER BY organization',
        locations: 'SELECT DISTINCT location FROM events WHERE location IS NOT NULL ORDER BY location',
        price_range: 'SELECT MIN(price) as min_price, MAX(price) as max_price FROM events'
    };

    const results = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.query(queries[key], (err, queryResults) => {
            if (err) {
                console.error(`Error fetching ${key}:`, err);
                results[key] = [];
            } else {
                results[key] = queryResults;
            }
            
            completedQueries++;
            
            if (completedQueries === totalQueries) {
                res.json({
                    success: true,
                    filter_options: results
                });
            }
        });
    });
});

// Get a specific event by ID
router.get('/:id', (req, res) => {
    const eventId = req.params.id;
    
    if (!eventId || isNaN(eventId)) {
        return res.status(400).json({
            error: 'Invalid event ID',
            message: 'Event ID must be a valid number'
        });
    }

    const sql = `
        SELECT 
            e.*, 
            u.username as organizer_name,
            u.email as organizer_email
        FROM 
            events e
        LEFT JOIN 
            users u ON e.organizer_id = u.id
        WHERE 
            e.id = ?
    `;

    db.query(sql, [eventId], (err, results) => {
        if (err) {
            console.error('Database Query Error:', err);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to fetch event details.'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: 'Event not found',
                message: `No event found with ID ${eventId}`
            });
        }

        res.json({
            success: true,
            event: results[0]
        });
    });
});

// Check ticket availability for a specific number of tickets
router.post('/check-availability', (req, res) => {
    const { event_id, tickets_requested } = req.body;

    if (!event_id || !tickets_requested) {
        return res.status(400).json({
            error: 'Missing required fields',
            message: 'event_id and tickets_requested are required'
        });
    }

    if (isNaN(event_id) || isNaN(tickets_requested) || tickets_requested <= 0) {
        return res.status(400).json({
            error: 'Invalid input',
            message: 'event_id and tickets_requested must be valid positive numbers'
        });
    }

    const sql = `
        SELECT 
            id, title, tickets_available, capacity, price,
            (tickets_available >= ?) as can_fulfill_request,
            (tickets_available * price) as total_cost_if_all_available,
            (? * price) as requested_total_cost
        FROM 
            events 
        WHERE 
            id = ?
    `;

    db.query(sql, [tickets_requested, tickets_requested, event_id], (err, results) => {
        if (err) {
            console.error('Database Query Error:', err);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to check ticket availability.'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                error: 'Event not found',
                message: `No event found with ID ${event_id}`
            });
        }

        const event = results[0];
        res.json({
            success: true,
            event_id: event.id,
            event_title: event.title,
            tickets_requested: parseInt(tickets_requested),
            tickets_available: event.tickets_available,
            can_fulfill: Boolean(event.can_fulfill_request),
            individual_price: event.price,
            total_cost: event.requested_total_cost,
            availability_status: event.can_fulfill_request ? 'available' : 'insufficient_tickets'
        });
    });
});

module.exports = router;
