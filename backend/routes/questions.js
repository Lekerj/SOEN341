// Questions & Answers routes placeholder file
const express = require("express");
const router = express.Router();

// POST /api/questions - submit a new question (stub)
router.post("/", (req, res) => {
  res.status(501).json({ message: "Submit question not implemented yet" });
});

// POST /api/questions/:id/answers - answer a question (stub)
router.post("/:id/answers", (req, res) => {
  res
    .status(501)
    .json({ message: "Submit answer not implemented yet" });
});

// GET /api/questions - fetch questions (stub)
router.get("/", (req, res) => {
  res.status(501).json({ message: "Fetch questions not implemented yet" });
});

module.exports = router;
