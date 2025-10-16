require("dotenv").config();

function mask(value, keep = 3) {
  if (!value) return "";
  const str = String(value);
  if (str.length <= keep) return "*".repeat(str.length);
  return str.slice(0, keep) + "*".repeat(Math.max(0, str.length - keep));
}

const cfg = {
  MODE: String(process.env.DEMO_MODE || "0") === "1" ? "DEMO" : "LOCAL",
  HOST: process.env.HOST || "0.0.0.0",
  PORT: process.env.PORT || 3000,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || "http://localhost:8080")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  PUBLIC_WEB_BASE:
    process.env.PUBLIC_WEB_BASE || "(derived from request hostname)",
  STAFF_KEY: process.env.STAFF_KEY || "demo-staff-key",
  SESSION_SECRET: mask(
    process.env.SESSION_SECRET || "your_secret_key_change_in_production",
    4
  ),
  DB: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "341",
    password: mask(process.env.DB_PASSWORD || "Pass341!", 2),
    database: process.env.DB_NAME || "convenevents",
  },
};

console.log("\nCurrent ConEvents Configuration:\n");
console.log(JSON.stringify(cfg, null, 2));
console.log("\nNotes:");
console.log(
  "- In DEMO mode, check-in requires header x-staff-key with STAFF_KEY."
);
console.log("- PUBLIC_WEB_BASE controls the base URL encoded into QR codes.");
console.log("- ALLOWED_ORIGINS must include your frontend origin(s).");
