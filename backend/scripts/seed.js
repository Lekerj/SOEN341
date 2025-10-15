#!/usr/bin/env node
/**
 * Simple seed runner that executes backend/sql/seed_events.sql against your configured DB.
 * Usage: npm run seed
 */
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

(async function main() {
  const seedPath = path.resolve(__dirname, "../sql/seed_events.sql");
  console.log("Seeding database from:", seedPath);
  const sql = fs.readFileSync(seedPath, "utf8");

  db.query(sql, (err) => {
    if (err) {
      console.error("Seed failed:", err);
      process.exitCode = 1;
      db.end();
      return;
    }
    console.log("Seed completed successfully.");
    db.end();
  });
})();
