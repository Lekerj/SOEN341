-- Adds organization_id column to users table if it does not already exist.

SET @stmt := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'organization_id'
    ),
    'SELECT "Column organization_id already exists" AS info',
    'ALTER TABLE users ADD COLUMN organization_id INT NULL AFTER role'
  )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND CONSTRAINT_NAME = 'fk_users_organization'
    ),
    'SELECT "Constraint fk_users_organization already exists" AS info',
    'ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
