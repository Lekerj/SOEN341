const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { requireRole } = require("../middleware/auth");

// All admin routes require the user to be authenticated as an admin.
router.use(requireRole("admin"));

const ALLOWED_STATUS = new Set(["pending", "approved", "rejected"]);

function mapEventRow(row = {}) {
  const flagCount = Number(row.flag_count ?? 0);
  const isFlagged =
    row.is_flagged !== undefined
      ? Boolean(row.is_flagged)
      : flagCount > 0;

  return {
    ...row,
    flag_count: flagCount,
    is_flagged: isFlagged,
  };
}

router.get("/events", (req, res) => {
  const sql = `
    SELECT 
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    ORDER BY e.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Admin events listing failed:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    const events = (results || []).map(mapEventRow);
    res.json({ success: true, events });
  });
});

router.put("/events/:id", (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid event id." });
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, "status") &&
    !Object.prototype.hasOwnProperty.call(req.body, "moderation_status")
  ) {
    req.body.moderation_status = req.body.status;
  }

  const allowedFields = [
    "title",
    "description",
    "event_date",
    "event_time",
    "location",
    "price",
    "category",
    "organization",
    "capacity",
    "tickets_available",
    "image_url",
    "moderation_status",
    "moderation_notes",
  ];

  const body =
    req.body && typeof req.body === "object" ? { ...req.body } : {};

  const updates = [];
  const values = [];

  const requestedStatus =
    body.moderation_status !== undefined
      ? body.moderation_status
      : body.status;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      let value = body[field];

      if (field === "moderation_status") {
        const nextStatus = String(value || "").toLowerCase();
        if (!ALLOWED_STATUS.has(nextStatus)) {
          return res.status(400).json({
            success: false,
            error: "Invalid moderation status.",
          });
        }
        value = nextStatus;
      }

      updates.push(`${field} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0 && requestedStatus !== undefined) {
    const nextStatus = String(requestedStatus || "").toLowerCase();
    if (!ALLOWED_STATUS.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid moderation status.",
      });
    }
    updates.push("moderation_status = ?");
    values.push(nextStatus);
  }

  if (updates.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No fields provided for update." });
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  const updateSql = `UPDATE events SET ${updates.join(", ")} WHERE id = ?`;
  values.push(eventId);

  db.query(updateSql, values, (err) => {
    if (err) {
      console.error("Admin event update failed:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    const fetchSql = `
      SELECT 
        e.*,
        u.name AS organizer_name,
        u.email AS organizer_email
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
      LIMIT 1
    `;

    db.query(fetchSql, [eventId], (fetchErr, rows) => {
      if (fetchErr) {
        console.error("Admin event fetch failed after update:", fetchErr);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Event not found after update.",
        });
      }

      const updatedEvent = mapEventRow(rows[0]);
      res.json({
        success: true,
        message: "Event updated successfully.",
        event: updatedEvent,
      });
    });
  });
});

router.delete("/events/:id", (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid event id." });
  }

  const deleteTicketsSql = "DELETE FROM tickets WHERE event_id = ?";
  db.query(deleteTicketsSql, [eventId], (ticketErr) => {
    if (ticketErr) {
      console.error("Admin event ticket cleanup failed:", ticketErr);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    const deleteEventSql = "DELETE FROM events WHERE id = ?";
    db.query(deleteEventSql, [eventId], (eventErr, result) => {
      if (eventErr) {
        console.error("Admin event delete failed:", eventErr);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      if (!result || result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Event not found." });
      }

      res.json({
        success: true,
        message: "Event deleted successfully.",
        deleted: result.affectedRows,
      });
    });
  });
});

module.exports = router;
