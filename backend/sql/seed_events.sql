-- Seed data for events and related tickets.
-- Run after creating tables defined in events_table.sql and tickets_table.sql.

START TRANSACTION;

-- Clear existing data for a clean reload.
DELETE FROM tickets;
DELETE FROM events;

-- Reset auto-increment counters (optional, keeps IDs predictable in dev).
ALTER TABLE events AUTO_INCREMENT = 1;
ALTER TABLE tickets AUTO_INCREMENT = 1;

-- Populate a representative set of events that exercises all filters.
INSERT INTO events (
    title,
    description,
    event_date,
    event_time,
    location,
    price,
    category,
    organization,
    organizer_id,
    capacity,
    tickets_available,
    image_url,
    moderation_status,
    moderation_notes
) VALUES
    ('Orientation Week Kickoff', 'Meet student associations, grab swag, and enjoy live music to kick off the semester.', '2025-09-02', '18:00:00', 'John Molson Atrium', 0.00, 'social', 'Student Life Office', NULL, 300, 300, 'https://example.com/images/orientation.jpg', 'approved', NULL),
    ('Women in Tech Panel', 'Industry leaders share insights on career growth, mentorship, and inclusive workplaces.', '2025-10-10', '16:30:00', 'EV Building 3.309', 0.00, 'academic', 'Engineering & Computer Science Association', NULL, 120, 85, 'https://example.com/images/women-in-tech.jpg', 'approved', NULL),
    ('Stingers Hockey Night', 'Cheer on the Concordia Stingers with a special student section and merch giveaways.', '2025-11-18', '19:30:00', 'Ed Meagher Arena', 15.00, 'sports', 'Athletics Department', NULL, 400, 250, 'https://example.com/images/stingers-hockey.jpg', 'approved', NULL),
    ('CSI Winter Hackathon', 'A 24-hour challenge with workshops, mentors, and prizes for the top student teams.', '2025-12-02', '09:00:00', 'Hall Building 8th Floor', 10.00, 'club', 'Concordia Software Initiative', NULL, 200, 160, 'https://example.com/images/winter-hackathon.jpg', 'approved', NULL),
    ('Art Expo', 'Student art showcase with live painting and workshops.', '2025-10-22', '14:00:00', 'EV Gallery', 5.00, 'social', 'Fine Arts Club', NULL, 100, 80, 'https://example.com/images/art-expo.jpg', 'approved', NULL),
    ('Math Olympiad', 'Competitive math event for all levels.', '2025-11-05', '10:00:00', 'Library Conference Room', 0.00, 'academic', 'Math Society', NULL, 60, 60, 'https://example.com/images/math-olympiad.jpg', 'approved', NULL),
    ('Basketball Finals', 'Watch the finals and support your team!', '2025-12-10', '17:00:00', 'Gymnasium', 8.00, 'sports', 'Athletics Department', NULL, 300, 150, 'https://example.com/images/basketball-finals.jpg', 'approved', NULL),
    ('Robotics Demo Day', 'See student-built robots in action.', '2025-11-20', '13:00:00', 'Engineering Lab', 0.00, 'club', 'Robotics Club', NULL, 80, 60, 'https://example.com/images/robotics-demo.jpg', 'approved', NULL),
    ('Career Fair', 'Meet employers and get career advice.', '2025-10-30', '11:00:00', 'Hall Building Lobby', 0.00, 'academic', 'Career Services', NULL, 500, 400, 'https://example.com/images/career-fair.jpg', 'approved', NULL),
    ('Halloween Bash', 'Costume contest, music, and treats.', '2025-10-31', '20:00:00', 'Student Centre', 12.00, 'social', 'Student Life Office', NULL, 250, 200, 'https://example.com/images/halloween-bash.jpg', 'approved', NULL),
    ('Spring Soccer Tournament', 'Annual soccer event for all skill levels.', '2026-03-15', '09:00:00', 'Outdoor Field', 7.00, 'sports', 'Athletics Department', NULL, 200, 180, 'https://example.com/images/soccer-tournament.jpg', 'approved', NULL),
    ('Chess Masters', 'Open chess tournament with prizes.', '2025-11-25', '15:00:00', 'Library Room 101', 3.00, 'club', 'Chess Club', NULL, 40, 35, 'https://example.com/images/chess-masters.jpg', 'approved', NULL),
    ('Spring Gala', 'Formal dinner and dance to celebrate the semester.', '2026-04-20', '18:30:00', 'Hotel Ballroom', 30.00, 'social', 'Student Life Office', NULL, 150, 120, 'https://example.com/images/spring-gala.jpg', 'approved', NULL),
    ('Physics Colloquium', 'Guest speaker on quantum computing.', '2025-12-05', '16:00:00', 'Science Auditorium', 0.00, 'academic', 'Physics Society', NULL, 100, 90, 'https://example.com/images/physics-colloquium.jpg', 'approved', NULL),
    ('Volleyball Open', 'Join or watch the volleyball matches.', '2025-11-12', '17:30:00', 'Gymnasium', 6.00, 'sports', 'Athletics Department', NULL, 120, 100, 'https://example.com/images/volleyball-open.jpg', 'approved', NULL),
    ('Coding Bootcamp', 'Intensive coding workshop for beginners.', '2025-10-18', '09:00:00', 'Computer Lab', 20.00, 'club', 'Concordia Software Initiative', NULL, 50, 45, 'https://example.com/images/coding-bootcamp.jpg', 'approved', NULL),
    ('Film Festival', 'Screenings of student films and Q&A.', '2025-11-28', '18:00:00', 'EV Cinema', 8.00, 'social', 'Film Society', NULL, 80, 70, 'https://example.com/images/film-festival.jpg', 'approved', NULL),
    ('Startup Pitch Night', 'Watch student startups pitch to judges.', '2025-12-15', '19:00:00', 'Business School Auditorium', 0.00, 'academic', 'Entrepreneurship Club', NULL, 200, 180, 'https://example.com/images/startup-pitch.jpg', 'approved', NULL),
    ('Yoga in the Park', 'Outdoor yoga session for all levels.', '2025-10-25', '10:00:00', 'Campus Park', 2.00, 'club', 'Wellness Club', NULL, 60, 55, 'https://example.com/images/yoga-park.jpg', 'approved', NULL),
    ('Holiday Market', 'Shop local crafts and gifts.', '2025-12-08', '12:00:00', 'Student Centre', 0.00, 'social', 'Student Life Office', NULL, 100, 90, 'https://example.com/images/holiday-market.jpg', 'approved', NULL),
    ('Engineering Expo', 'Showcase of student engineering projects.', '2025-11-22', '14:00:00', 'Engineering Building', 0.00, 'academic', 'Engineering & Computer Science Association', NULL, 150, 140, 'https://example.com/images/engineering-expo.jpg', 'approved', NULL);

-- Optional: preload a few tickets for existing users.
-- Update the email list to match accounts in your users table. If none match, the INSERT simply affects zero rows.
INSERT INTO tickets (user_id, event_id, ticket_type, qr_code, checked_in)
SELECT u.id, e.id, 'free', CONCAT('QR-', e.id, '-', u.id), FALSE
FROM users u
JOIN events e ON e.title = 'Orientation Week Kickoff'
WHERE u.email IN ('alice@example.com', 'bob@example.com');

COMMIT;
