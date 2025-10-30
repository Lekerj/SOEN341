const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const util = require('util');
const db = require('../config/db');

const query = util.promisify(db.query).bind(db);

const users = [
  { name: 'Organizer One', email: 'organizer1@example.com', password: 'organizerPass1', role: 'organizer' },
  { name: 'Organizer Two', email: 'organizer2@example.com', password: 'organizerPass2', role: 'organizer' },
  { name: 'Organizer Three', email: 'organizer3@example.com', password: 'organizerPass3', role: 'organizer' },
  { name: 'Student One', email: 'student1@example.com', password: 'studentPass1', role: 'student' },
  { name: 'Student Two', email: 'student2@example.com', password: 'studentPass2', role: 'student' }
];

async function upsertUsers() {
  for (const u of users) {
    try {
      const hashed = await bcrypt.hash(u.password, 10);

      const rows = await query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (rows && rows.length > 0) {
        // Update password_hash and role if user exists
        await query('UPDATE users SET name = ?, password_hash = ?, role = ? WHERE email = ?', [u.name, hashed, u.role, u.email]);
        console.log(`Updated user: ${u.email}`);
      } else {
        await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [u.name, u.email, hashed, u.role]);
        console.log(`Inserted user: ${u.email}`);
      }
    } catch (err) {
      console.error('Error creating/updating user', u.email, err);
      throw err;
    }
  }
}

async function runSqlFile() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'seed_organizers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split statements by semicolon and execute them one by one.
  // This is a simple splitter and assumes the SQL file does not contain
  // complex semicolons inside strings or stored routines.
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await query(stmt);
      // console.log('Executed statement');
    } catch (err) {
      console.error('Failed to execute statement:', stmt.slice(0, 150), '...', err);
      throw err;
    }
  }
}

async function main() {
  try {
    console.log('Seeding users (organizers & students) ...');
    await upsertUsers();

    console.log('Seeding events and tickets from SQL file ...');
    await runSqlFile();

    console.log('\n✅ Seeding completed successfully.');
    console.log('\nTest credentials:');
    users.forEach(u => {
      console.log(`  ${u.email}  | password: ${u.password}  | role: ${u.role}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
}

main();
