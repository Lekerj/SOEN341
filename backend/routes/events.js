const express = require('express');
const router = express.Router();
const db = require('../config/db');
// const { param } = require('./auth');

// Full implementation of the Event Search API
router.get('/', (req, res) => {
    // 1. Extract Filters
    const{
        search, category, organization, price_max, date_start
    } = req.query;

    let sql =`
    SELECT
        id, title, event_date, event_time, location, price, category, organization
    FROM
        events
    WHERE 1=1
`;
    const params = [];

    // 2. Dynamically Build the SQL Query
    if(search){
        sql += `\n AND title LIKE ?`;
        params.push(`%${search}%`) 
    }
    
    if(category){
        sql += `\n AND category = ?`;
        params.push(category)
    }
    
    if(organization){
        sql += `\n AND organization = ?`;
        params.push(organization)
    }
    
    if(price_max !== undefined && price_max !== ''){
        sql += `\n AND price <= ?`;
        const maxPriceNum = parseFloat(price_max);
        params.push(maxPriceNum)
    }
    
    if(date_start){
        sql += `\n AND event_date >= ?`;
        params.push(date_start)
    }

    // 3. Final Ordering 
    sql += `ORDER BY event_date ASC, event_time ASC;`;

    // 4. Execute the Query (using the callback pattern)
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Database Query Error:', err);
            return res.status(500).json({ message: 'Internal Server Error fetching events.' });
        }
        
        // Success: Send the results
        res.json(results);
    });

});

module.exports = router;