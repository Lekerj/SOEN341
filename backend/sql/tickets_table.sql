CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique ticket ID',
  user_id INT NOT NULL COMMENT 'Student who claimed the ticket',
  event_id INT NOT NULL COMMENT 'Event associated with this ticket',
  ticket_type ENUM('free', 'paid') DEFAULT 'free' COMMENT 'Type of ticket claimed',
  qr_code VARCHAR(255) COMMENT 'Unique QR code string or file reference',
  purchaser_name VARCHAR(100) NULL COMMENT 'Name provided for paid ticket (dummy info)',
  purchaser_email VARCHAR(255) NULL COMMENT 'Email provided for paid ticket (dummy info)',
  checked_in BOOLEAN DEFAULT FALSE COMMENT 'True if student checked in at event',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the ticket was claimed',

  -- Ensure same student can’t claim multiple tickets for same event
  UNIQUE KEY unique_user_event (user_id, event_id),

  -- Foreign keys to maintain referential integrity
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_event FOREIGN KEY (event_id)
    REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

