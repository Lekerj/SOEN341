/**
 * Test Data Seeding Script
 * Creates organizations, users, and events for testing
 */

const db = require('./config/db');
const bcrypt = require('bcrypt');

console.log('🌱 Starting test data seeding...\n');

// Hash password helper
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Test data
const testData = async () => {
  try {
    // 1. Create Organizations
    console.log('📦 Creating organizations...');
    const orgs = [
      { name: 'Sports Club', category: 'sports', description: 'University Sports Events' },
      { name: 'Math Society', category: 'academic', description: 'Mathematics Events and Workshops' },
      { name: 'Social Committee', category: 'social', description: 'Social Gatherings and Parties' },
      { name: 'Gaming Club', category: 'club', description: 'Video Gaming and Esports' }
    ];

    for (const org of orgs) {
      await new Promise((resolve, reject) => {
        db.query(
          'INSERT IGNORE INTO organizations (name, category, description) VALUES (?, ?, ?)',
          [org.name, org.category, org.description],
          (err) => {
            if (err) reject(err);
            else {
              console.log(`  ✅ Created: ${org.name}`);
              resolve();
            }
          }
        );
      });
    }

    // 2. Create Test Users
    console.log('\n👥 Creating test users...');
    const users = [
      { name: 'John Organizer', email: 'john@test.com', password: 'password123', role: 'organizer' },
      { name: 'Jane Organizer', email: 'jane@test.com', password: 'password123', role: 'organizer' },
      { name: 'Mike Student', email: 'mike@test.com', password: 'password123', role: 'student' },
      { name: 'Sarah Student', email: 'sarah@test.com', password: 'password123', role: 'student' },
      { name: 'Tom Organizer', email: 'tom@test.com', password: 'password123', role: 'organizer' }
    ];

    const userIds = {};

    for (const user of users) {
      const hashedPassword = await hashPassword(user.password);
      await new Promise((resolve, reject) => {
        db.query(
          'INSERT IGNORE INTO users (name, email, password_hash, role, organizer_auth_status) VALUES (?, ?, ?, ?, ?)',
          [user.name, user.email, hashedPassword, user.role, user.role === 'organizer' ? 'approved' : null],
          (err, result) => {
            if (err) reject(err);
            else {
              userIds[user.email] = result.insertId;
              console.log(`  ✅ Created: ${user.name} (${user.email})`);
              resolve();
            }
          }
        );
      });
    }

    // 3. Assign users to organizations
    console.log('\n🔗 Linking users to organizations...');
    const assignments = [
      { email: 'john@test.com', org: 'Sports Club', role: 'President' },
      { email: 'jane@test.com', org: 'Math Society', role: 'President' },
      { email: 'tom@test.com', org: 'Gaming Club', role: 'Vice President' },
      { email: 'mike@test.com', org: 'Social Committee', role: 'Member' },
      { email: 'sarah@test.com', org: 'Sports Club', role: 'Member' }
    ];

    for (const assignment of assignments) {
      await new Promise((resolve, reject) => {
        // Get organization ID
        db.query('SELECT id FROM organizations WHERE name = ?', [assignment.org], (err, results) => {
          if (err) reject(err);
          const orgId = results[0].id;

          // Insert membership
          db.query(
            'INSERT IGNORE INTO organization_members (user_id, organization_id, role, status) VALUES (?, ?, ?, ?)',
            [userIds[assignment.email], orgId, assignment.role, 'active'],
            (err) => {
              if (err) reject(err);
              else {
                console.log(`  ✅ Assigned ${assignment.email} to ${assignment.org} as ${assignment.role}`);
                resolve();
              }
            }
          );
        });
      });
    }

    // 4. Create Test Events
    console.log('\n🎪 Creating test events...');
    const events = [
      {
        organizer_email: 'john@test.com',
        org_name: 'Sports Club',
        title: 'Basketball Tournament',
        description: 'Annual basketball tournament for all students',
        category: 'sports',
        event_date: '2025-11-20',
        event_time: '10:00:00',
        location: 'Sports Arena',
        capacity: 50,
        price: 5.00
      },
      {
        organizer_email: 'john@test.com',
        org_name: 'Sports Club',
        title: 'Soccer Friendly Match',
        description: 'Friendly soccer match between departments',
        category: 'sports',
        event_date: '2025-11-15',
        event_time: '14:00:00',
        location: 'Football Field',
        capacity: 100,
        price: 0.00
      },
      {
        organizer_email: 'jane@test.com',
        org_name: 'Math Society',
        title: 'Calculus Workshop',
        description: 'Advanced calculus techniques and problem solving',
        category: 'academic',
        event_date: '2025-11-18',
        event_time: '15:00:00',
        location: 'Science Building Room 101',
        capacity: 30,
        price: 0.00
      },
      {
        organizer_email: 'jane@test.com',
        org_name: 'Math Society',
        title: 'Linear Algebra Seminar',
        description: 'Applications of linear algebra in real world',
        category: 'academic',
        event_date: '2025-11-22',
        event_time: '13:00:00',
        location: 'Library Auditorium',
        capacity: 40,
        price: 0.00
      },
      {
        organizer_email: 'tom@test.com',
        org_name: 'Gaming Club',
        title: 'Gaming Night Tournament',
        description: 'Competitive gaming tournament with prizes',
        category: 'club',
        event_date: '2025-11-17',
        event_time: '18:00:00',
        location: 'Game Lounge',
        capacity: 20,
        price: 10.00
      },
      {
        organizer_email: 'tom@test.com',
        org_name: 'Gaming Club',
        title: 'Retro Gaming Night',
        description: 'Classic games from the 80s and 90s',
        category: 'club',
        event_date: '2025-11-25',
        event_time: '19:00:00',
        location: 'Game Lounge',
        capacity: 25,
        price: 5.00
      },
      {
        organizer_email: 'admin@conevents.com',
        org_name: 'Social Committee',
        title: 'Campus Welcome Party',
        description: 'Meet and greet for new and returning students',
        category: 'social',
        event_date: '2025-11-16',
        event_time: '20:00:00',
        location: 'Student Center',
        capacity: 200,
        price: 0.00
      },
      {
        organizer_email: 'admin@conevents.com',
        org_name: 'Social Committee',
        title: 'Movie Night',
        description: 'Community movie screening',
        category: 'social',
        event_date: '2025-11-23',
        event_time: '19:00:00',
        location: 'Outdoor Lawn',
        capacity: 150,
        price: 2.00
      }
    ];

    for (const event of events) {
      // Get organizer ID
      await new Promise((resolve, reject) => {
        db.query('SELECT id FROM users WHERE email = ?', [event.organizer_email], (err, results) => {
          if (err) reject(err);
          const organizerId = results[0]?.id || 1; // Default to admin if not found

          db.query(
            `INSERT INTO events (organizer_id, organization, title, description, category, event_date, event_time, location, capacity, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [organizerId, event.org_name, event.title, event.description, event.category, event.event_date, event.event_time, event.location, event.capacity, event.price],
            (err) => {
              if (err) reject(err);
              else {
                console.log(`  ✅ Created: ${event.title}`);
                resolve();
              }
            }
          );
        });
      });
    }

    // 5. Create some test tickets
    console.log('\n🎫 Creating test tickets...');

    const ticketAssignments = [
      { event: 'Basketball Tournament', count: 20 },
      { event: 'Soccer Friendly Match', count: 45 },
      { event: 'Calculus Workshop', count: 15 },
      { event: 'Gaming Night Tournament', count: 18 },
      { event: 'Campus Welcome Party', count: 120 },
      { event: 'Movie Night', count: 85 }
    ];

    for (const assignment of ticketAssignments) {
      await new Promise((resolve, reject) => {
        db.query('SELECT id FROM events WHERE title = ? LIMIT 1', [assignment.event], (err, results) => {
          if (err) reject(err);
          const eventId = results[0]?.id;

          // Create tickets for this event
          let inserted = 0;
          for (let i = 1; i <= assignment.count; i++) {
            const studentEmail = ['mike@test.com', 'sarah@test.com'][Math.floor(Math.random() * 2)];
            db.query(
              'SELECT id FROM users WHERE email = ?',
              [studentEmail],
              (err2, userResults) => {
                if (!err2 && userResults.length > 0) {
                  const userId = userResults[0].id;
                  const checkedIn = Math.random() > 0.5; // Randomly check in some tickets

                  db.query(
                    'INSERT INTO tickets (event_id, user_id, checked_in) VALUES (?, ?, ?)',
                    [eventId, userId, checkedIn],
                    () => {
                      inserted++;
                      if (inserted === assignment.count) {
                        console.log(`  ✅ Created ${assignment.count} tickets for ${assignment.event}`);
                        resolve();
                      }
                    }
                  );
                }
              }
            );
          }
          if (assignment.count === 0) resolve();
        });
      });
    }

    console.log('\n✨ Test data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - Organizations: 4');
    console.log('  - Users: 5 (1 admin + 3 organizers + 1 student)');
    console.log('  - Organization Memberships: 5');
    console.log('  - Events: 8');
    console.log('  - Tickets: 283\n');

    console.log('🧪 Test Accounts:');
    console.log('  Admin:     admin@conevents.com / admin123');
    console.log('  Organizer: john@test.com / password123');
    console.log('  Organizer: jane@test.com / password123');
    console.log('  Organizer: tom@test.com / password123');
    console.log('  Student:   mike@test.com / password123');
    console.log('  Student:   sarah@test.com / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run seeding
testData();
