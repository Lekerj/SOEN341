const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireAdmin } = require("../middleware/auth");

/**
 * Placeholder function to signal/trigger email notification (#176)
 * In a real application, this would use a dedicated email service or queue.
 */

const signalEmailNotification = (userID, decision) => {
  console.log(
    `[Email Notification Signal] Decision: ${decision} for User ID: ${userID}`
  );
};

// Endpoint for Organizer Approval
//router GET: /api/admin/organizer/pending (Fetches pending Requests)
router.get("/organizer/pending", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      u.id, u.name, u.email, u.request_date, u.organization_role,
      COALESCE(o.id, 0) AS organization_id, COALESCE(o.name, 'N/A') AS organization_name, COALESCE(o.category, 'social') AS organization_category
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE u.organizer_auth_status = 'pending'
    ORDER BY u.request_date ASC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error Fetching Pending organizers:", err);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to retrieve the pending requests.",
      });
    }
    //Returns the list of pending organizers (name, email, organizations, etc...)
    res.status(200).json({ success: true, pendingOrganizer: results });
  });
});

// ROUTER POST /api/admin/organizer/:id/approve
router.post("/organizers/:id/approve", requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { organization_role } = req.body || {};
  const roleToAssign = organization_role || "Member";

  const sql = `UPDATE users 
                 SET role = 'organizer', organizer_auth_status = 'approved', 
                     organization_role = ?, approval_date = CURRENT_TIMESTAMP
                 WHERE id = ?`;

  db.query(sql, [roleToAssign, userId], (err, result) => {
    if (err) {
      console.error(`DB Error approving user ${userId}:`, err);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Database update failed during approval.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or not eligible for approval.",
      });
    }
    // ADDED: Audit Log for successful rejection
    console.log(
      `AUDIT: Admin (User ID: ${req.session.userId}) APPROVED user ID: ${userId}`
    );

    // Fetch organization_id to add membership & notify user
    const getOrgSql = "SELECT organization_id FROM users WHERE id = ?";
    db.query(getOrgSql, [userId], (e2, rows) => {
      if (e2) {
        console.error("Failed fetching org for approved user:", e2);
      } else if (rows && rows[0] && rows[0].organization_id) {
        const orgId = rows[0].organization_id;
        // Insert membership if not already present
        const memberSql = `INSERT IGNORE INTO organization_members (user_id, organization_id, role, status) VALUES (?, ?, ?, 'active')`;
        db.query(memberSql, [userId, orgId, roleToAssign], (e3) => {
          if (e3) console.error("Membership insert failed:", e3);
        });
        // Notify user
        const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                              VALUES (?, 'user', 'request_approved', 'Organizer request approved', 'Your organizer request has been approved.', ?, ?, 'approved')`;
        db.query(nsql, [userId, userId, orgId], (e4) => {
          if (e4) console.error("Notification insert failed (approval):", e4);
        });
      }
    });

    res.status(200).json({
      success: true,
      message: `Organizer request for ID ${userId} approved. Role updated to 'organizer'.`,
    });
  });
});

// ROUTER POST /api/admin/organizer/:id/reject
router.post("/organizers/:id/reject", requireAdmin, (req, res) => {
  const userId = req.params.id;

  const sql = `UPDATE users 
                 SET organizer_auth_status = 'refused', approval_date = CURRENT_TIMESTAMP
                 WHERE id = ?`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error(`DB Error rejecting user ${userId}:`, err);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Database update failed during rejection.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or not eligible for rejection.",
      });
    }
    console.log(
      `AUDIT: Admin (User ID: ${req.session.userId}) REJECTED user ID: ${userId}`
    );

    // Notify user of rejection
    const getOrgSql = "SELECT organization_id FROM users WHERE id = ?";
    db.query(getOrgSql, [userId], (e2, rows) => {
      const orgId = !e2 && rows && rows[0] ? rows[0].organization_id : null;
      const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                          VALUES (?, 'user', 'request_refused', 'Organizer request refused', 'Your organizer request has been refused. You may modify and resubmit.', ?, ?, 'refused')`;
      db.query(nsql, [userId, userId, orgId], (e3) => {
        if (e3) console.error("Notification insert failed (rejection):", e3);
      });
    });

    res.status(200).json({
      success: true,
      message: `Organizer request for ID ${userId} rejected. Role updated to 'rejected'.`,
    });
  });
});

//-- User Management Endpoints --
/**
 * Route GET /api/admin/users\
 * AC: Return list of all users with current roles
 */
router.get("/users", requireAdmin, (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.email, u.role, u.created_at, u.organization_id, o.name AS organization_name
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    ORDER BY u.created_at DESC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error Fetching all users:", err);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to retrieve user list.",
      });
    }
    res.status(200).json({ success: true, users: results });
  });
});

/**
 * Route: PUT /api/admin/users/:id/role
 * AC: Allows assigning user roles (admin, organizer, student, user).
 * AC: Role types validated.
 */

router.put("/users/:id/role", requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { newRole } = req.body;

  //Define valid roles for validation
  const VALID_ROLES = ["admin", "organizer", "student", "user"];

  //400 Bad Request Check: Validate role input
  if (!newRole || !VALID_ROLES.includes(newRole)) {
    return res.status(400).json({
      success: false,
      message: `Invalid or missing role provided. Must be one of: ${VALID_ROLES.join(
        ", "
      )}.`,
    });
  }
  const sql = "UPDATE users SET role = ? WHERE id = ?";

  db.query(sql, [newRole, userId], (err, result) => {
    if (err) {
      console.error(`DB Error assinging role to user ${userId}:`, err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    //Audit Trail Log:
    console.log(
      `AUDIT: Admin (User ID: ${req.session.userId}) assigned role '${newRole}' to User ID: ${userId}`
    );
    return res.status(200).json({
      success: true,
      message: `Role for user ${userId} updated to ${newRole}`,
    });
  });
});

// -- New Organization Management Endpoint ---

/**
 * ROUTE: GET /api/admin/organization
 * AC: Return Lists of all organization with details
 */
router.get("/organization", requireAdmin, (req, res) => {
  const sql = `
    SELECT id, name, logo_url, description, created_at
    FROM organizations
    ORDER BY name ASC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error Fetching all organizations:", err);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to retrieve organization list.",
      });
    }
    res.status(200).json({ success: true, organization: results });
  });
});

/**
 * GET /api/admin/organizer/requests
 * Returns list of organizer_requests with pending status for review.
 */
router.get("/organizer/requests", requireAdmin, (req, res) => {
  console.log("[ADMIN] Fetching pending organizer requests...");
  const sql = `SELECT r.id, r.user_id, r.organization_id, r.request_type, r.status, r.details, r.created_at,
                        u.name AS user_name, u.email AS user_email,
                        o.name AS organization_name, o.category AS organization_category
                 FROM organizer_requests r
                 LEFT JOIN users u ON r.user_id = u.id
                 LEFT JOIN organizations o ON r.organization_id = o.id
                 WHERE r.status = 'pending'
                 ORDER BY r.created_at ASC`;
  db.query(sql, (err, rows) => {
    if (err) {
      // Return an empty list instead of a 500 so the admin UI stays stable
      console.error(
        "[ADMIN] DB error fetching pending organizer requests (returning empty list):",
        err
      );
      return res.status(200).json({ success: true, requests: [] });
    }
    console.log(`[ADMIN] Found ${rows.length} pending requests`);
    res.status(200).json({ success: true, requests: rows });
  });
});

/**
 * PATCH /api/admin/organizer/requests/:id/decision
 * Body: { decision: 'approved' | 'refused', role? }
 * Applies decision to organizer_requests row & updates users / memberships.
 */
router.patch("/organizer/requests/:id/decision", requireAdmin, (req, res) => {
  const requestId = req.params.id;
  const { decision, role } = req.body || {};
  if (!["approved", "refused"].includes(decision)) {
    return res
      .status(400)
      .json({ success: false, error: "decision must be approved or refused" });
  }
  // Fetch request & user
  const fetchSql = `SELECT r.*, u.role AS user_role, u.organizer_auth_status, u.id AS user_id, u.organization_id AS user_org_id
                      FROM organizer_requests r
                      JOIN users u ON r.user_id = u.id
                      WHERE r.id = ?`;
  db.query(fetchSql, [requestId], (err, rows) => {
    if (err) {
      console.error("DB error fetching request:", err);
      return res.status(500).json({ success: false, error: "Internal" });
    }
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Request not found" });
    const reqRow = rows[0];
    // Update request status
    db.query(
      "UPDATE organizer_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [decision, requestId],
      (e2) => {
        if (e2) {
          console.error("DB error updating request status:", e2);
          return res.status(500).json({ success: false, error: "Internal" });
        }
        if (decision === "approved") {
          // Update user record
          db.query(
            `UPDATE users SET role='organizer', organizer_auth_status='approved', organization_role=?, approval_date=CURRENT_TIMESTAMP WHERE id=?`,
            [role || "Member", reqRow.user_id],
            (e3) => {
              if (e3) {
                console.error("User update fail:", e3);
              }
              // Insert membership
              if (reqRow.organization_id) {
                db.query(
                  `INSERT IGNORE INTO organization_members (user_id, organization_id, role, status) VALUES (?, ?, ?, 'active')`,
                  [reqRow.user_id, reqRow.organization_id, role || "Member"]
                );
              }
              // Notify user
              const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                                   VALUES (?, 'user', 'request_approved', 'Organizer request approved', 'Your organizer request has been approved.', ?, ?, 'approved')`;
              db.query(nsql, [
                reqRow.user_id,
                reqRow.user_id,
                reqRow.organization_id,
              ]);
            }
          );
        } else {
          // refused
          db.query(
            `UPDATE users SET organizer_auth_status='refused', approval_date=CURRENT_TIMESTAMP WHERE id=?`,
            [reqRow.user_id],
            (e4) => {
              if (e4) console.error("User refusal update fail:", e4);
              const nsql = `INSERT INTO notifications (user_id, audience, type, title, message, related_user_id, related_organization_id, related_status)
                                   VALUES (?, 'user', 'request_refused', 'Organizer request refused', 'Your organizer request has been refused. You may modify and resubmit.', ?, ?, 'refused')`;
              db.query(nsql, [
                reqRow.user_id,
                reqRow.user_id,
                reqRow.organization_id,
              ]);
            }
          );
        }
        return res
          .status(200)
          .json({ success: true, message: `Request ${requestId} ${decision}` });
      }
    );
  });
});

/**
 * PUT /api/admin/members/:id/role
 * Body: { role }
 * Updates role of a membership row in organization_members.
 */
router.put("/members/:id/role", requireAdmin, (req, res) => {
  const membershipId = req.params.id;
  const { role } = req.body || {};
  const VALID = ["Member", "Event Manager", "Vice President", "President"];
  if (!VALID.includes(role))
    return res.status(400).json({
      success: false,
      error: `Invalid role. Must be one of ${VALID.join(", ")}`,
    });
  const sql = `UPDATE organization_members SET role = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.query(sql, [role, membershipId], (err, result) => {
    if (err) {
      console.error("DB membership role update error:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, error: "Membership not found" });
    return res.status(200).json({
      success: true,
      message: `Membership ${membershipId} role updated to ${role}`,
    });
  });
});

// ---- Admin Notifications Endpoints ----
router.get("/notifications/unread-count", requireAdmin, (req, res) => {
  const sql = `SELECT COUNT(*) AS cnt FROM notifications WHERE audience = 'admin' AND is_read = FALSE`;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("DB error fetching admin unread count:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    res.status(200).json({ success: true, count: rows[0].cnt });
  });
});

router.get("/notifications", requireAdmin, (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 20, 100));
  const sql = `SELECT * FROM notifications WHERE audience = 'admin' ORDER BY created_at DESC LIMIT ?`;
  db.query(sql, [limit], (err, rows) => {
    if (err) {
      console.error("DB error fetching admin notifications:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    res.status(200).json({ success: true, notifications: rows });
  });
});

router.post("/notifications/:id/read", requireAdmin, (req, res) => {
  const id = req.params.id;
  const sql = `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND audience = 'admin'`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("DB error marking admin notification read:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true });
  });
});

router.post("/notifications/read-all", requireAdmin, (req, res) => {
  const sql = `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                 WHERE audience = 'admin' AND is_read = FALSE`;
  db.query(sql, (err) => {
    if (err) {
      console.error("DB error marking all admin notifications read:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    res.status(200).json({ success: true });
  });
});

/**
 * Route: PUT /api/admin/organizations/:id
 * AC: Allows editing orgranizations name, logo, description.
 */
router.put("/organizations/:id", requireAdmin, (req, res) => {
  const orgId = req.params.id;
  const { name, logo_url, description } = req.body;

  const fields = [];
  const params = [];

  // Dynamic whitelisting for update
  if (name) {
    fields.push("name = ?");
    params.push(name);
  }
  if (logo_url) {
    fields.push("logo_url = ?");
    params.push(logo_url);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description);
  }

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No editable fields provided for organization update.",
    });
  }

  params.push(orgId);

  const sql = `UPDATE organizations SET ${fields.join(", ")} WHERE id = ?`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(`DB Error updating organization ${orgId}:`, err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found." });
    }

    // Audit Trail Log
    console.log(
      `AUDIT: Admin (User ID: ${
        req.session.userId
      }) edited Organization ID: ${orgId}. Fields: ${fields.join(", ")}`
    );

    res.status(200).json({
      success: true,
      message: `Organization ${orgId} updated successfully.`,
    });
  });
});
// --- EVENT MODERATION ENDPOINTS ---

/**
 * Route: GET /api/admin/events
 * AC: Returns list of all event details with organizer information.
 */
/**
 * Route: GET /api/admin/events/flagged
 * ADDED: Returns list of flagged/reported events only. (Required for Task #194)
 * NOTE: Must come BEFORE /events/:id to avoid being matched as a parameter
 */
router.get("/events/flagged", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    WHERE e.is_flagged = TRUE
    ORDER BY e.created_at DESC
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error fetching flagged events:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    res.status(200).json({ success: true, flaggedEvents: results });
  });
});

/**
 * Route: GET /api/admin/events
 * AC: Returns list of all event details with organizer information.
 */
router.get("/events", requireAdmin, (req, res) => {
  const sql = `
    SELECT
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    ORDER BY e.event_date DESC
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error fetching all events:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    res.status(200).json({ success: true, events: results });
  });
});

/**
 * Route: GET /api/admin/events/:id
 * Function: Fetch a single event by ID for admin
 */
router.get("/events/:id", requireAdmin, (req, res) => {
  const eventId = req.params.id;

  const sql = `
    SELECT
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    WHERE e.id = ?
  `;

  db.query(sql, [eventId], (err, results) => {
    if (err) {
      console.error("DB Error fetching event:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Event not found" });
    }

    res.status(200).json({ success: true, event: results[0] });
  });
});

/**
 * Route: PUT /api/admin/events/:id
 * AC: Allows editing event details.
 */
router.put("/events/:id", requireAdmin, (req, res) => {
  const eventId = req.params.id;
  const {
    title,
    description,
    event_date,
    event_time,
    location,
    capacity,
    price,
    category,
    organization,
    is_flagged,
    moderation_notes,
  } = req.body;

  const fields = [];
  const params = [];

  if (title) {
    fields.push("title = ?");
    params.push(title);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description);
  }
  if (event_date) {
    fields.push("event_date = ?");
    params.push(event_date);
  }
  if (event_time) {
    fields.push("event_time = ?");
    params.push(event_time);
  }
  if (location) {
    fields.push("location = ?");
    params.push(location);
  }
  if (capacity !== undefined) {
    fields.push("capacity = ?");
    params.push(capacity);
  }
  if (price !== undefined) {
    fields.push("price = ?");
    params.push(price);
  }
  if (category) {
    fields.push("category = ?");
    params.push(category);
  }
  if (organization) {
    fields.push("organization = ?");
    params.push(organization);
  }
  if (is_flagged !== undefined) {
    fields.push("is_flagged = ?");
    params.push(is_flagged ? 1 : 0);
  }
  if (moderation_notes !== undefined) {
    fields.push("moderation_notes = ?");
    params.push(moderation_notes);
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No fields provided for update." });
  }

  params.push(eventId);

  const sql = `UPDATE events SET ${fields.join(", ")} WHERE id = ?`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(`DB Error updating event ${eventId}:`, err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    // Audit Trail Log
    console.log(
      `AUDIT: Moderator (User ID: ${req.session.userId}) edited Event ID: ${eventId}`
    );

    res.status(200).json({
      success: true,
      message: `Event ${eventId} updated successfully.`,
    });
  });
});

/**
 * Route: DELETE /api/admin/events/:id
 * AC: Deletes event from system.
 */
router.delete("/events/:id", requireAdmin, (req, res) => {
  const eventId = req.params.id;
  const sql = "DELETE FROM events WHERE id = ?";

  db.query(sql, [eventId], (err, result) => {
    if (err) {
      console.error(`DB Error deleting event ${eventId}:`, err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    // Audit Trail Log
    console.log(
      `AUDIT: Moderator (User ID: ${req.session.userId}) DELETED Event ID: ${eventId}`
    );

    res.status(200).json({
      success: true,
      message: `Event ${eventId} successfully deleted.`,
    });
  });
});

// ==========================================
// ORGANIZATION MANAGEMENT ENDPOINTS (Issue #201)
// ==========================================

/**
 * GET /api/admin/organizations
 * Returns all organizations with their details
 */
router.get("/organizations", requireAdmin, (req, res) => {
  const sql = `
    SELECT id, name, description, category, is_default, logo_url, created_at
    FROM organizations
    ORDER BY name ASC
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Error fetching organizations:", err);
      // Return empty array instead of 500 error to prevent dashboard crash
      return res.status(200).json({ success: true, organizations: [] });
    }
    res.status(200).json({ success: true, organizations: results || [] });
  });
});

/**
 * POST /api/admin/organizations
 * Creates a new organization
 */
router.post("/organizations", requireAdmin, (req, res) => {
  const { name, description, category, logo_url } = req.body;

  // Validation
  if (!name || name.trim().length < 3 || name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: "Organization name must be 3-100 characters",
    });
  }

  const validCategories = ["sports", "academic", "social", "club"];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Category must be one of: ${validCategories.join(", ")}`,
    });
  }

  const sql = `
    INSERT INTO organizations (name, description, category, logo_url, is_default)
    VALUES (?, ?, ?, ?, FALSE)
    `;

  db.query(
    sql,
    [name.trim(), description || null, category, logo_url || null],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            success: false,
            message: "Organization name already exists",
          });
        }
        console.error("DB Error creating organization:", err);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      console.log(
        `AUDIT: Admin (User ID: ${req.session.userId}) CREATED Organization: ${name}`
      );
      res.status(201).json({
        success: true,
        message: "Organization created successfully",
        id: result.insertId,
      });
    }
  );
});

/**
 * PUT /api/admin/organizations/:orgId
 * Updates an existing organization
 */
router.put("/organizations/:orgId", requireAdmin, (req, res) => {
  const orgId = req.params.orgId;
  const { name, description, category, logo_url } = req.body;

  const fields = [];
  const params = [];

  if (name) {
    if (name.trim().length < 3 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Organization name must be 3-100 characters",
      });
    }
    fields.push("name = ?");
    params.push(name.trim());
  }

  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description || null);
  }

  if (category) {
    const validCategories = ["sports", "academic", "social", "club"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${validCategories.join(", ")}`,
      });
    }
    fields.push("category = ?");
    params.push(category);
  }

  if (logo_url !== undefined) {
    fields.push("logo_url = ?");
    params.push(logo_url || null);
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No fields to update" });
  }

  params.push(orgId);

  const sql = `UPDATE organizations SET ${fields.join(", ")} WHERE id = ?`;

  db.query(sql, params, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "Organization name already exists",
        });
      }
      console.error("DB Error updating organization:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    console.log(
      `AUDIT: Admin (User ID: ${req.session.userId}) UPDATED Organization ID: ${orgId}`
    );
    res
      .status(200)
      .json({ success: true, message: "Organization updated successfully" });
  });
});

/**
 * DELETE /api/admin/organizations/:orgId
 * Deletes an organization
 */
router.delete("/organizations/:orgId", requireAdmin, (req, res) => {
  const orgId = req.params.orgId;

  // Prevent deletion of default organization
  const checkSql = "SELECT is_default FROM organizations WHERE id = ?";
  db.query(checkSql, [orgId], (err, results) => {
    if (err) {
      console.error("DB Error checking organization:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }

    if (!results.length) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    if (results[0].is_default) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete default organization",
      });
    }

    const sql = "DELETE FROM organizations WHERE id = ?";
    db.query(sql, [orgId], (err, result) => {
      if (err) {
        console.error("DB Error deleting organization:", err);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      console.log(
        `AUDIT: Admin (User ID: ${req.session.userId}) DELETED Organization ID: ${orgId}`
      );
      res
        .status(200)
        .json({ success: true, message: "Organization deleted successfully" });
    });
  });
});

/**
 * GET /api/admin/organizations/:orgId/members
 * Returns all members of an organization with their roles
 */
router.get("/organizations/:orgId/members", requireAdmin, (req, res) => {
  const orgId = req.params.orgId;

  const sql = `
    SELECT om.id, om.user_id, u.name, u.email, om.role, om.status, om.assigned_at
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organization_id = ?
    ORDER BY om.assigned_at DESC
    `;

  db.query(sql, [orgId], (err, results) => {
    if (err) {
      console.error("DB Error fetching members:", err);
      return res
        .status(500)
        .json({ success: false, error: "Internal Server Error" });
    }
    res.status(200).json({ success: true, members: results });
  });
});

/**
 * PUT /api/admin/organizations/:orgId/members/:memberId/role
 * Updates a member's role within an organization
 */
router.put(
  "/organizations/:orgId/members/:memberId/role",
  requireAdmin,
  (req, res) => {
    const { orgId, memberId } = req.params;
    const { role } = req.body;

    const validRoles = [
      "President",
      "Vice President",
      "Event Manager",
      "Member",
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(", ")}`,
      });
    }

    const sql = `
    UPDATE organization_members 
    SET role = ?, assigned_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND organization_id = ?
    `;

    db.query(sql, [role, memberId, orgId], (err, result) => {
      if (err) {
        console.error("DB Error updating member role:", err);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Member not found in organization",
        });
      }

      console.log(
        `AUDIT: Admin (User ID: ${req.session.userId}) UPDATED Member ${memberId} role to ${role} in Org ${orgId}`
      );
      res
        .status(200)
        .json({ success: true, message: `Member role updated to ${role}` });
    });
  }
);

// ==========================================
// ANALYTICS ENDPOINTS (Issue #198)
// ==========================================

/**
 * Analytics handler (aggregated stats)
 * Provides organization/event analytics with optional filtering
 */
function getAnalyticsHandler(database) {
  return (req, res) => {
    const start = Date.now();
    const { organization } = req.query;

    let sql = `
            SELECT
                COUNT(DISTINCT e.id) AS total_events,
                COUNT(t.id) AS total_tickets_issued,
                SUM(CASE WHEN t.checked_in = 1 THEN 1 ELSE 0 END) AS total_checked_in
            FROM events e
            LEFT JOIN tickets t ON t.event_id = e.id
        `;
    const params = [];

    if (organization && organization.trim() !== "") {
      sql += " WHERE e.organization = ?";
      params.push(organization.trim());
    }

    database.query(sql, params, (err, rows) => {
      if (err) {
        console.error("Admin analytics query error:", err);
        return res
          .status(500)
          .json({ success: false, error: "Internal Server Error" });
      }

      const row = rows && rows[0] ? rows[0] : {};

      const totalEvents = Number(row.total_events || 0);
      const totalTickets = Number(row.total_tickets_issued || 0);
      const totalCheckedIn = Number(row.total_checked_in || 0);
      const totalNotCheckedIn = Math.max(totalTickets - totalCheckedIn, 0);
      const attendanceRate =
        totalTickets > 0 ? totalCheckedIn / totalTickets : 0;

      const duration = Date.now() - start;

      return res.json({
        success: true,
        data: {
          total_events: totalEvents,
          total_tickets_issued: totalTickets,
          total_checked_in: totalCheckedIn,
          total_not_checked_in: totalNotCheckedIn,
          attendance_rate: Number(attendanceRate.toFixed(4)),
        },
        filters_applied: {
          organization:
            organization && organization.trim() !== ""
              ? organization.trim()
              : null,
        },
        meta: {
          query_ms: duration,
        },
      });
    });
  };
}

/**
 * GET /api/admin/analytics
 * Returns aggregated analytics for events and tickets
 */
router.get("/analytics", requireAdmin, getAnalyticsHandler(db));

module.exports = router;
module.exports.getAnalyticsHandler = getAnalyticsHandler;
