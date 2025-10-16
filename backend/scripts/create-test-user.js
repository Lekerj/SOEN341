const bcrypt = require("bcrypt");
const db = require("../config/db");

async function createTestUser() {
  try {
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    db.query(
      "SELECT id FROM users WHERE email = ?",
      ["testuser@test.com"],
      (err, results) => {
        if (err) {
          console.error("Error checking user:", err);
          process.exit(1);
        }

        if (results.length > 0) {
          console.log("\n✅ User testuser@test.com already exists");
          console.log("   Email: testuser@test.com");
          console.log("   Password: password123\n");
          console.log("You can now log in with these credentials!\n");
          process.exit(0);
        } else {
          // Create new user
          db.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [
              "Test User For Claims",
              "testuser@test.com",
              hashedPassword,
              "student",
            ],
            (insertErr, result) => {
              if (insertErr) {
                console.error("Error creating user:", insertErr);
                process.exit(1);
              } else {
                console.log("\n✅ Test user created successfully!");
                console.log("   Email: testuser@test.com");
                console.log("   Password: password123");
                console.log("   User ID:", result.insertId);
                console.log("\nYou can now log in with these credentials!\n");
                process.exit(0);
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createTestUser();
