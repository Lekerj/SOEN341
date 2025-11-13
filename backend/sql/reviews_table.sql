-- Migration: Create reviews table
-- Issue: #164 - Create Review Table
-- Epic: #14 - Full Reviews & Q&A Feature Implementation

-- Create reviews table to store user reviews of events and organizers
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp of last update',
  
  -- Unique constraint: one review per user per event
  UNIQUE KEY unique_user_event (user_id, event_id),
  
  -- Indexes for fast querying
  INDEX idx_reviews_user_id (user_id),
  INDEX idx_reviews_event_id (event_id),
  INDEX idx_reviews_organizer_id (organizer_id),
  INDEX idx_reviews_rating (rating),
  
  -- Foreign key constraints
  CONSTRAINT fk_reviews_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_reviews_event 
    FOREIGN KEY (event_id) 
    REFERENCES events(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_reviews_organizer 
    FOREIGN KEY (organizer_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  
  -- Check constraint for rating range (1-5)
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmation
SELECT 'Successfully created reviews table with constraints and indexes' AS status;
