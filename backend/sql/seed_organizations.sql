-- Seed data for default organizations
-- Concordia University Montreal inspired organizations

INSERT INTO organizations (name, description, category, is_default) VALUES
-- SPORTS
('Concordia Stingers Athletics', 'Official varsity sports teams', 'sports', TRUE),
('Intramural Sports Council', 'Recreational sports leagues and tournaments', 'sports', TRUE),
('Recreation & Athletics', 'Campus recreation and fitness programs', 'sports', TRUE),
('Concordia Cycling Club', 'Cycling rides and bike advocacy', 'sports', TRUE),
('Basketball Club', 'Basketball leagues and pick-up games', 'sports', TRUE),

-- ACADEMIC
('Computer Science & Software Engineering Student Association', 'CS and Software Engineering student support', 'academic', TRUE),
('Engineering & Computer Science Association', 'ENCS student representation and workshops', 'academic', TRUE),
('Science College Student Association', 'Science faculty academic support', 'academic', TRUE),
('Business Technology Management Association', 'Business and tech networking events', 'academic', TRUE),
('Mathematics & Statistics Student Association', 'Math and stats academic resources', 'academic', TRUE),

-- SOCIAL
('Concordia Student Union', 'Main undergraduate student union', 'social', TRUE),
('International Students Association', 'International student support and cultural events', 'social', TRUE),
('Student Life & Engagement', 'Campus-wide social events and community building', 'social', TRUE),
('Graduate Students Association', 'Graduate student representation', 'social', TRUE),
('Pride Concordia', 'LGBTQ+ student support and events', 'social', TRUE),

-- CLUB
('Concordia Debate Society', 'Competitive debating and public speaking', 'club', TRUE),
('Film Production Club', 'Student filmmaking and screenings', 'club', TRUE),
('Photography Club', 'Photo walks and exhibitions', 'club', TRUE),
('Music Club', 'Live music and jam sessions', 'club', TRUE),
('Drama & Theatre Club', 'Student theatre productions', 'club', TRUE),
('Entrepreneurship Club', 'Startup pitches and business workshops', 'club', TRUE),
('Chess Club', 'Chess tournaments and teaching', 'club', TRUE),
('Gaming Society', 'Video game tournaments and board game nights', 'club', TRUE),
('Robotics & Maker Club', 'Robot building and tech projects', 'club', TRUE),
('Environmental Action Committee', 'Sustainability and environmental awareness', 'club', TRUE);
