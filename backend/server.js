require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");

// Import the new events route file
const eventRoutes = require("./routes/events");

// Adding this (PERSON1): Import the organizer route file
const organizerRoutes = require("./routes/Organizer");

//Import the database connection
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0"; // bind to all for demo/phone testing

const DEMO_MODE = String(process.env.DEMO_MODE || "0") === "1";
// Comma-separated list of allowed origins for CORS.
// e.g. "http://localhost:8080,http://192.168.1.50:8080"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:8080")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// CORS configuration - allow frontend to access backend
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin or server-to-server (no Origin header)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`CORS: allowing origin ${origin}`);
        }
        return callback(null, true);
      }
      console.warn(`CORS: blocked origin ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your_secret_key_change_in_production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // If you serve over HTTPS in prod, set true there.
      httpOnly: true,
      sameSite: "lax", // better cross-site defaults for local + phone testing
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);

app.use("/api/events", eventRoutes);

// Adding this: Mount the organizer routes here
app.use("/api/organizer", organizerRoutes);

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.get("/", (req, res) => {
  res.send("Welcome to ConEvents backend!");
});



app.listen(PORT, HOST, () => {
  const banner = [
    "\nConEvents backend running:",
    `  Mode      : ${DEMO_MODE ? "DEMO" : "LOCAL"}`,
    `  Host/Port: http://${HOST}:${PORT}`,
    `  CORS     : ${ALLOWED_ORIGINS.join(", ")}`,
  ].join("\n");
  console.log(banner + "\n");
});
