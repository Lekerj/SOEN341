-- SQL schema for users table (for MySQL)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  profile_pic_url VARCHAR(500) DEFAULT 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg' COMMENT 'URL to user profile picture',
  average_rating DECIMAL(3,2) NULL COMMENT 'Average rating for user when acting as organizer (calculated from reviews)',
  organizer_auth_status ENUM('pending', 'approved', 'refused') DEFAULT NULL,
  organization_id INT DEFAULT NULL,
  organization_role ENUM('Member', 'Event Manager', 'Vice President', 'President') DEFAULT 'Member',
  request_date TIMESTAMP NULL DEFAULT NULL,
  approval_date TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_organizer_auth_status (organizer_auth_status),
  INDEX idx_average_rating (average_rating),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- To set a default profile picture, you can update user records after creation, e.g.:
  -- UPDATE users SET profile_pic_url = '/images/default-profile.png' WHERE profile_pic_url IS NULL;
  -- Recommended: Store profile pictures and event images in /backend/public/images/
  -- Use relative paths like '/images/profile123.png' or '/images/event456.png' in the database.
;