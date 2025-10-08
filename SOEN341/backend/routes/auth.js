// Authentication routes for user registration and login
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// Import will be added when db config is integrated
// const db = require('../config/db');

// Registration endpoint
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({
        error:
          "Missing required fields: name, email, and password are required",
      });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Password strength check
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // Placeholder for db query - will be replaced with actual db import
    const db = require("../config/db");
    db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, role || "student"],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Email already exists" });
          }
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ error: "Database error during registration" });
        }
        res.status(201).json({
          message: "User registered successfully",
          userId: result.insertId,
        });
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login endpoint
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const db = require("../config/db");
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error during login" });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = results[0];

      try {
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Set session
        req.session.userId = user.id;
        req.session.userRole = user.role;

        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
});

// Logout endpoint
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user profile
router.get("/profile", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = require("../config/db");
  db.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
    [req.session.userId],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: results[0] });
    }
  );
});

module.exports = router;
