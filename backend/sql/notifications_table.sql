-- SQL schema for notifications table (for MySQL)
-- Stores in-app notifications for both admins and regular users (organizers)
-- Minimal design: supports unread counters and simple detail views

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- Target user for the notification; NULL means it's an admin-wide notification
  user_id INT NULL COMMENT 'Recipient user id; NULL for admin notifications',

  -- Who should see this: admin or user (organizer/student)
  audience ENUM('admin','user') NOT NULL DEFAULT 'user' COMMENT 'Target audience of the notification',

  -- Notification categorization
  type ENUM('organizer_request','request_approved','request_refused') NOT NULL COMMENT 'Kind of notification',

  -- Human-friendly content
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,

  -- Optional relational context (for quick filtering/joins)
  related_user_id INT NULL COMMENT 'User who initiated the action (e.g., requester)',
  related_organization_id INT NULL COMMENT 'Organization concerned by the action',
  related_status ENUM('pending','approved','refused') NULL COMMENT 'Resulting status for request-related notifications',

  -- Read tracking
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP NULL DEFAULT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for common queries
  INDEX idx_user_audience (user_id, audience),
  INDEX idx_audience (audience),
  INDEX idx_is_read (is_read),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at),

  -- Foreign keys
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_related_user FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_related_org FOREIGN KEY (related_organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
