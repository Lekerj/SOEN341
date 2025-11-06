-- =============================================
-- Seed Admin User
-- =============================================
-- This file creates a default admin user for the system.
-- Admin users should NOT be created through the registration form.
-- 
-- Default Admin Credentials:
--   Email: admin@concordia.ca
--   Password: Admin123!
--
-- IMPORTANT: Change the password after first login in production!
-- =============================================

-- Insert default admin user
-- Password hash for 'Admin123!' (bcrypt with salt rounds = 10)
INSERT INTO users (name, email, password, role, organizer_auth_status) 
VALUES (
    'System Administrator',
    'admin@concordia.ca',
    '$2b$10$rVZ8YZH5z5xqJ9xQ9GvFu.8KGZ8YZH5z5xqJ9xQ9GvFu.8KGZ8YZH',  -- This is a placeholder - will be replaced by backend
    'admin',
    NULL
)
ON DUPLICATE KEY UPDATE 
    name = 'System Administrator',
    role = 'admin';

-- Note: The actual password hash should be generated using bcrypt
-- You can generate it by running this in Node.js:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('Admin123!', 10);
-- console.log(hash);
