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
    image_url
) VALUES
    (
        'Orientation Week Kickoff',
        'Meet student associations, grab swag, and enjoy live music to kick off the semester.',
        '2025-09-02',
        '18:00:00',
        'John Molson Atrium',
        0.00,
        'social',
        'Student Life Office',
        NULL,
        300,
        300,
        'https://example.com/images/orientation.jpg'
    ),
    (
        'Women in Tech Panel',
        'Industry leaders share insights on career growth, mentorship, and inclusive workplaces.',
        '2025-10-10',
        '16:30:00',
        'EV Building 3.309',
        0.00,
        'academic',
        'Engineering & Computer Science Association',
        NULL,
        120,
        85,
        'https://example.com/images/women-in-tech.jpg'
    ),
    (
        'Stingers Hockey Night',
        'Cheer on the Concordia Stingers with a special student section and merch giveaways.',
        '2025-11-18',
        '19:30:00',
        'Ed Meagher Arena',
        15.00,
        'sports',
        'Athletics Department',
        NULL,
        400,
        250,
        'https://example.com/images/stingers-hockey.jpg'
    ),
    (
        'CSI Winter Hackathon',
        'A 24-hour challenge with workshops, mentors, and prizes for the top student teams.',
        '2025-12-02',
        '09:00:00',
        'Hall Building 8th Floor',
        10.00,
        'club',
        'Concordia Software Initiative',
        NULL,
        200,
        160,
        'https://example.com/images/winter-hackathon.jpg'
    );

-- Optional: preload a few tickets for existing users.
-- Update the email list to match accounts in your users table. If none match, the INSERT simply affects zero rows.
INSERT INTO tickets (user_id, event_id, ticket_type, qr_code, checked_in)
SELECT u.id, e.id, 'free', CONCAT('QR-', e.id, '-', u.id), FALSE
FROM users u
JOIN events e ON e.title = 'Orientation Week Kickoff'
WHERE u.email IN ('alice@example.com', 'bob@example.com');

COMMIT;
