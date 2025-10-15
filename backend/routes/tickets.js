const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

function generateTicketCode() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

// Claim a ticket for an event (free requires auth; paid flow can be extended later)
router.post("/claim", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { event_id } = req.body;

  if (!event_id || isNaN(event_id)) {
    return res.status(400).json({ error: "Invalid or missing event_id" });
  }

  db.beginTransaction((txErr) => {
    if (txErr) {
      console.error("Transaction start error:", txErr);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // 1) Lock the event row to check availability safely
    db.query(
      "SELECT id, title, price, tickets_available FROM events WHERE id = ? FOR UPDATE",
      [event_id],
      (err, events) => {
        if (err) {
          console.error("Event select error:", err);
          return db.rollback(() =>
            res.status(500).json({ error: "Internal Server Error" })
          );
        }
        if (events.length === 0) {
          return db.rollback(() =>
            res.status(404).json({ error: "Event not found" })
          );
        }

        const event = events[0];
        if (event.tickets_available <= 0) {
          return db.rollback(() =>
            res
              .status(409)
              .json({ error: "sold_out", message: "No tickets available" })
          );
        }

        // 2) Ensure user doesn’t already have a ticket for this event
        db.query(
          "SELECT id FROM tickets WHERE user_id = ? AND event_id = ? LIMIT 1",
          [userId, event_id],
          (dupErr, existing) => {
            if (dupErr) {
              console.error("Ticket duplicate check error:", dupErr);
              return db.rollback(() =>
                res.status(500).json({ error: "Internal Server Error" })
              );
            }
            if (existing.length > 0) {
              return db.rollback(() =>
                res
                  .status(409)
                  .json({
                    error: "already_claimed",
                    message: "You already claimed a ticket for this event",
                  })
              );
            }

            const code = generateTicketCode();
            const ticketType = Number(event.price) > 0 ? "paid" : "free";

            // 3) Insert ticket
            db.query(
              "INSERT INTO tickets (user_id, event_id, ticket_type, qr_code) VALUES (?, ?, ?, ?)",
              [userId, event_id, ticketType, code],
              (insErr, result) => {
                if (insErr) {
                  console.error("Ticket insert error:", insErr);
                  return db.rollback(() =>
                    res.status(500).json({ error: "Internal Server Error" })
                  );
                }

                // 4) Decrement availability
                db.query(
                  "UPDATE events SET tickets_available = tickets_available - 1 WHERE id = ?",
                  [event_id],
                  (updErr) => {
                    if (updErr) {
                      console.error("Event update error:", updErr);
                      return db.rollback(() =>
                        res.status(500).json({ error: "Internal Server Error" })
                      );
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        console.error("Commit error:", commitErr);
                        return db.rollback(() =>
                          res
                            .status(500)
                            .json({ error: "Internal Server Error" })
                        );
                      }

                      res.status(201).json({
                        success: true,
                        ticket: {
                          id: result.insertId,
                          event_id: event_id,
                          ticket_type: ticketType,
                          code,
                        },
                        event: {
                          id: event.id,
                          title: event.title,
                          price: event.price,
                        },
                      });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Get current user tickets
router.get("/", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const sql = `
    SELECT t.id, t.event_id, t.ticket_type, t.qr_code, t.created_at,
           e.title, e.event_date, e.event_time, e.location, e.price, e.description
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("Tickets select error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json({ success: true, count: rows.length, tickets: rows });
  });
});

// Get a single ticket (belongs to current user)
router.get("/:id", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const ticketId = req.params.id;
  if (!ticketId || isNaN(ticketId)) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }
  const sql = `
    SELECT t.id, t.event_id, t.ticket_type, t.qr_code, t.created_at,
           e.title, e.event_date, e.event_time, e.location, e.price, e.description
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    WHERE t.user_id = ? AND t.id = ?
    LIMIT 1
  `;
  db.query(sql, [userId, ticketId], (err, rows) => {
    if (err) {
      console.error("Ticket select error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.json({ success: true, ticket: rows[0] });
  });
});

module.exports = router;
