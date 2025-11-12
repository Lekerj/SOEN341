-- Complete Database Setup for ConEvents
-- This script creates all necessary tables in the correct order

-- 1. Create users table first (no dependencies)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  profile_pic_url VARCHAR(500) DEFAULT 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg',
  average_rating DECIMAL(3,2) NULL COMMENT 'Average rating for user when acting as organizer',
  organizer_auth_status ENUM('pending', 'approved', 'refused') DEFAULT NULL,
  organization_id INT DEFAULT NULL,
  organization_role ENUM('Member', 'Event Manager', 'Vice President', 'President') DEFAULT 'Member',
  request_date TIMESTAMP NULL DEFAULT NULL,
  approval_date TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_organizer_auth_status (organizer_auth_status),
  INDEX idx_average_rating (average_rating),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category ENUM('sports', 'academic', 'social', 'club') NOT NULL DEFAULT 'social',
    is_default BOOLEAN DEFAULT FALSE,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT NOT NULL,
    role ENUM('Member', 'Event Manager', 'Vice President', 'President') NOT NULL DEFAULT 'Member',
    status ENUM('active', 'pending', 'refused') NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_org (user_id, organization_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),

    CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create events table
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

-- 5. Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT,
    checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    qr_code VARCHAR(255) UNIQUE,
    ticket_type ENUM('free', 'paid') DEFAULT 'free',

    INDEX idx_event_id (event_id),
    INDEX idx_user_id (user_id),
    INDEX idx_checked_in (checked_in),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create organizer_requests table
CREATE TABLE IF NOT EXISTS organizer_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT NULL,
    request_type ENUM('join', 'create', 'organizer') NOT NULL DEFAULT 'join',
    status ENUM('pending', 'refused', 'approved') NOT NULL DEFAULT 'pending',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_status (status),

    CONSTRAINT fk_organizer_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_organizer_requests_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create reviews table (for Epic #14 - Reviews & Q&A Feature)
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT 'The user who wrote the review',
  event_id INT NOT NULL COMMENT 'The event being reviewed',
  organizer_id INT NOT NULL COMMENT 'The organizer of the event',
  rating TINYINT NOT NULL COMMENT 'Star rating from 1 to 5',
  title VARCHAR(255) NOT NULL COMMENT 'Title of the review',
  content TEXT NOT NULL COMMENT 'Full review text',
  category VARCHAR(50) DEFAULT NULL COMMENT 'Classification of review type',
  image_urls JSON DEFAULT NULL COMMENT 'List of URLs for uploaded images',
  helpful_count INT NOT NULL DEFAULT 0 COMMENT 'Count of users who found this review helpful',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of review submission',
  
  UNIQUE KEY unique_user_event (user_id, event_id),
  INDEX idx_reviews_user_id (user_id),
  INDEX idx_reviews_event_id (event_id),
  INDEX idx_reviews_organizer_id (organizer_id),
  INDEX idx_reviews_rating (rating),
  
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Create questions table (for Epic #14 - Reviews & Q&A Feature)
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT 'The user who asked the question',
  event_id INT NOT NULL COMMENT 'The event the question is about',
  organizer_id INT NOT NULL COMMENT 'The organizer related to the question',
  title VARCHAR(255) NOT NULL COMMENT 'Title/summary of the question',
  content TEXT NOT NULL COMMENT 'Full question text/details',
  is_answered BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Flag indicating if question has been answered',
  helpful_count INT NOT NULL DEFAULT 0 COMMENT 'Count of users who found this question helpful',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of question submission',
  
  INDEX idx_questions_user_id (user_id),
  INDEX idx_questions_event_id (event_id),
  INDEX idx_questions_organizer_id (organizer_id),
  INDEX idx_questions_is_answered (is_answered),
  
  CONSTRAINT fk_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_questions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_questions_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Create answers table (for Epic #14 - Reviews & Q&A Feature)
CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL COMMENT 'The question this answer responds to',
  user_id INT NOT NULL COMMENT 'The user who provided the answer',
  content TEXT NOT NULL COMMENT 'Full content of the answer',
  is_official_organizer_response BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Flag to note if answerer is the event organizer',
  helpful_count INT NOT NULL DEFAULT 0 COMMENT 'Count of users who found this answer helpful',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of answer submission',
  
  INDEX idx_answers_question_id (question_id),
  INDEX idx_answers_user_id (user_id),
  INDEX idx_answers_is_official (is_official_organizer_response),
  
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_answers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Insert default organization
INSERT IGNORE INTO organizations (id, name, description, category, is_default)
VALUES (1, 'ConEvents', 'Default system organization', 'social', TRUE);

-- 12. Insert sample admin user (password: admin123 - hashed)
INSERT IGNORE INTO users (id, name, email, password_hash, role, organizer_auth_status, created_at)
VALUES (1, 'Admin', 'admin@conevents.com', '$2b$10$0.5S1/KTF3ZqVN4X8L3eaOVhLH9yqsXH3zMj5WKs1fXJ5V0VHh5uW', 'admin', 'approved', NOW());

-- 13. Add admin to default organization
INSERT IGNORE INTO organization_members (user_id, organization_id, role, status)
VALUES (1, 1, 'President', 'active');

-- Display confirmation messages
SELECT 'Database setup completed successfully!' as status;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME;
