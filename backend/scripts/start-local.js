// Helper launcher for local mode
// Usage: npm run start:local

process.env.DEMO_MODE = process.env.DEMO_MODE || "0";
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || "http://localhost:8080";
process.env.HOST = process.env.HOST || "0.0.0.0";

require("dotenv").config();
require("../server");
