// Database configuration for MySQL connection
// This file should be imported into auth.js and other backend files that need database access

const mysql = require("mysql2");

// Use connection pool instead of single connection to prevent "connection closed" errors
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "341",
  password: process.env.DB_PASSWORD || "Pass341!",
  database: process.env.DB_NAME || "convenevents",
  dateStrings: true, // Ensures DATE and TIME columns are returned as strings
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the pool connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database");
  connection.release(); // Release connection back to pool
});

module.exports = pool;
