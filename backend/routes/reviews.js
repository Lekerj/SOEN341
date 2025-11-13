// Reviews routes for submitting, reading, updating, and deleting reviews
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

/**
 * Recalculate and persist the average rating for a given organizer.
 * - Reads all ratings from the reviews table for the organizer
 * - Rounds the average to 2 decimals
 * - Updates users.average_rating to the computed value, or NULL if no reviews
 *
 * @param {number|string} organizerId - The organizer's user ID
 * @returns {Promise<number|null>} The new average rating (e.g., 4.25) or null if no reviews
 */
async function recalcAverageRating(organizerId) {
  const id = Number(organizerId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid organizerId provided to recalcAverageRating");
  }

  const conn = db.promise();
  const [rows] = await conn.query(
    "SELECT ROUND(AVG(rating), 2) AS avg_rating FROM reviews WHERE organizer_id = ?",
    [id]
  );

  const avg = rows && rows.length ? rows[0].avg_rating : null;
  const value = avg === null || avg === undefined ? null : Number(avg);

  if (value === null) {
    await conn.query("UPDATE users SET average_rating = NULL WHERE id = ?", [id]);
  } else {
    await conn.query("UPDATE users SET average_rating = ? WHERE id = ?", [value, id]);
  }

  return value;
}

// POST /api/reviews - Submit a new review
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      event_id,
      organizer_id,
      rating,
      title,
      content,
      category,
      image_urls
    } = req.body;
    const userId = req.session.userId;
    const conn = db.promise();

    // Validate required fields
    if (!event_id || !organizer_id || !rating || !title || !content) {
      return res.status(400).json({ error: "Missing required fields: event_id, organizer_id, rating, title, content" });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    }
    if (typeof title !== "string" || title.length > 255) {
      return res.status(400).json({ error: "Title must be a string up to 255 characters" });
    }
    if (typeof content !== "string" || content.length > 5000) {
      return res.status(400).json({ error: "Content must be a string up to 5000 characters" });
    }
    if (category && typeof category !== "string") {
      return res.status(400).json({ error: "Category must be a string" });
    }
    if (image_urls && !Array.isArray(image_urls)) {
      return res.status(400).json({ error: "image_urls must be an array of strings" });
    }

    // Check event exists and organizer matches
    const [events] = await conn.query(
      "SELECT id, organizer_id FROM events WHERE id = ? LIMIT 1",
      [event_id]
    );
    if (!events.length) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (Number(events[0].organizer_id) !== Number(organizer_id)) {
      return res.status(400).json({ error: "Organizer does not match event" });
    }

    // Check if user attended the event (has checked-in ticket)
    const [tickets] = await conn.query(
      "SELECT id, checked_in FROM tickets WHERE user_id = ? AND event_id = ? LIMIT 1",
      [userId, event_id]
    );
    if (!tickets.length || tickets[0].checked_in !== 1) {
      return res.status(403).json({ error: "User did not attend (checked-in) this event" });
    }

    // Prevent duplicate review for same event by same user
    const [dupes] = await conn.query(
      "SELECT id FROM reviews WHERE user_id = ? AND event_id = ? LIMIT 1",
      [userId, event_id]
    );
    if (dupes.length) {
      return res.status(409).json({ error: "Duplicate review: user already reviewed this event" });
    }

    // Insert review
    const [result] = await conn.query(
      "INSERT INTO reviews (user_id, event_id, organizer_id, rating, title, content, category, image_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        event_id,
        organizer_id,
        rating,
        title,
        content,
        category || null,
        image_urls ? JSON.stringify(image_urls) : null
      ]
    );

    // Update organizer's average rating
    await recalcAverageRating(organizer_id);

    // Return full review data
    const [reviewRows] = await conn.query(
      "SELECT * FROM reviews WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ message: "Review submitted", review: reviewRows[0] });
  } catch (err) {
    // Handle potential race where two inserts happen concurrently
    // MySQL duplicate key error code
    if (err && (err.code === "ER_DUP_ENTRY" || err.errno === 1062)) {
      return res
        .status(409)
        .json({ error: "Duplicate review: user already reviewed this event" });
    }
    console.error("[REVIEWS] Error submitting review:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// GET /api/reviews - Fetch reviews (with optional query params for filtering)
router.get("/", (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});

// PUT /api/reviews/:id - Update an existing review
router.put("/:id", requireAuth, (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});

// DELETE /api/reviews/:id - Delete an existing review
router.delete("/:id", requireAuth, (req, res) => {
  res.status(501).json({ error: "Not implemented yet" });
});

// Export both the router and the helper function
module.exports = router;
router.recalcAverageRating = recalcAverageRating;
