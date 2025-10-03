// Database configuration for MySQL connection
// This file should be imported into auth.js and other backend files that need database access

const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "341",
  password: process.env.DB_PASSWORD || "Pass341!",
  database: process.env.DB_NAME || "convenevents",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database");
});

module.exports = db;
