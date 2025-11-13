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
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }
    const conn = db.promise();

    // Validate required fields
    if (!event_id || !organizer_id || !rating || !title || !content) {
      return res.status(400).json({ error: "Missing required fields: event_id, organizer_id, rating, title, content" });
    }
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    }
    if (typeof title !== "string" || title.trim().length === 0 || title.length > 255) {
      return res.status(400).json({ error: "Title must be a string up to 255 characters" });
    }
    if (typeof content !== "string" || content.trim().length === 0 || content.length > 5000) {
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
router.get("/", async (req, res) => {
  try {
    const {
      event_id,
      organizer_id,
      user_id,
      limit = 20,
      offset = 0,
      sort = "created_at",
      order = "DESC"
    } = req.query;
    const conn = db.promise();

    // Build dynamic query based on filters
    let query = `
      SELECT 
        r.*,
        u.name as reviewer_name,
        u.profile_pic_url AS reviewer_avatar,
        e.title as event_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (event_id) {
      query += " AND r.event_id = ?";
      params.push(event_id);
    }
    if (organizer_id) {
      query += " AND r.organizer_id = ?";
      params.push(organizer_id);
    }
    if (user_id) {
      query += " AND r.user_id = ?";
      params.push(user_id);
    }

    // Validate sort column to prevent SQL injection
  const allowedSort = ["created_at", "updated_at", "rating"];
    const sortColumn = allowedSort.includes(sort) ? sort : "created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  query += ` ORDER BY r.${sortColumn} ${sortOrder}`;

    // Add pagination
  let safeLimit = parseInt(limit);
  let safeOffset = parseInt(offset);
  if (!Number.isFinite(safeLimit)) safeLimit = 20;
  if (!Number.isFinite(safeOffset)) safeOffset = 0;
  safeLimit = Math.max(1, Math.min(safeLimit, 100));
  safeOffset = Math.max(0, safeOffset);
  query += " LIMIT ? OFFSET ?";
  params.push(safeLimit, safeOffset);

    const [reviews] = await conn.query(query, params);

    // Get total count for pagination metadata
    let countQuery = "SELECT COUNT(*) as total FROM reviews WHERE 1=1";
    const countParams = [];
    if (event_id) {
      countQuery += " AND event_id = ?";
      countParams.push(event_id);
    }
    if (organizer_id) {
      countQuery += " AND organizer_id = ?";
      countParams.push(organizer_id);
    }
    if (user_id) {
      countQuery += " AND user_id = ?";
      countParams.push(user_id);
    }
    const [countResult] = await conn.query(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      reviews,
      pagination: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: safeOffset + reviews.length < total
      }
    });
  } catch (err) {
    console.error("[REVIEWS] Error fetching reviews:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// GET /api/reviews/:id - Fetch a single review by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const conn = db.promise();

    const [reviews] = await conn.query(
      `SELECT 
        r.*,
        u.name as reviewer_name,
        u.profile_pic_url AS reviewer_avatar,
        e.title as event_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
      LIMIT 1`,
      [id]
    );

    if (!reviews.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.status(200).json({ review: reviews[0] });
  } catch (err) {
    console.error("[REVIEWS] Error fetching review:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// POST /api/reviews/:id/helpful - Increment/decrement helpful count
router.post("/:id/helpful", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action = "increment" } = req.body || {};
    const conn = db.promise();
    const delta = action === "decrement" ? -1 : 1;

    const [existing] = await conn.query(
      "SELECT id, helpful_count FROM reviews WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    await conn.query(
      "UPDATE reviews SET helpful_count = GREATEST(0, helpful_count + ?) WHERE id = ?",
      [delta, id]
    );
    const [updated] = await conn.query(
      "SELECT helpful_count FROM reviews WHERE id = ? LIMIT 1",
      [id]
    );

    res.status(200).json({ helpful_count: updated[0].helpful_count });
  } catch (err) {
    console.error("[REVIEWS] Error updating helpful count:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// PUT /api/reviews/:id - Update an existing review
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, content, category, image_urls } = req.body;
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }
    const conn = db.promise();

    // Fetch existing review to verify ownership
    const [existing] = await conn.query(
      "SELECT * FROM reviews WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Only allow owner to edit their review
    if (Number(existing[0].user_id) !== Number(userId)) {
      return res.status(403).json({ error: "Unauthorized: You can only edit your own reviews" });
    }

    // Validate updated fields (same rules as POST)
    if (rating !== undefined) {
      if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
      }
    }
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0 || title.length > 255) {
        return res.status(400).json({ error: "Title must be a string up to 255 characters" });
      }
    }
    if (content !== undefined) {
      if (typeof content !== "string" || content.trim().length === 0 || content.length > 5000) {
        return res.status(400).json({ error: "Content must be a string up to 5000 characters" });
      }
    }
    if (category !== undefined && category !== null) {
      if (typeof category !== "string") {
        return res.status(400).json({ error: "Category must be a string" });
      }
    }
    if (image_urls !== undefined && image_urls !== null) {
      if (!Array.isArray(image_urls)) {
        return res.status(400).json({ error: "image_urls must be an array of strings" });
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const params = [];

    if (rating !== undefined) {
      updates.push("rating = ?");
      params.push(rating);
    }
    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (content !== undefined) {
      updates.push("content = ?");
      params.push(content);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      params.push(category || null);
    }
    if (image_urls !== undefined) {
      updates.push("image_urls = ?");
      params.push(image_urls ? JSON.stringify(image_urls) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Always update the updated_at timestamp
    updates.push("updated_at = NOW()");
    params.push(id, userId);

    await conn.query(
      `UPDATE reviews SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );

    // If rating changed, recalculate organizer's average
    if (rating !== undefined) {
      await recalcAverageRating(existing[0].organizer_id);
    }

    // Fetch and return updated review
    const [updated] = await conn.query(
      "SELECT * FROM reviews WHERE id = ?",
      [id]
    );

    res.status(200).json({ message: "Review updated", review: updated[0] });
  } catch (err) {
    console.error("[REVIEWS] Error updating review:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// DELETE /api/reviews/:id - Delete an existing review
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }
    const conn = db.promise();

    // Fetch existing review to verify ownership and get organizer_id
    const [existing] = await conn.query(
      "SELECT * FROM reviews WHERE id = ? LIMIT 1",
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check authorization: owner or admin can delete
    const [user] = await conn.query(
      "SELECT role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const isOwner = Number(existing[0].user_id) === Number(userId);
    const isAdmin = user.length && user[0].role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized: You can only delete your own reviews" });
    }

    // Delete the review (CASCADE will handle questions/answers if configured)
    await conn.query("DELETE FROM reviews WHERE id = ?", [id]);

    // Recalculate organizer's average rating
    await recalcAverageRating(existing[0].organizer_id);

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error("[REVIEWS] Error deleting review:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Export both the router and the helper function
module.exports = router;
router.recalcAverageRating = recalcAverageRating;
