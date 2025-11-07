const express = require("express");
const crypto = require("crypto");
const QRCode = require("qrcode");
const router = express.Router();
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const DEMO_MODE = String(process.env.DEMO_MODE || "0") === "1";

function getPublicWebBase(req) {
  // Prefer explicit env, else infer from request's hostname for local/demo
  const envBase =
    process.env.PUBLIC_WEB_BASE && process.env.PUBLIC_WEB_BASE.trim();
  if (envBase) return envBase.replace(/\/$/, "");
  const host =
    req.headers["x-forwarded-host"] ||
    req.headers.host ||
    `${req.hostname}:8080`;
  const hostname = String(host).split(":")[0];
  return `http://${hostname}:8080`;
}

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

  // 1) Check event and availability
  db.query(
    `SELECT e.id, e.title, e.price, e.capacity, (e.capacity - COUNT(t.id)) as tickets_available
     FROM events e
     LEFT JOIN tickets t ON e.id = t.event_id
     WHERE e.id = ?
     GROUP BY e.id, e.title, e.price, e.capacity`,
    [event_id],
    (err, events) => {
      if (err) {
        console.error("Event select error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (events.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const event = events[0];
      if (event.tickets_available <= 0) {
        return res
          .status(409)
          .json({ error: "sold_out", message: "No tickets available" });
      }

      // 2) Ensure user doesn't already have a ticket for this event
      db.query(
        "SELECT id FROM tickets WHERE user_id = ? AND event_id = ? LIMIT 1",
        [userId, event_id],
        (dupErr, existing) => {
          if (dupErr) {
            console.error("Ticket duplicate check error:", dupErr);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          if (existing.length > 0) {
            return res.status(409).json({
              error: "already_claimed",
              message: "You already claimed a ticket for this event",
            });
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
                return res.status(500).json({ error: "Internal Server Error" });
              }

              // 4) Decrement availability
              db.query(
                "UPDATE events SET tickets_available = tickets_available - 1 WHERE id = ?",
                [event_id],
                (updErr) => {
                  if (updErr) {
                    console.error("Event update error:", updErr);
                    return res.status(500).json({ error: "Internal Server Error" });
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
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get current user tickets
router.get("/", requireAuth, (req, res) => {
  const userId = req.session.userId;
  const sql = `
    SELECT t.id, t.event_id, t.ticket_type, t.qr_code, t.created_at, t.checked_in,
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
    SELECT t.id, t.event_id, t.ticket_type, t.qr_code, t.created_at, t.checked_in,
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

// Generate QR code for a ticket
router.get("/qr/:ticketCode", async (req, res) => {
  const { ticketCode } = req.params;

  try {
    // Verify ticket exists
    db.query(
      "SELECT id FROM tickets WHERE qr_code = ?",
      [ticketCode],
      async (err, rows) => {
        if (err) {
          console.error("Ticket lookup error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        if (rows.length === 0) {
          return res.status(404).json({ error: "Ticket not found" });
        }

        // Generate QR code that points to verification page
        const base = getPublicWebBase(req);
        const verificationUrl = `${base}/verify-ticket.html?code=${ticketCode}`;

        try {
          const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: "#912338", // Concordia maroon
              light: "#FFFFFF",
            },
          });

          res.json({ success: true, qrCodeUrl: qrCodeDataUrl });
        } catch (qrErr) {
          console.error("QR generation error:", qrErr);
          res.status(500).json({ error: "Failed to generate QR code" });
        }
      }
    );
  } catch (error) {
    console.error("QR endpoint error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify a ticket by code; in demo mode, allow without auth for scanning convenience
router.post("/verify", (req, res) => {
  const { ticket_code } = req.body;

  if (!ticket_code) {
    return res.status(400).json({ error: "Missing ticket code" });
  }

  // Get ticket details with event info
  const sql = `
    SELECT 
      t.id, t.qr_code, t.ticket_type, t.checked_in, t.created_at,
      e.title, e.event_date, e.event_time, e.location, e.description,
      u.name as attendee_name, u.email as attendee_email
    FROM tickets t
    JOIN events e ON t.event_id = e.id
    JOIN users u ON t.user_id = u.id
    WHERE t.qr_code = ?
  `;

  db.query(sql, [ticket_code], (err, rows) => {
    if (err) {
      console.error("Ticket verification error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: "Invalid ticket code" });
    }

    const ticket = rows[0];
    res.json({
      success: true,
      ticket: {
        ...ticket,
        already_checked_in: ticket.checked_in === 1,
      },
    });
  });
});

// Check-in a ticket (mark as used)
router.post("/check-in", (req, res) => {
  const { ticket_code } = req.body;

  // In demo mode require a simple staff key header to prevent random check-ins
  if (DEMO_MODE) {
    const provided = req.header("x-staff-key");
    const expected = process.env.STAFF_KEY || "demo-staff-key";
    if (!provided || provided !== expected) {
      return res
        .status(401)
        .json({ error: "Unauthorized: missing or invalid staff key" });
    }
  } else {
    // In local mode, require auth to check in
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!ticket_code) {
    return res.status(400).json({ error: "Missing ticket code" });
  }

  // Check if already checked in
  db.query(
    "SELECT id, checked_in FROM tickets WHERE qr_code = ?",
    [ticket_code],
    (err, rows) => {
      if (err) {
        console.error("Check-in lookup error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (rows.length === 0) {
        return res.status(404).json({ error: "Invalid ticket code" });
      }

      const ticket = rows[0];

      if (ticket.checked_in) {
        return res.status(409).json({
          error: "Ticket already checked in",
          already_checked_in: true,
        });
      }

      // Mark as checked in
      db.query(
        "UPDATE tickets SET checked_in = TRUE WHERE id = ?",
        [ticket.id],
        (updateErr) => {
          if (updateErr) {
            console.error("Check-in update error:", updateErr);
            return res.status(500).json({ error: "Internal Server Error" });
          }

          res.json({
            success: true,
            message: "Ticket checked in successfully",
            checked_in: true,
          });
        }
      );
    }
  );
});

module.exports = router;
