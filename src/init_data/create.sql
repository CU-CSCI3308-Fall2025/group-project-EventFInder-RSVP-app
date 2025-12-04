CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS custom_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    organizer_id INTEGER REFERENCES users(id) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_rsvp (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    event_id INTEGER REFERENCES custom_events(id) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rsvps (
    rsvp_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    event_id VARCHAR(255),
    event_name VARCHAR(255),
    event_location VARCHAR(255),
    event_date TIMESTAMP,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    guests INTEGER DEFAULT 1 CHECK (guests > 0),
    notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, password) VALUES
('John Doe', 'john.doe@example.com', '$2a$10$YourHashedPasswordHere1'),
('Jane Smith', 'jane.smith@example.com', '$2a$10$YourHashedPasswordHere2'),
('Mike Johnson', 'mike.johnson@example.com', '$2a$10$YourHashedPasswordHere3'),
('Sarah Williams', 'sarah.williams@example.com', '$2a$10$YourHashedPasswordHere4'),
('Emily Brown', 'emily.brown@example.com', '$2a$10$YourHashedPasswordHere5')
ON CONFLICT (email) DO NOTHING;

-- Insert sample events
INSERT INTO custom_events (title, description, location, start_time, end_time, organizer_id, image_url) VALUES
(
    'Tech Conference 2024',
    'Join us for the biggest tech conference of the year! Featuring keynote speakers from leading tech companies, workshops on cutting-edge technologies, and networking opportunities with industry professionals.',
    'Convention Center, Downtown',
    '2024-06-15 09:00:00',
    '2024-06-15 18:00:00',
    1,
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
),
(
    'Summer Music Festival',
    'Experience an unforgettable outdoor music festival featuring local and international artists across multiple genres. Food trucks, art installations, and family-friendly activities available.',
    'Central Park Amphitheater',
    '2024-07-20 14:00:00',
    '2024-07-20 23:00:00',
    2,
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800'
),
(
    'Startup Pitch Night',
    'Watch innovative startups pitch their ideas to a panel of experienced investors. Network with entrepreneurs, investors, and fellow innovators. Open bar and appetizers provided.',
    'Innovation Hub, 5th Floor',
    '2024-05-10 18:30:00',
    '2024-05-10 21:30:00',
    1,
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800'
),
(
    'Community Food Drive',
    'Help us make a difference in our community! Volunteer to sort and pack food donations for local families in need. All ages welcome. Light refreshments provided.',
    'Community Center, Main Street',
    '2024-05-25 10:00:00',
    '2024-05-25 15:00:00',
    3,
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800'
),
(
    'Photography Workshop',
    'Learn professional photography techniques from award-winning photographer. Covers composition, lighting, and post-processing. Bring your camera (DSLR or mirrorless recommended).',
    'Art Studio Gallery, West End',
    '2024-06-05 13:00:00',
    '2024-06-05 17:00:00',
    4,
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800'
),
(
    'Marathon Training Kickoff',
    'Join our marathon training group for the first session! All fitness levels welcome. Professional trainers will assess your current level and help create a personalized training plan.',
    'City Sports Complex',
    '2024-05-18 07:00:00',
    '2024-05-18 09:00:00',
    2,
    'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800'
),
(
    'Book Club Meeting: Sci-Fi Edition',
    'Monthly book club discussion focusing on science fiction classics and contemporary works. This month: "The Three-Body Problem". Coffee and snacks provided.',
    'Downtown Library, Reading Room',
    '2024-05-28 19:00:00',
    '2024-05-28 21:00:00',
    5,
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800'
),
(
    'Coding Bootcamp Open House',
    'Explore our intensive 12-week coding bootcamp. Meet instructors, tour facilities, and learn about curriculum. Free coding challenge for attendees with prizes!',
    'Tech Education Center',
    '2024-06-01 10:00:00',
    '2024-06-01 14:00:00',
    1,
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'
),
(
    'Farmers Market Opening Day',
    'Celebrate the opening of our seasonal farmers market! Fresh produce, handmade crafts, live music, and cooking demonstrations. Family-friendly event.',
    'Town Square',
    '2024-05-22 08:00:00',
    '2024-05-22 13:00:00',
    3,
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800'
),
(
    'Virtual Reality Gaming Tournament',
    'Compete in the ultimate VR gaming tournament! Multiple game categories, prizes for winners, and the latest VR equipment available to try. Registration required.',
    'GameZone Arena',
    '2024-06-08 15:00:00',
    '2024-06-08 22:00:00',
    4,
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800'
),
(
    'Yoga in the Park',
    'Free outdoor yoga session suitable for all levels. Bring your own mat and water. Enjoy the peaceful morning atmosphere and connect with nature.',
    'Riverside Park, East Pavilion',
    '2024-05-20 08:00:00',
    '2024-05-20 09:30:00',
    2,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'
),
(
    'Career Fair 2024',
    'Meet with representatives from over 50 companies hiring in technology, healthcare, finance, and more. Bring copies of your resume and dress professionally.',
    'University Conference Hall',
    '2024-06-12 11:00:00',
    '2024-06-12 16:00:00',
    1,
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'
),
(
    'Wine Tasting Evening',
    'Sample exquisite wines from around the world guided by our expert sommelier. Paired with artisanal cheeses and gourmet appetizers. 21+ event.',
    'Vineyard Restaurant & Bar',
    '2024-06-18 19:00:00',
    '2024-06-18 22:00:00',
    5,
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'
),
(
    'Kids Science Fair',
    'Young scientists showcase their innovative projects! Interactive demonstrations, hands-on activities, and awards ceremony. Great family event.',
    'Elementary School Gymnasium',
    '2024-05-30 14:00:00',
    '2024-05-30 17:00:00',
    3,
    'https://images.unsplash.com/photo-1567168539593-59673ababaae?w=800'
),
(
    'Jazz Night at the Lounge',
    'Enjoy smooth jazz performed by talented local musicians in an intimate setting. Full dinner and cocktail menu available. Reservations recommended.',
    'Blue Note Lounge',
    '2024-06-22 20:00:00',
    '2024-06-22 23:30:00',
    4,
    'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800'
);
