require("dotenv").config();
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "341",
    password: process.env.DB_PASSWORD || "Pass341!",
    database: process.env.DB_NAME || "convenevents",
  });
  console.log("✅ Connected to DB");

  // Basic required tables check
  const requiredTables = ["users", "events", "tickets"];
  const [tables] = await conn.query("SHOW TABLES");
  const tableNames = tables.map((row) => Object.values(row)[0]);
  const missing = requiredTables.filter((t) => !tableNames.includes(t));
  console.log("Tables present:", tableNames);
  if (missing.length) {
    console.log("❌ Missing tables:", missing);
  } else {
    console.log("✅ All required tables present");
  }

  // Schemas: minimal column checks (adjust if schema differs)
  async function describe(name) {
    const [rows] = await conn.query(`DESCRIBE \`${name}\``);
    return rows.map((r) => r.Field);
  }

  const expected = {
    users: ["id", "name", "email", "password_hash", "role"],
    events: [
      "id",
      "title",
      "description",
      "event_date",
      "event_time",
      "location",
      "price",
      "category",
      "organization",
      "capacity",
      "tickets_available",
    ],
    tickets: [
      "id",
      "user_id",
      "event_id",
      "ticket_type",
      "qr_code",
      "checked_in",
    ],
  };

  for (const t of requiredTables) {
    if (!tableNames.includes(t)) continue;
    const cols = await describe(t);
    const missCols = expected[t].filter((c) => !cols.includes(c));
    if (missCols.length) {
      console.log(`❌ Table \`${t}\` missing columns:`, missCols);
    } else {
      console.log(`✅ Table \`${t}\` has expected columns`);
    }
  }

  // Row sanity checks: counts
  const [[{ cntUsers }]] = await conn.query(
    "SELECT COUNT(*) AS cntUsers FROM users"
  );
  const [[{ cntEvents }]] = await conn.query(
    "SELECT COUNT(*) AS cntEvents FROM events"
  );
  const [[{ cntTickets }]] = await conn.query(
    "SELECT COUNT(*) AS cntTickets FROM tickets"
  );
  console.log(
    `Counts => users: ${cntUsers}, events: ${cntEvents}, tickets: ${cntTickets}`
  );

  // Ticket join integrity sample
  const [sample] = await conn.query(
    "SELECT t.id, u.email, e.title FROM tickets t JOIN users u ON t.user_id=u.id JOIN events e ON t.event_id=e.id LIMIT 5"
  );
  if (sample.length) {
    console.log("Sample joined tickets (up to 5):");
    sample.forEach((r) => console.log(` - #${r.id} ${r.email} -> ${r.title}`));
  } else {
    console.log("No tickets found to sample.");
  }

  await conn.end();
})().catch((err) => {
  console.error("DB health check failed:", err.message);
  process.exit(1);
});
