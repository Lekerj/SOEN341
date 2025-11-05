CREATE TABLE IF NOT EXISTS events (
    -- Basic information
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique identifier for each event',
    title VARCHAR(255) NOT NULL COMMENT 'Event title/name',
    description TEXT COMMENT 'Detailed description of the event',
    event_date DATE NOT NULL COMMENT 'Date when the event will take place',
    event_time TIME NOT NULL COMMENT 'Starting time of the event',
    location VARCHAR(255) NOT NULL COMMENT 'Physical location or venue of the event',

    -- ADDED: Column for the Price Filter
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Cost of the event; 0.00 for free events',

    -- Classification and organization
    category ENUM('sports', 'academic', 'social', 'club') NOT NULL DEFAULT 'social' COMMENT 'Category of the event',
    -- ADDED: Column for the Organization Name Filter
    organization VARCHAR(100) NOT NULL DEFAULT 'General' COMMENT 'The name of the organizing group or club',

    organizer_id INT COMMENT 'Foreign key to users table - who created/manages this event',

    -- Capacity management
    capacity INT NOT NULL DEFAULT 0 COMMENT 'Maximum number of attendees allowed',
    tickets_available INT NOT NULL DEFAULT 0 COMMENT 'Number of tickets still available for purchase',

    -- Media and timestamps
    image_url VARCHAR(500) COMMENT 'URL to event banner or promotional image',
    
    -- Moderation metadata
    moderation_status ENUM('active', 'flagged', 'removed') NOT NULL DEFAULT 'active' COMMENT 'Current moderation status of the event',
    moderation_notes TEXT COMMENT 'Context or notes left by moderators',
    moderation_updated_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When a moderator last updated this event',
    moderation_updated_by INT NULL COMMENT 'User ID of the moderator who last updated this event',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this record was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When this record was last updated',

    -- Indexes for optimizing common queries
    INDEX idx_event_date (event_date) COMMENT 'Index for filtering by date',
    INDEX idx_category (category) COMMENT 'Index for filtering by category',
    INDEX idx_organizer_id (organizer_id) COMMENT 'Index for filtering by organizer',
    INDEX idx_organization (organization) COMMENT 'Index for filtering by organization name',
    INDEX idx_moderation_status (moderation_status) COMMENT 'Index for quickly filtering by moderation state',
    -- RECOMMENDED: Add index for organization name search

    -- Foreign key constraint to maintain referential integrity
    CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_events_moderator FOREIGN KEY (moderation_updated_by)
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
