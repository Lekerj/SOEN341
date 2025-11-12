-- Migration: Create answers table
-- Issue: 166 - Create Answers Table for Q&A Responses
-- Epic: 14 - Full Reviews & Q&A Feature Implementation

-- Create answers table to store responses to user questions
CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL COMMENT 'The question this answer responds to',
  user_id INT NOT NULL COMMENT 'The user who provided the answer',
  content TEXT NOT NULL COMMENT 'Full content of the answer',
  is_official_organizer_response BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Flag to note if answerer is the event organizer',
  helpful_count INT NOT NULL DEFAULT 0 COMMENT 'Count of users who found this answer helpful',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of answer submission',
  
  -- Indexes for fast querying
  INDEX idx_answers_question_id (question_id),
  INDEX idx_answers_user_id (user_id),
  INDEX idx_answers_is_official (is_official_organizer_response),
  
  -- Foreign key constraints
  CONSTRAINT fk_answers_question 
    FOREIGN KEY (question_id) 
    REFERENCES questions(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_answers_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmation
SELECT 'Successfully created answers table with constraints and indexes' AS status;
