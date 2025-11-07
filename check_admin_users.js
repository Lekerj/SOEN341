const pool = require('./backend/config/db');

pool.query(
  "SELECT id, name, email, role, organizer_auth_status FROM users LIMIT 20",
  (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      process.exit(1);
    }

    console.log("\n=== ALL USERS IN DATABASE ===\n");
    console.log(JSON.stringify(rows, null, 2));

    const adminUsers = rows.filter(u => u.role === 'admin');
    console.log("\n=== ADMIN USERS ONLY ===\n");
    console.log(JSON.stringify(adminUsers, null, 2));

    if (adminUsers.length === 0) {
      console.log("\n⚠️  NO ADMIN USERS FOUND IN DATABASE");
      console.log("You need to create an admin user to access admin features.");
    } else {
      console.log(`\n✓ Found ${adminUsers.length} admin user(s)`);
    }

    process.exit(0);
  }
);
