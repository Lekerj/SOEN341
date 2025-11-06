/**
 * Complete Database Reset Script
 * 
 * This script will:
 * 1. Drop all existing tables
 * 2. Recreate all tables in the correct order
 * 3. Seed with default data (organizations, admin, sample events)
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA in the database!
 * 
 * Usage: node scripts/reset-database.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || '341',
  password: process.env.DB_PASSWORD || 'Pass341!',
  database: process.env.DB_NAME || 'convenevents',
  multipleStatements: true
};

// SQL file execution order
const SQL_FILES_ORDER = [
  // 1. Drop all tables first (reverse order of dependencies)
  'DROP TABLE IF EXISTS notifications;',
  'DROP TABLE IF EXISTS organization_members;',
  'DROP TABLE IF EXISTS organizer_requests;',
  'DROP TABLE IF EXISTS tickets;',
  'DROP TABLE IF EXISTS events;',
  'DROP TABLE IF EXISTS users;',
  'DROP TABLE IF EXISTS organizations;',
  
  // 2. Create tables in correct order
  '../sql/organizations_table.sql',
  '../sql/users_table.sql',
  '../sql/events_table.sql',
  '../sql/tickets_table.sql',
  '../sql/notifications_table.sql',
  '../sql/organizer_requests.sql',
  '../sql/organization_members.sql',
  
  // 3. Seed data
  '../sql/seed_organizations.sql',
  // Note: admin and sample events will be created programmatically
];

async function executeSqlFile(connection, filePath) {
  const fullPath = path.join(__dirname, filePath);
  const sql = fs.readFileSync(fullPath, 'utf8');
  
  // Execute the entire file as one statement
  // Remove comments but keep the SQL intact
  const cleanedSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
    .join('\n');
  
  try {
    await connection.query(cleanedSql);
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error.message);
    throw error;
  }
}

async function resetDatabase() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected!\n');

    // Step 1: Drop all tables
    console.log('🗑️  Dropping all existing tables...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  await connection.query('DROP TABLE IF EXISTS notifications;');
  await connection.query('DROP TABLE IF EXISTS organization_members;');
  await connection.query('DROP TABLE IF EXISTS organizer_requests;');
    await connection.query('DROP TABLE IF EXISTS tickets;');
    await connection.query('DROP TABLE IF EXISTS events;');
    await connection.query('DROP TABLE IF EXISTS users;');
    await connection.query('DROP TABLE IF EXISTS organizations;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✅ All tables dropped\n');

    // Step 2: Create organizations table
    console.log('📋 Creating organizations table...');
    await executeSqlFile(connection, '../sql/organizations_table.sql');
    console.log('✅ Organizations table created\n');

    // Step 3: Create users table
    console.log('👤 Creating users table...');
    await executeSqlFile(connection, '../sql/users_table.sql');
    console.log('✅ Users table created\n');

    // Step 4: Create events table
    console.log('🎟️  Creating events table...');
    await executeSqlFile(connection, '../sql/events_table.sql');
    console.log('✅ Events table created\n');

    // Step 5: Create tickets table
    console.log('🎫 Creating tickets table...');
    await executeSqlFile(connection, '../sql/tickets_table.sql');
    console.log('✅ Tickets table created\n');

  // Step 6: Create notifications table
    console.log('🔔 Creating notifications table...');
    await executeSqlFile(connection, '../sql/notifications_table.sql');
    console.log('✅ Notifications table created\n');

  // Step 6b: Create organizer_requests table
  console.log('📨 Creating organizer_requests table...');
  await executeSqlFile(connection, '../sql/organizer_requests.sql');
  console.log('✅ organizer_requests table created\n');

  // Step 6c: Create organization_members table
  console.log('👥 Creating organization_members table...');
  await executeSqlFile(connection, '../sql/organization_members.sql');
  console.log('✅ organization_members table created\n');

    // Step 7: Seed organizations
    console.log('🏢 Seeding organizations...');
    await executeSqlFile(connection, '../sql/seed_organizations.sql');
    const [orgs] = await connection.query('SELECT COUNT(*) as count FROM organizations');
    console.log(`✅ ${orgs[0].count} organizations seeded\n`);

    // Step 8: Create admin user
    console.log('👑 Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    await connection.query(
      `INSERT INTO users (name, email, password_hash, role, organizer_auth_status) 
       VALUES (?, ?, ?, 'admin', NULL)`,
      ['System Administrator', 'admin@concordia.ca', adminPassword]
    );
    console.log('✅ Admin user created');
    console.log('   Email: admin@concordia.ca');
    console.log('   Password: Admin123!\n');

    // Step 9: Create test users
    console.log('🧪 Creating test users...');
    
    // Test student
    const studentPassword = await bcrypt.hash('Student123!', 10);
    await connection.query(
      `INSERT INTO users (name, email, password_hash, role, organizer_auth_status) 
       VALUES (?, ?, ?, 'student', NULL)`,
      ['Test Student', 'student@test.com', studentPassword]
    );
    console.log('✅ Test student created (student@test.com / Student123!)');

    // Test organizer (not approved yet)
    const organizerPassword = await bcrypt.hash('Organizer123!', 10);
    await connection.query(
      `INSERT INTO users (name, email, password_hash, role, organizer_auth_status) 
       VALUES (?, ?, ?, 'organizer', NULL)`,
      ['Test Organizer', 'organizer@test.com', organizerPassword]
    );
    console.log('✅ Test organizer created (organizer@test.com / Organizer123!)');
    console.log('   Status: NULL (needs to submit request)\n');

    // Test approved organizer
    // Create an approved organizer using any available organization (fallback-safe)
    let [orgRow] = await connection.query('SELECT id, name FROM organizations WHERE name = "Concordia Tech Society" LIMIT 1');
    if (!orgRow.length) {
      [orgRow] = await connection.query('SELECT id, name FROM organizations ORDER BY id LIMIT 1');
    }
    if (orgRow.length) {
      const approvedOrganizerPassword = await bcrypt.hash('Approved123!', 10);
      await connection.query(
        `INSERT INTO users (name, email, password_hash, role, organizer_auth_status, organization_id, organization_role, approval_date) 
         VALUES (?, ?, ?, 'organizer', 'approved', ?, 'President', NOW())`,
        ['Approved Organizer', 'approved@test.com', approvedOrganizerPassword, orgRow[0].id]
      );
      console.log('✅ Approved organizer created (approved@test.com / Approved123!)');
      console.log('   Status: APPROVED');
      console.log(`   Organization: ${orgRow[0].name}`);
      console.log('   Role: President\n');
    } else {
      console.log('⚠️  No organizations found to attach approved organizer; skipping approved organizer seed');
    }

    // Step 10: Seed sample events (optional)
    console.log('🎉 Seeding sample events...');
    const seedEventsPath = path.join(__dirname, '../sql/seed_events.sql');
    if (fs.existsSync(seedEventsPath)) {
      await executeSqlFile(connection, '../sql/seed_events.sql');
      const [events] = await connection.query('SELECT COUNT(*) as count FROM events');
      console.log(`✅ ${events[0].count} sample events seeded\n`);
    } else {
      console.log('⚠️  seed_events.sql not found, skipping...\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 DATABASE RESET COMPLETE!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 Test Accounts Created:\n');
    console.log('👑 ADMIN:');
    console.log('   Email: admin@concordia.ca');
    console.log('   Password: Admin123!');
    console.log('   Role: admin\n');
    
    console.log('👨‍🎓 STUDENT:');
    console.log('   Email: student@test.com');
    console.log('   Password: Student123!');
    console.log('   Role: student\n');
    
    console.log('📝 ORGANIZER (Unapproved):');
    console.log('   Email: organizer@test.com');
    console.log('   Password: Organizer123!');
    console.log('   Role: organizer');
    console.log('   Status: NULL (can submit request)\n');
    
    console.log('✅ ORGANIZER (Approved):');
    console.log('   Email: approved@test.com');
    console.log('   Password: Approved123!');
    console.log('   Role: organizer');
    console.log('   Status: APPROVED (can create events)');
    console.log('   Organization: Concordia Tech Society\n');
    
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🚀 You can now test the application!\n');
    console.log('Frontend: http://localhost:8080');
    console.log('Backend:  http://localhost:3000\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Confirm before running
console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!\n');
console.log('Database:', DB_CONFIG.database);
console.log('Host:', DB_CONFIG.host);
console.log('User:', DB_CONFIG.user);
console.log('\nPress CTRL+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  resetDatabase();
}, 3000);
