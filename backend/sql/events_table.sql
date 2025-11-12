CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT,
    organizer_id INT,
    organization VARCHAR(100),
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255),
    capacity INT DEFAULT 100,
    price DECIMAL(10, 2) DEFAULT 0.00,
    category VARCHAR(50),
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    tickets_available INT DEFAULT 0,

    INDEX idx_organizer_id (organizer_id),
    INDEX idx_event_date (event_date),
    INDEX idx_is_flagged (is_flagged),
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;