-- Migration: Create questions table
-- Issue: #165 - Create Questions Table for Q&A
-- Epic: #14 - Full Reviews & Q&A Feature Implementation

-- Create questions table to store user questions about events and organizers
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
  
  -- Indexes for fast querying
  INDEX idx_questions_user_id (user_id),
  INDEX idx_questions_event_id (event_id),
  INDEX idx_questions_organizer_id (organizer_id),
  INDEX idx_questions_is_answered (is_answered),
  
  -- Foreign key constraints
  CONSTRAINT fk_questions_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_questions_event 
    FOREIGN KEY (event_id) 
    REFERENCES events(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_questions_organizer 
    FOREIGN KEY (organizer_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmation
SELECT 'Successfully created questions table with constraints and indexes' AS status;
