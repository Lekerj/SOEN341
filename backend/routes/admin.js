const express = require('express');
const util = require('util');

const router = express.Router();

const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const {
  validateDateFormat,
  validateTimeFormat,
  validatePrice,
  validateInteger,
  validateCategory,
  sanitizeString
} = require('../utils/validation');

const query = util.promisify(db.query).bind(db);

const MODERATION_STATUSES = ['active', 'flagged', 'removed'];

async function logModerationAction(adminId, eventId, action, details = null) {
  try {
    await query(
      `INSERT INTO moderation_logs (event_id, admin_id, action, details)
       VALUES (?, ?, ?, ?)`,
      [eventId || null, adminId || null, action, details || null]
    );
  } catch (err) {
    console.error('Failed to record moderation log:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Organizer approval workflow
// ---------------------------------------------------------------------------

router.get('/organizer/pending', requireAdmin, async (_req, res) => {
  try {
    const pendingOrganizer = await query(
      `SELECT id, name, email, organization, created_at
       FROM users
       WHERE role = 'pending'
       ORDER BY created_at ASC`
    );
    res.json({ success: true, pendingOrganizer });
  } catch (err) {
    console.error('DB Error fetching pending organizers:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve the pending requests.'
    });
  }
});

router.post('/organizers/:id/approve', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid organizer ID.' });
  }

  try {
    const result = await query(
      'UPDATE users SET role = ? WHERE id = ? AND role = "pending"',
      ['organizer', userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or not eligible for approval (role is not 'pending')."
      });
    }

    console.log(`AUDIT: Admin (User ID: ${req.session.userId}) APPROVED user ID: ${userId}`);
    res.json({
      success: true,
      message: `Organizer request for ID ${userId} approved. Role updated to 'organizer'.`
    });
  } catch (err) {
    console.error(`DB Error approving user ${userId}:`, err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Database update failed during approval.'
    });
  }
});

router.post('/organizers/:id/reject', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid organizer ID.' });
  }

  try {
    const result = await query(
      'UPDATE users SET role = ? WHERE id = ? AND role = "pending"',
      ['rejected', userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or not eligible for rejection (role is not 'pending')."
      });
    }

    console.log(`AUDIT: Admin (User ID: ${req.session.userId}) REJECTED user ID: ${userId}`);
    res.json({
      success: true,
      message: `Organizer request for ID ${userId} rejected. Role updated to 'rejected'.`
    });
  } catch (err) {
    console.error(`DB Error rejecting user ${userId}:`, err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Database update failed during rejection.'
    });
  }
});

// ---------------------------------------------------------------------------
// User & organization management endpoints
// ---------------------------------------------------------------------------

router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await query(
      `SELECT id, name, email, role, organization, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ success: true, users });
  } catch (err) {
    console.error('DB Error fetching all users:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve user list.'
    });
  }
});

router.put('/users/:id/role', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { newRole } = req.body;

  const VALID_ROLES = ['admin', 'organizer', 'student', 'user', 'pending', 'rejected'];

  if (!newRole || !VALID_ROLES.includes(newRole)) {
    return res.status(400).json({
      success: false,
      message: `Invalid or missing role provided. Must be one of: ${VALID_ROLES.join(', ')}.`
    });
  }

  if (Number.isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  try {
    const result = await query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    console.log(`AUDIT: Admin (User ID: ${req.session.userId}) assigned role '${newRole}' to User ID: ${userId}`);
    res.json({ success: true, message: 'Role updated successfully.' });
  } catch (err) {
    console.error(`DB Error assigning role to user ${userId}:`, err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Database update failed during role change.'
    });
  }
});

router.get('/organization', requireAdmin, async (_req, res) => {
  try {
    const organization = await query(
      `SELECT id, name, logo_url, description, created_at
       FROM organizations
       ORDER BY name ASC`
    );
    res.json({ success: true, organization });
  } catch (err) {
    console.error('DB Error fetching all organizations:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve organization list.'
    });
  }
});

router.put('/organizations/:id', requireAdmin, async (req, res) => {
  const orgId = parseInt(req.params.id, 10);
  if (Number.isNaN(orgId)) {
    return res.status(400).json({ success: false, message: 'Invalid organization ID.' });
  }

  const { name, logo_url, description } = req.body;
  const fields = [];
  const params = [];

  if (name) {
    fields.push('name = ?');
    params.push(name);
  }
  if (logo_url) {
    fields.push('logo_url = ?');
    params.push(logo_url);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No editable fields provided for organization update.'
    });
  }

  params.push(orgId);

  try {
    const result = await query(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }

    console.log(`AUDIT: Admin (User ID: ${req.session.userId}) edited Organization ID: ${orgId}. Fields: ${fields.join(', ')}`);
    res.json({ success: true, message: `Organization ${orgId} updated successfully.` });
  } catch (err) {
    console.error(`DB Error updating organization ${orgId}:`, err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ---------------------------------------------------------------------------
// Event moderation endpoints
// ---------------------------------------------------------------------------

async function fetchModerationEvents({ status = 'all', search = '' }) {
  const filters = [];
  const params = [];

  if (status && status !== 'all') {
    if (!MODERATION_STATUSES.includes(status)) {
      const allowed = ['all'].concat(MODERATION_STATUSES).join(', ');
      throw new Error(`Status must be one of: ${allowed}`);
    }
    filters.push('e.moderation_status = ?');
    params.push(status);
  }

  if (search && search.trim() !== '') {
    const term = `%${sanitizeString(search)}%`;
    filters.push(`(e.title LIKE ? OR e.organization LIKE ? OR e.location LIKE ?)`);
    params.push(term, term, term);
  }

  let sql = `
    SELECT
      e.*,
      u.name AS organizer_name,
      u.email AS organizer_email,
      moderator.name AS moderator_name
    FROM events e
    LEFT JOIN users u ON e.organizer_id = u.id
    LEFT JOIN users moderator ON e.moderation_updated_by = moderator.id
  `;

  if (filters.length > 0) {
    sql += ` WHERE ${filters.join(' AND ')}`;
  }

  sql += `
    ORDER BY 
      CASE e.moderation_status 
        WHEN 'flagged' THEN 0 
        WHEN 'removed' THEN 1 
        ELSE 2 
      END,
      e.event_date ASC,
      e.title ASC
  `;

  return query(sql, params);
}

router.get('/events', requireAdmin, async (req, res) => {
  try {
    const events = await fetchModerationEvents({
      status: req.query.status || 'all',
      search: req.query.search || ''
    });
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    if (err.message && err.message.startsWith('Status must be one of')) {
      return res.status(400).json({ error: 'Invalid status filter', message: err.message });
    }
    console.error('Failed to load moderation events:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to load events for moderation'
    });
  }
});

router.get('/events/flagged', requireAdmin, async (req, res) => {
  try {
    const events = await fetchModerationEvents({
      status: 'flagged',
      search: req.query.search || ''
    });
    res.json({ success: true, count: events.length, flaggedEvents: events });
  } catch (err) {
    console.error('Failed to load flagged events:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to load flagged events'
    });
  }
});

router.put('/events/:id', requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const adminId = req.session.userId;
  const updates = req.body || {};

  try {
    const existingRows = await query(
      `SELECT id, capacity, tickets_available FROM events WHERE id = ?`,
      [eventId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const existing = existingRows[0];
    const fields = [];
    const params = [];
    const touchedFields = [];
    const errors = [];

    const processStringField = (field, maxLength, allowEmpty = false) => {
      if (updates[field] === undefined) return;
      const value =
        typeof updates[field] === 'string' ? updates[field].trim() : String(updates[field]);

      if (!allowEmpty && value.length === 0) {
        errors.push(`${field}: Cannot be empty.`);
        return;
      }

      if (maxLength && value.length > maxLength) {
        errors.push(`${field}: Must be ${maxLength} characters or fewer.`);
        return;
      }

      fields.push(`${field} = ?`);
      params.push(value);
      touchedFields.push(field);
    };

    processStringField('title', 255);
    processStringField('description', 5000, true);
    processStringField('location', 255);
    processStringField('organization', 100);
    processStringField('image_url', 500, true);

    if (updates.event_date !== undefined) {
      const dateValue = String(updates.event_date).trim();
      if (!validateDateFormat(dateValue)) {
        errors.push('event_date: Must be provided in YYYY-MM-DD format.');
      } else {
        fields.push('event_date = ?');
        params.push(dateValue);
        touchedFields.push('event_date');
      }
    }

    if (updates.event_time !== undefined) {
      const timeValue = String(updates.event_time).trim();
      if (!validateTimeFormat(timeValue)) {
        errors.push('event_time: Must be provided in HH:MM format (24-hour clock).');
      } else {
        fields.push('event_time = ?');
        params.push(timeValue);
        touchedFields.push('event_time');
      }
    }

    if (updates.category !== undefined) {
      const categoryValue = String(updates.category).trim();
      if (!validateCategory(categoryValue)) {
        errors.push('category: Must be one of sports, academic, social, club.');
      } else {
        fields.push('category = ?');
        params.push(categoryValue);
        touchedFields.push('category');
      }
    }

    if (updates.price !== undefined) {
      const priceValue = String(updates.price).trim();
      if (!validatePrice(priceValue)) {
        errors.push('price: Must be a non-negative number.');
      } else {
        fields.push('price = ?');
        params.push(parseFloat(priceValue));
        touchedFields.push('price');
      }
    }

    let draftCapacity = existing.capacity;
    if (updates.capacity !== undefined) {
      const capacityRaw = String(updates.capacity).trim();
      const capacityInt = parseInt(capacityRaw, 10);
      if (!validateInteger(capacityRaw) || Number.isNaN(capacityInt) || capacityInt <= 0) {
        errors.push('capacity: Must be a positive integer.');
      } else {
        draftCapacity = capacityInt;
        fields.push('capacity = ?');
        params.push(capacityInt);
        touchedFields.push('capacity');
      }
    }

    let draftTicketsAvailable = existing.tickets_available;
    if (updates.tickets_available !== undefined) {
      const ticketsRaw = String(updates.tickets_available).trim();
      const ticketsInt = parseInt(ticketsRaw, 10);
      if (!validateInteger(ticketsRaw) || Number.isNaN(ticketsInt)) {
        errors.push('tickets_available: Must be a non-negative integer.');
      } else {
        draftTicketsAvailable = ticketsInt;
        fields.push('tickets_available = ?');
        params.push(ticketsInt);
        touchedFields.push('tickets_available');
      }
    }

    if (draftTicketsAvailable > draftCapacity) {
      errors.push('tickets_available cannot exceed capacity.');
    }

    if (updates.moderation_status !== undefined) {
      const statusValue = String(updates.moderation_status).trim();
      if (!MODERATION_STATUSES.includes(statusValue)) {
        errors.push(`moderation_status: Must be one of ${MODERATION_STATUSES.join(', ')}.`);
      } else {
        fields.push('moderation_status = ?');
        params.push(statusValue);
        touchedFields.push('moderation_status');
      }
    }

    if (updates.moderation_notes !== undefined) {
      const noteValue =
        typeof updates.moderation_notes === 'string'
          ? updates.moderation_notes.trim()
          : String(updates.moderation_notes);

      if (noteValue.length > 2000) {
        errors.push('moderation_notes: Must be 2000 characters or fewer.');
      } else {
        fields.push('moderation_notes = ?');
        params.push(noteValue);
        touchedFields.push('moderation_notes');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid update payload',
        messages: errors
      });
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    fields.push('moderation_updated_at = NOW()');
    fields.push('moderation_updated_by = ?');
    params.push(adminId);
    params.push(eventId);

    await query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await query(
      `SELECT 
         e.*, 
         u.name AS organizer_name, 
         u.email AS organizer_email 
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.id
       WHERE e.id = ?`,
      [eventId]
    );

    const logDetails =
      touchedFields.length > 0 ? `Updated fields: ${touchedFields.join(', ')}` : null;
    await logModerationAction(adminId, eventId, 'edit', logDetails);

    res.json({
      success: true,
      event: updated
    });
  } catch (err) {
    console.error('Failed to update event as admin:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to update event'
    });
  }
});

router.delete('/events/:id', requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const adminId = req.session.userId;
  const reason =
    req.body && typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  const noteToAppend =
    reason.length > 0 ? reason : 'Event removed by administrator.';

  try {
    const existingRows = await query(
      `SELECT id FROM events WHERE id = ?`,
      [eventId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await query(
      `UPDATE events
         SET moderation_status = 'removed',
             moderation_notes = CONCAT_WS('\n', moderation_notes, ?),
             moderation_updated_at = NOW(),
             moderation_updated_by = ?,
             tickets_available = 0
       WHERE id = ?`,
      [noteToAppend, adminId, eventId]
    );

    await logModerationAction(adminId, eventId, 'delete', noteToAppend);

    res.json({
      success: true,
      message: 'Event removed from public listings.',
      note: noteToAppend
    });
  } catch (err) {
    console.error('Failed to remove event as admin:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to remove event'
    });
  }
});

router.get('/events/:id/logs', requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (Number.isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  const limitParam = parseInt(req.query.limit, 10);
  const limit = Number.isNaN(limitParam) ? 25 : Math.min(Math.max(limitParam, 1), 100);

  try {
    const logs = await query(
      `SELECT 
         ml.id,
         ml.event_id,
         ml.admin_id,
         ml.action,
         ml.details,
         ml.created_at,
         adminUser.name AS admin_name
       FROM moderation_logs ml
       LEFT JOIN users adminUser ON ml.admin_id = adminUser.id
       WHERE ml.event_id = ?
       ORDER BY ml.created_at DESC
       LIMIT ?`,
      [eventId, limit]
    );

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('Failed to load moderation logs:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to load moderation history'
    });
  }
});

module.exports = router;
