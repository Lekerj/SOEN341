/**
 * Migration Script: Add average_rating column to users table
 * This is required for the Reviews & Q&A feature (Epic #14)
 * Run with: npm run migrate:add-average-rating
 */

const db = require('./config/db');

console.log('🔄 Running migration: Add average_rating column to users table...\n');

const migration = async () => {
  try {
    // Check if column already exists
    await new Promise((resolve, reject) => {
      db.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "users" AND COLUMN_NAME = "average_rating"',
        (err, results) => {
          if (err) reject(err);

          if (results && results.length > 0) {
            console.log('✅ Column average_rating already exists. Nothing to do.');
            resolve(true);
            return;
          }

          // Add the column
          console.log('📝 Adding average_rating column to users table...');
          db.query(
            `ALTER TABLE users ADD COLUMN average_rating DECIMAL(3,2) NULL COMMENT 'Average rating for user when acting as organizer'`,
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('✅ Successfully added average_rating column to users table');
                resolve(false);
              }
            }
          );
        }
      );
    });

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migration();
