-- Idempotent migration to ensure moderation columns exist on the `events` table.
-- Uses dynamic SQL so it works on MySQL versions without ADD COLUMN IF NOT EXISTS.

SET @stmt := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'events'
        AND COLUMN_NAME = 'is_flagged'
    ),
    'SELECT "Column is_flagged already exists" AS info',
    'ALTER TABLE events ADD COLUMN is_flagged TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Flagged by users or pending moderation'''
  )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'events'
        AND COLUMN_NAME = 'is_visible'
    ),
    'SELECT "Column is_visible already exists" AS info',
    'ALTER TABLE events ADD COLUMN is_visible TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''Controls whether event appears in public listings'''
  )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'events'
        AND COLUMN_NAME = 'moderation_status'
    ),
    'SELECT "Column moderation_status already exists" AS info',
    'ALTER TABLE events ADD COLUMN moderation_status ENUM(''pending'',''approved'',''rejected'') NOT NULL DEFAULT ''approved'' COMMENT ''Admin moderation decision state'''
  )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
