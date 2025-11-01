-- seed_organizers.sql
--
-- Seed data for organizers, events and tickets used in tests.
--
-- Instructions:
-- 1. Run `node backend/scripts/seed_organizers.js` to create organizer and student users
--    with bcrypt-hashed passwords, then execute the SQL statements below to create events
--    and tickets. The Node script reads this SQL file and runs it after creating users.
-- 2. Test credentials (plaintext) -- these are created by the Node script:
--    Organizers:
--      organizer1@example.com  | password: organizerPass1
--      organizer2@example.com  | password: organizerPass2
--      organizer3@example.com  | password: organizerPass3
--    Students (for tickets):
--      student1@example.com    | password: studentPass1
--      student2@example.com    | password: studentPass2
--
-- Notes / assumptions:
-- - The `users` table stores bcrypt hashes in `password_hash`. This SQL file does not
--   attempt to generate bcrypt hashes itself. Use the accompanying Node script to create
--   users so passwords are hashed correctly.
-- - The SQL below uses subqueries (SELECT id FROM users WHERE email=...) to look up
--   organizer and user IDs. Ensure users exist before running this SQL.

-- =====================================================
-- Events
-- =====================================================

-- 1) Past paid event (sold out)
INSERT INTO events (title, description, event_date, event_time, location, price, category, organization, organizer_id, capacity, tickets_available, image_url)
VALUES (
  'Campus Music Night',
  'A lively music night featuring student bands.',
  DATE_SUB(CURDATE(), INTERVAL 10 DAY),
  '19:00:00',
  'Main Quad',
  15.00,
  'social',
  'Music Club',
  (SELECT id FROM users WHERE email = 'organizer1@example.com'),
  100,
  0,
  NULL
);

-- 2) Present free event (partially sold)
INSERT INTO events (title, description, event_date, event_time, location, price, category, organization, organizer_id, capacity, tickets_available, image_url)
VALUES (
  'Tech Talk: AI',
  'An introductory talk on AI applications for students.',
  CURDATE(),
  '15:00:00',
  'Engineering Auditorium',
  0.00,
  'academic',
  'CS Club',
  (SELECT id FROM users WHERE email = 'organizer1@example.com'),
  200,
  50,
  NULL
);

-- 3) Future paid event (no tickets sold yet)
INSERT INTO events (title, description, event_date, event_time, location, price, category, organization, organizer_id, capacity, tickets_available, image_url)
VALUES (
  'Charity Run',
  '5K charity run to raise funds for local causes.',
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  '09:00:00',
  'City Park',
  25.00,
  'social',
  'Sports Council',
  (SELECT id FROM users WHERE email = 'organizer2@example.com'),
  50,
  50,
  NULL
);

-- 4) Future free small-capacity event (some tickets sold)
INSERT INTO events (title, description, event_date, event_time, location, price, category, organization, organizer_id, capacity, tickets_available, image_url)
VALUES (
  'Student Club Meeting',
  'Weekly meeting for the student-run club.',
  DATE_ADD(CURDATE(), INTERVAL 7 DAY),
  '18:00:00',
  'Room 210, Student Center',
  0.00,
  'club',
  'Chess Club',
  (SELECT id FROM users WHERE email = 'organizer1@example.com'),
  30,
  5,
  NULL
);

-- =====================================================
-- Tickets
-- =====================================================

-- Tickets for 'Campus Music Night' (past, sold out) - two sample tickets
INSERT INTO tickets (user_id, event_id, ticket_type, qr_code, purchaser_name, purchaser_email, checked_in)
VALUES
((SELECT id FROM users WHERE email = 'student1@example.com'), (SELECT id FROM events WHERE title = 'Campus Music Night' LIMIT 1), 'paid', 'QR-CM-0001', 'Student One', 'student1@example.com', TRUE),
((SELECT id FROM users WHERE email = 'student2@example.com'), (SELECT id FROM events WHERE title = 'Campus Music Night' LIMIT 1), 'paid', 'QR-CM-0002', 'Student Two', 'student2@example.com', FALSE);

-- Tickets for 'Tech Talk: AI' (present, partially sold)
INSERT INTO tickets (user_id, event_id, ticket_type, qr_code, purchaser_name, purchaser_email, checked_in)
VALUES
((SELECT id FROM users WHERE email = 'student1@example.com'), (SELECT id FROM events WHERE title = 'Tech Talk: AI' LIMIT 1), 'free', 'QR-TT-0001', 'Student One', 'student1@example.com', FALSE),
((SELECT id FROM users WHERE email = 'student2@example.com'), (SELECT id FROM events WHERE title = 'Tech Talk: AI' LIMIT 1), 'free', 'QR-TT-0002', 'Student Two', 'student2@example.com', FALSE);

-- Ticket for 'Student Club Meeting' (future, some tickets sold) - checked in sample
INSERT INTO tickets (user_id, event_id, ticket_type, qr_code, purchaser_name, purchaser_email, checked_in)
VALUES
((SELECT id FROM users WHERE email = 'student2@example.com'), (SELECT id FROM events WHERE title = 'Student Club Meeting' LIMIT 1), 'free', 'QR-SC-0001', 'Student Two', 'student2@example.com', TRUE);

-- =====================================================
-- End of seed file
-- =====================================================
