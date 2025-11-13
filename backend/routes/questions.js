// Questions & Answers routes
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

// POST /api/questions - submit a new question
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const { event_id, organizer_id, title, content } = req.body;

    if (
      event_id === undefined ||
      organizer_id === undefined ||
      !title ||
      !content
    ) {
      return res.status(400).json({
        error: "Missing required fields: event_id, organizer_id, title, content"
      });
    }

    const eventId = Number(event_id);
    const organizerId = Number(organizer_id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: "event_id must be a positive integer" });
    }
    if (!Number.isInteger(organizerId) || organizerId <= 0) {
      return res
        .status(400)
        .json({ error: "organizer_id must be a positive integer" });
    }

    if (typeof title !== "string" || title.trim().length === 0 || title.length > 255) {
      return res
        .status(400)
        .json({ error: "Title must be a non-empty string up to 255 characters" });
    }

    if (
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > 5000
    ) {
      return res
        .status(400)
        .json({ error: "Content must be a non-empty string up to 5000 characters" });
    }

    const conn = db.promise();

    // Ensure event exists and organizer matches
    const [events] = await conn.query(
      "SELECT id, organizer_id FROM events WHERE id = ? LIMIT 1",
      [eventId]
    );
    if (!events.length) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (Number(events[0].organizer_id) !== organizerId) {
      return res.status(400).json({ error: "Organizer does not match event" });
    }

    const [result] = await conn.query(
      "INSERT INTO questions (user_id, event_id, organizer_id, title, content, is_answered) VALUES (?, ?, ?, ?, ?, FALSE)",
      [userId, eventId, organizerId, title.trim(), content.trim()]
    );

    const [questionRows] = await conn.query(
      "SELECT * FROM questions WHERE id = ?",
      [result.insertId]
    );

    res
      .status(201)
      .json({ message: "Question submitted", question: questionRows[0] });
  } catch (err) {
    console.error("[QUESTIONS] Error submitting question:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// POST /api/questions/:id/answers - answer a question (stub)
router.post("/:id/answers", (req, res) => {
  res
    .status(501)
    .json({ message: "Submit answer not implemented yet" });
});

// GET /api/questions - fetch questions (stub)
router.get("/", (req, res) => {
  res.status(501).json({ message: "Fetch questions not implemented yet" });
});

module.exports = router;
