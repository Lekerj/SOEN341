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
 * Handles multi-line statements properly.
 */
function splitStatements(sql) {
  // Remove comments first (lines starting with --)
  const lines = sql.split("\n");
  const cleanedLines = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("--");
  });
  const cleanedSql = cleanedLines.join("\n");

  // Split on semicolons
  const statements = cleanedSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return statements;
}

/**
 * Execute statements sequentially.
 */
async function executeStatements(statements) {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(
      `[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`
    );
    await new Promise((resolve, reject) => {
      db.query(stmt, (err, result) => {
        if (err) {
          console.error(
            `❌ Statement ${i + 1} failed:`,
            stmt.substring(0, 100)
          );
          console.error("Error:", err.message);
          return reject(err);
        }
        if (result && result.affectedRows !== undefined) {
          console.log(`   ✓ Affected ${result.affectedRows} rows`);
        } else {
          console.log(`   ✓ Success`);
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

  // Debug: show first 100 chars of each statement
  statements.forEach((stmt, i) => {
    console.log(
      `  Statement ${i + 1}: ${stmt.substring(0, 100).replace(/\n/g, " ")}...`
    );
  });

  try {
    await executeStatements(statements);
    console.log("✅ Seed completed successfully.");
    db.end();
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    console.error(err);
    process.exitCode = 1;
    db.end();
  }
})();
