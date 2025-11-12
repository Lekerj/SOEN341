/**
 * Database Reset Script
 * Drops all tables and reinitializes
 */

const db = require('./config/db');

const dropSQL = `
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS organizer_requests;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
`;

const createSQL = `
-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  profile_pic_url VARCHAR(500) DEFAULT 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg',
  organizer_auth_status ENUM('pending', 'approved', 'refused') DEFAULT NULL,
  organization_id INT DEFAULT NULL,
  organization_role ENUM('Member', 'Event Manager', 'Vice President', 'President') DEFAULT 'Member',
  request_date TIMESTAMP NULL DEFAULT NULL,
  approval_date TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_organizer_auth_status (organizer_auth_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category ENUM('sports', 'academic', 'social', 'club') NOT NULL DEFAULT 'social',
    is_default BOOLEAN DEFAULT FALSE,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add foreign key to users table
ALTER TABLE users ADD CONSTRAINT fk_user_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT NOT NULL,
    role ENUM('Member', 'Event Manager', 'Vice President', 'President') NOT NULL DEFAULT 'Member',
    status ENUM('active', 'pending', 'refused') NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_org (user_id, organization_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create events table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT,
    organizer_id INT,
    organization VARCHAR(100),
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255),
    capacity INT DEFAULT 100,
    price DECIMAL(10, 2) DEFAULT 0.00,
    category VARCHAR(50),
    is_flagged BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    tickets_available INT DEFAULT 0,
    INDEX idx_organizer_id (organizer_id),
    INDEX idx_event_date (event_date),
    INDEX idx_is_flagged (is_flagged),
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT,
    checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    qr_code VARCHAR(255) UNIQUE,
    ticket_type ENUM('free', 'paid') DEFAULT 'free',
    INDEX idx_event_id (event_id),
    INDEX idx_user_id (user_id),
    INDEX idx_checked_in (checked_in),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create organizer_requests table
CREATE TABLE IF NOT EXISTS organizer_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT NULL,
    request_type ENUM('join', 'create', 'organizer') NOT NULL DEFAULT 'join',
    status ENUM('pending', 'refused', 'approved') NOT NULL DEFAULT 'pending',
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_organization_id (organization_id),
    INDEX idx_status (status),
    CONSTRAINT fk_organizer_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_organizer_requests_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Insert default organization
INSERT IGNORE INTO organizations (id, name, description, category, is_default)
VALUES (1, 'ConEvents', 'Default system organization', 'social', TRUE);

-- 10. Insert sample admin user (password: admin123)
INSERT IGNORE INTO users (id, name, email, password_hash, role, organizer_auth_status)
VALUES (1, 'Admin User', 'admin@conevents.com', '$2b$10$rSh7pAt3qGrVRZXoLP3Wfel9QaXQA6JoEZoRpp8pAQpWnx3Ur.xmS', 'admin', NULL);

-- 11. Add admin to default organization
INSERT IGNORE INTO organization_members (user_id, organization_id, role, status)
VALUES (1, 1, 'President', 'active');
`;

console.log('🚀 Starting database reset...\n');

// Drop tables first
const dropStatements = dropSQL.split(';').filter(stmt => stmt.trim());
let droppedCount = 0;

const dropNext = (index) => {
  if (index >= dropStatements.length) {
    // Now create tables
    console.log('✅ All tables dropped\n');
    createTables();
    return;
  }

  const stmt = dropStatements[index].trim();
  if (!stmt) {
    dropNext(index + 1);
    return;
  }

  db.query(stmt, (err) => {
    if (err && !err.message.includes('Unknown table')) {
      console.error(`⚠️ Error dropping:`, err.message);
    }
    dropNext(index + 1);
  });
};

const createTables = () => {
  const createStatements = createSQL.split(';').filter(stmt => stmt.trim());
  let createdCount = 0;

  const createNext = (index) => {
    if (index >= createStatements.length) {
      console.log('\n✨ Database reset completed successfully!');
      console.log('\n📋 Tables created:');
      console.log('  - users');
      console.log('  - organizations');
      console.log('  - organization_members');
      console.log('  - events');
      console.log('  - tickets');
      console.log('  - organizer_requests');
      console.log('  - notifications');
      console.log('\n👤 Default Admin:');
      console.log('  Email: admin@conevents.com');
      console.log('  Password: admin123');
      process.exit(0);
      return;
    }

    const stmt = createStatements[index].trim();
    if (!stmt) {
      createNext(index + 1);
      return;
    }

    db.query(stmt, (err) => {
      if (err) {
        console.error(`❌ Error creating statement ${index + 1}:`, err.message);
      } else {
        createdCount++;
        console.log(`✅ Statement ${index + 1} created`);
      }
      createNext(index + 1);
    });
  };

  createNext(0);
};

dropNext(0);
