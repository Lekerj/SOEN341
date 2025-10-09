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
    origin(origin, callback) {
      if (!origin || origin === "null") {
        return callback(null, true);
      }

      try {
        const parsed = new URL(origin);
        const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]",'http://[::]:8080']);

        if (allowedHosts.has(parsed.hostname)) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`CORS: allowing origin ${origin}`);
          }
          return callback(null, true);
        }
      } catch (error) {
        console.error("Invalid origin provided to CORS middleware:", origin, error);
        return callback(new Error(`Invalid origin: ${origin}`));
      }

      console.warn(`CORS: blocked origin ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
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
      sameSite: "lax",
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
