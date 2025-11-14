-- Seed data for reviews, questions, and answers tables
-- Run this AFTER setup-database.sql and AFTER you have at least 2 users and 1 event
-- This provides sample data for testing the Reviews & Q&A feature

-- Sample Reviews (adjust user_id, event_id, organizer_id based on your existing data)
-- Note: The unique constraint prevents duplicate reviews per user/event
INSERT IGNORE INTO reviews (user_id, event_id, organizer_id, rating, title, content, category, helpful_count) VALUES
(2, 1, 1, 5, 'Outstanding Event!', 'The event was well-organized and exceeded all expectations. The venue was perfect and the activities were engaging.', 'venue', 12),
(3, 1, 1, 4, 'Great Experience', 'Really enjoyed the event. Only minor issue was the parking situation, but overall a fantastic time.', 'logistics', 8),
(4, 1, 1, 5, 'Highly Recommended', 'Best event I have attended this year. The organizer was professional and responsive to questions.', 'organization', 15),
(2, 2, 1, 3, 'Good but could be better', 'The event was decent but the timing was inconvenient. Would attend again if scheduled differently.', 'scheduling', 3);

-- Sample Questions
INSERT INTO questions (user_id, event_id, organizer_id, title, content, is_answered, helpful_count) VALUES
(2, 1, 1, 'What should I bring?', 'I am planning to attend this event. What items should I bring with me? Is there a dress code?', TRUE, 5),
(3, 1, 1, 'Parking availability?', 'Is there parking available at the venue? If so, is it free or paid?', TRUE, 8),
(4, 1, 1, 'Food options?', 'Will there be food and drinks available at the event? Any vegetarian options?', FALSE, 2),
(2, 2, 1, 'Refund policy?', 'If I am unable to attend, what is the refund policy for tickets?', TRUE, 10);

-- Sample Answers (linked to questions above)
-- Adjust question_id based on actual IDs generated
INSERT INTO answers (question_id, user_id, content, is_official_organizer_response, helpful_count) VALUES
-- Answers to question 1 (What should I bring?)
(1, 1, 'Great question! Please bring your ticket (digital or printed), a valid ID, and comfortable clothing. Business casual attire is recommended but not required.', TRUE, 12),
(1, 3, 'I went last year and bringing a water bottle was helpful!', FALSE, 4),

-- Answers to question 2 (Parking availability?)
(2, 1, 'Yes, we have a dedicated parking lot with 200 spaces. Parking is free for all attendees. Please arrive early as spots fill up quickly.', TRUE, 15),
(2, 4, 'There is also street parking nearby if the lot is full.', FALSE, 2),

-- Answer to question 4 (Refund policy?)
(4, 1, 'Our refund policy allows full refunds up to 48 hours before the event. After that, we can offer a 50% refund or transfer your ticket to another attendee. Please email us at support@conevents.com.', TRUE, 8);

-- Update average_rating for organizer (user_id = 1) based on the sample reviews
-- This calculates: (5 + 4 + 5 + 3) / 4 = 4.25
UPDATE users
SET average_rating = (
    SELECT ROUND(AVG(rating), 2)
    FROM reviews
    WHERE organizer_id = 1
)
WHERE id = 1;

-- Mark questions as answered if they have official organizer responses
UPDATE questions q
SET is_answered = TRUE
WHERE EXISTS (
    SELECT 1 FROM answers a
    WHERE a.question_id = q.id
    AND a.is_official_organizer_response = TRUE
);

-- Confirmation
SELECT 'Successfully seeded sample reviews, questions, and answers' AS status;
SELECT CONCAT('Organizer average rating updated to: ', COALESCE(average_rating, 'N/A')) AS rating_update FROM users WHERE id = 1;
