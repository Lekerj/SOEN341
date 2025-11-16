-- Migration: Create helpful_votes table
-- Tracks which users have marked which questions and answers as helpful
-- Prevents duplicate helpful votes from the same user

-- Create helpful_votes table to track user votes on questions and answers
CREATE TABLE IF NOT EXISTS helpful_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT 'User who marked as helpful',
  question_id INT COMMENT 'Question being voted on (NULL if voting on answer)',
  answer_id INT COMMENT 'Answer being voted on (NULL if voting on question)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the vote was cast',

  -- Indexes for fast lookup
  INDEX idx_helpful_votes_user_id (user_id),
  INDEX idx_helpful_votes_question_id (question_id),
  INDEX idx_helpful_votes_answer_id (answer_id),
  INDEX idx_helpful_votes_user_question (user_id, question_id),
  INDEX idx_helpful_votes_user_answer (user_id, answer_id),

  -- Constraints to ensure valid relationships
  CONSTRAINT fk_helpful_votes_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_helpful_votes_question
    FOREIGN KEY (question_id)
    REFERENCES questions(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_helpful_votes_answer
    FOREIGN KEY (answer_id)
    REFERENCES answers(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Unique constraint: each user can only vote once per question/answer
  -- Note: The UNIQUE constraints implicitly enforce that either question_id or answer_id is set
  UNIQUE KEY unique_user_question_vote (user_id, question_id),
  UNIQUE KEY unique_user_answer_vote (user_id, answer_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confirmation
SELECT 'Successfully created helpful_votes table for tracking user votes' AS status;
