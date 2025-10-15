#!/usr/bin/env node
/**
 * Seed runner that executes backend/sql/seed_events.sql against your configured DB.
 * Splits and executes statements one-by-one to avoid multi-statement issues.
 * Usage: npm run seed
 */
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

/**
 * Split SQL file into individual statements.
 * Simple splitter on semicolons; skips empty lines.
 */
function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.match(/^--/));
}

/**
 * Execute statements sequentially.
 */
async function executeStatements(statements) {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    await new Promise((resolve, reject) => {
      db.query(stmt, (err) => {
        if (err) {
          console.error(`Statement ${i + 1} failed:`, stmt.substring(0, 80));
          return reject(err);
        }
        resolve();
      });
    });
  }
}

(async function main() {
  const seedPath = path.resolve(__dirname, "../sql/seed_events.sql");
  console.log("Seeding database from:", seedPath);
  const sql = fs.readFileSync(seedPath, "utf8");

  const statements = splitStatements(sql);
  console.log(`Executing ${statements.length} statements...`);

  try {
    await executeStatements(statements);
    console.log("✅ Seed completed successfully.");
    db.end();
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exitCode = 1;
    db.end();
  }
})();
