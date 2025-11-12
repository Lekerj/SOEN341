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
    tickets_available
) VALUES
    ('Orientation Week Kickoff', 'Meet student associations, grab swag, and enjoy live music to kick off the semester.', '2025-09-02', '18:00:00', 'John Molson Atrium', 0.00, 'social', 'Student Life Office', NULL, 300, 300),
    ('Women in Tech Panel', 'Industry leaders share insights on career growth, mentorship, and inclusive workplaces.', '2025-10-10', '16:30:00', 'EV Building 3.309', 0.00, 'academic', 'Engineering & Computer Science Association', NULL, 120, 85),
    ('Stingers Hockey Night', 'Cheer on the Concordia Stingers with a special student section and merch giveaways.', '2025-11-18', '19:30:00', 'Ed Meagher Arena', 15.00, 'sports', 'Athletics Department', NULL, 400, 250),
    ('CSI Winter Hackathon', 'A 24-hour challenge with workshops, mentors, and prizes for the top student teams.', '2025-12-02', '09:00:00', 'Hall Building 8th Floor', 10.00, 'club', 'Concordia Software Initiative', NULL, 200, 160),
    ('Art Expo', 'Student art showcase with live painting and workshops.', '2025-10-22', '14:00:00', 'EV Gallery', 5.00, 'social', 'Fine Arts Club', NULL, 100, 80),
    ('Math Olympiad', 'Competitive math event for all levels.', '2025-11-05', '10:00:00', 'Library Conference Room', 0.00, 'academic', 'Math Society', NULL, 60, 60),
    ('Basketball Finals', 'Watch the finals and support your team!', '2025-12-10', '17:00:00', 'Gymnasium', 8.00, 'sports', 'Athletics Department', NULL, 300, 150),
    ('Robotics Demo Day', 'See student-built robots in action.', '2025-11-20', '13:00:00', 'Engineering Lab', 0.00, 'club', 'Robotics Club', NULL, 80, 60),
    ('Career Fair', 'Meet employers and get career advice.', '2025-10-30', '11:00:00', 'Hall Building Lobby', 0.00, 'academic', 'Career Services', NULL, 500, 400),
    ('Halloween Bash', 'Costume contest, music, and treats.', '2025-10-31', '20:00:00', 'Student Centre', 12.00, 'social', 'Student Life Office', NULL, 250, 200),
    ('Spring Soccer Tournament', 'Annual soccer event for all skill levels.', '2026-03-15', '09:00:00', 'Outdoor Field', 7.00, 'sports', 'Athletics Department', NULL, 200, 180),
    ('Chess Masters', 'Open chess tournament with prizes.', '2025-11-25', '15:00:00', 'Library Room 101', 3.00, 'club', 'Chess Club', NULL, 40, 35),
    ('Spring Gala', 'Formal dinner and dance to celebrate the semester.', '2026-04-20', '18:30:00', 'Hotel Ballroom', 30.00, 'social', 'Student Life Office', NULL, 150, 120),
    ('Physics Colloquium', 'Guest speaker on quantum computing.', '2025-12-05', '16:00:00', 'Science Auditorium', 0.00, 'academic', 'Physics Society', NULL, 100, 90),
    ('Volleyball Open', 'Join or watch the volleyball matches.', '2025-11-12', '17:30:00', 'Gymnasium', 6.00, 'sports', 'Athletics Department', NULL, 120, 100),
    ('Coding Bootcamp', 'Intensive coding workshop for beginners.', '2025-10-18', '09:00:00', 'Computer Lab', 20.00, 'club', 'Concordia Software Initiative', NULL, 50, 45),
    ('Film Festival', 'Screenings of student films and Q&A.', '2025-11-28', '18:00:00', 'EV Cinema', 8.00, 'social', 'Film Society', NULL, 80, 70),
    ('Startup Pitch Night', 'Watch student startups pitch to judges.', '2025-12-15', '19:00:00', 'Business School Auditorium', 0.00, 'academic', 'Entrepreneurship Club', NULL, 200, 180),
    ('Yoga in the Park', 'Outdoor yoga session for all levels.', '2025-10-25', '10:00:00', 'Campus Park', 2.00, 'club', 'Wellness Club', NULL, 60, 55),
    ('Holiday Market', 'Shop local crafts and gifts.', '2025-12-08', '12:00:00', 'Student Centre', 0.00, 'social', 'Student Life Office', NULL, 100, 90),
    ('Engineering Expo', 'Showcase of student engineering projects.', '2025-11-22', '14:00:00', 'Engineering Building', 0.00, 'academic', 'Engineering & Computer Science Association', NULL, 150, 140);

-- Optional: preload a few tickets for existing users.
-- This is done via separate script to ensure proper user creation first.
-- Users can claim tickets through the normal ticket booking flow.

COMMIT;
