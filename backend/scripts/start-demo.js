// Helper launcher for demo mode (phone scanning on LAN)
// Usage: npm run start:demo

const os = require("os");
function findLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const lan = findLanIp();
process.env.DEMO_MODE = "1";
process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.PUBLIC_WEB_BASE =
  process.env.PUBLIC_WEB_BASE || `http://${lan}:8080`;
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS || `http://localhost:8080,http://${lan}:8080`;
process.env.STAFF_KEY = process.env.STAFF_KEY || "demo-staff-key";

require("dotenv").config();
require("../server");
