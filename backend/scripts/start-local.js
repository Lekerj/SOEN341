// Helper launcher for local mode
// Usage: npm run start:local

// Force non-demo defaults for safe local testing
process.env.DEMO_MODE = "0";
process.env.PUBLIC_WEB_BASE =
  process.env.PUBLIC_WEB_BASE || "http://localhost:8080";
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || "http://localhost:8080";
process.env.HOST = process.env.HOST || "127.0.0.1";

require("dotenv").config();
require("../server");
