CREATE TABLE IF NOT EXISTS moderation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique identifier for each moderation action',
    event_id INT NULL COMMENT 'The moderated event (nullable if event is deleted)',
    admin_id INT NULL COMMENT 'Administrator who performed the action',
    action ENUM('flag', 'unflag', 'edit', 'delete', 'restore', 'note') NOT NULL COMMENT 'Type of moderation action performed',
    details TEXT COMMENT 'Optional context describing the action',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action took place',

    INDEX idx_log_event (event_id),
    INDEX idx_log_admin (admin_id),
    INDEX idx_log_action (action),

    CONSTRAINT fk_moderation_logs_event FOREIGN KEY (event_id)
        REFERENCES events(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_moderation_logs_admin FOREIGN KEY (admin_id)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
