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

// GET /api/reviews/summary - Get rating summary for an organizer
router.get("/summary", async (req, res) => {
  try {
    const organizerId = req.query.organizer_id;
    if (!organizerId) {
      return res.status(400).json({ error: "organizer_id query parameter is required" });
    }

    const conn = db.promise();

    // Get average rating and total review count
    const [summaryRows] = await conn.query(
      `SELECT
        ROUND(AVG(rating), 2) AS average_rating,
        COUNT(*) AS total_reviews
      FROM reviews
      WHERE organizer_id = ?`,
      [organizerId]
    );

    const summary = summaryRows && summaryRows.length ? summaryRows[0] : {};
    const average_rating = summary.average_rating ? Number(summary.average_rating) : null;
    const total_reviews = summary.total_reviews ? Number(summary.total_reviews) : 0;

    // Get distribution of ratings
    const [distributionRows] = await conn.query(
      `SELECT rating, COUNT(*) AS count
      FROM reviews
      WHERE organizer_id = ?
      GROUP BY rating`,
      [organizerId]
    );

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (distributionRows && Array.isArray(distributionRows)) {
      distributionRows.forEach((row) => {
        const rating = Number(row.rating);
        if (rating >= 1 && rating <= 5) {
          distribution[rating] = Number(row.count);
        }
      });
    }

    res.status(200).json({
      average_rating,
      total_reviews,
      distribution
    });
  } catch (err) {
    console.error("[REVIEWS] Error fetching summary:", err);
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
      sort = "most_recent"
    } = req.query;
    const conn = db.promise();

    const filterEventId = event_id === undefined ? null : Number(event_id);
    const filterOrganizerId = organizer_id === undefined ? null : Number(organizer_id);
    const filterUserId = user_id === undefined ? null : Number(user_id);

    if (event_id !== undefined) {
      if (!Number.isInteger(filterEventId) || filterEventId <= 0) {
        return res.status(400).json({ error: "event_id must be a positive integer" });
      }
    }
    if (organizer_id !== undefined) {
      if (!Number.isInteger(filterOrganizerId) || filterOrganizerId <= 0) {
        return res.status(400).json({ error: "organizer_id must be a positive integer" });
      }
    }
    if (filterEventId && filterOrganizerId) {
      return res
        .status(400)
        .json({ error: "Provide either event_id or organizer_id, not both" });
    }
    if (user_id !== undefined) {
      if (!Number.isInteger(filterUserId) || filterUserId <= 0) {
        return res.status(400).json({ error: "user_id must be a positive integer" });
      }
    }

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

    if (filterEventId) {
      query += " AND r.event_id = ?";
      params.push(filterEventId);
    }
    if (filterOrganizerId) {
      query += " AND r.organizer_id = ?";
      params.push(filterOrganizerId);
    }
    if (filterUserId) {
      query += " AND r.user_id = ?";
      params.push(filterUserId);
    }

    const sortParam = typeof sort === "string" ? sort.toLowerCase() : "most_recent";
    let sortClause = "";
    switch (sortParam) {
      case "most_recent":
        sortClause = "ORDER BY r.created_at DESC";
        break;
      case "most_helpful":
        sortClause = "ORDER BY r.helpful_count DESC, r.created_at DESC";
        break;
      case "highest_rated":
        sortClause = "ORDER BY r.rating DESC, r.created_at DESC";
        break;
      case "lowest_rated":
        sortClause = "ORDER BY r.rating ASC, r.created_at DESC";
        break;
      default:
        return res.status(400).json({
          error: "Invalid sort option. Use most_recent, most_helpful, highest_rated, or lowest_rated"
        });
    }
    query += ` ${sortClause}`;

    // Add pagination
    let safeLimit = parseInt(limit, 10);
    let safeOffset = parseInt(offset, 10);
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
    if (filterEventId) {
      countQuery += " AND event_id = ?";
      countParams.push(filterEventId);
    }
    if (filterOrganizerId) {
      countQuery += " AND organizer_id = ?";
      countParams.push(filterOrganizerId);
    }
    if (filterUserId) {
      countQuery += " AND user_id = ?";
      countParams.push(filterUserId);
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

    // Organizer rating recalculation must always run after an update
    await recalcAverageRating(existing[0].organizer_id);

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

    // Check authorization: only the owner can delete
    const isOwner = Number(existing[0].user_id) === Number(userId);
    if (!isOwner) {
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
