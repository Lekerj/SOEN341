const express = require("express");
const session = require("express-session");
const cors = require("cors");
const authRoutes = require("./routes/auth");

//Adding this: Import the new events route file
const eventRoutes = require("./routes/events");
//Adding this: Import the database connection
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow frontend to access backend
app.use(
  cors({
    origin: [
      "http://localhost:5500", // Live Server default port
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "null", // For file:// protocol (opening HTML directly)
    ],
    credentials: true, // Allow cookies/sessions to be sent
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
      secure: false, // Set to true if using HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);

//Adding this: 
app.use("/api/events",eventRoutes);

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.get("/", (req, res) => {
  res.send("Welcome to ConEvents backend!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
