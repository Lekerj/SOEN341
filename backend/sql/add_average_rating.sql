-- Migration: Add average_rating column to users table
-- This is needed for the Reviews & Q&A feature (Epic #14)

ALTER TABLE users ADD COLUMN average_rating DECIMAL(3,2) NULL COMMENT 'Average rating for user when acting as organizer';

SELECT 'Successfully added average_rating column to users table' AS status;
