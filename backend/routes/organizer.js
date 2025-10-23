const express = require("express");
const router = express.Router();
const { requireOrganizer } = require('../middleware/auth'); 

// The test endpoint: POST /api/organizer/events
router.post('/events', requireOrganizer, (req, res) => {
  // This is the success response if the middleware allows access
  res.status(200).json({ message: "ACCESS GRANTED: You are an organizer." });
});

module.exports = router;