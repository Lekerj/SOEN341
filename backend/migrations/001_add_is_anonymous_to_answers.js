/**
 * Migration: Add is_anonymous column to answers table
 * This adds support for anonymous answers in the Q&A feature
 */

const db = require('../config/db');

async function migrate() {
  const conn = db.promise();

  try {
    console.log('Running migration: Add is_anonymous to answers table...');

    // Check if column already exists
    const [columns] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'answers' AND COLUMN_NAME = 'is_anonymous'
    `);

    if (columns.length > 0) {
      console.log('✅ Column is_anonymous already exists, skipping...');
      return;
    }

    // Add the column
    await conn.query(`
      ALTER TABLE answers
      ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT FALSE
      COMMENT 'Flag to hide the author name and show as Anonymous'
    `);

    console.log('✅ Migration successful: is_anonymous column added');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = migrate;
