// Questions & Answers routes
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");

// POST /api/questions - submit a new question
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const { event_id, organizer_id, title, content } = req.body;

    if (
      event_id === undefined ||
      organizer_id === undefined ||
      !title ||
      !content
    ) {
      return res.status(400).json({
        error: "Missing required fields: event_id, organizer_id, title, content"
      });
    }

    const eventId = Number(event_id);
    const organizerId = Number(organizer_id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: "event_id must be a positive integer" });
    }
    if (!Number.isInteger(organizerId) || organizerId <= 0) {
      return res
        .status(400)
        .json({ error: "organizer_id must be a positive integer" });
    }

    if (typeof title !== "string" || title.trim().length === 0 || title.length > 255) {
      return res
        .status(400)
        .json({ error: "Title must be a non-empty string up to 255 characters" });
    }

    if (
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > 5000
    ) {
      return res
        .status(400)
        .json({ error: "Content must be a non-empty string up to 5000 characters" });
    }

    const conn = db.promise();

    // Ensure event exists and organizer matches
    const [events] = await conn.query(
      "SELECT id, organizer_id FROM events WHERE id = ? LIMIT 1",
      [eventId]
    );
    if (!events.length) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (Number(events[0].organizer_id) !== organizerId) {
      return res.status(400).json({ error: "Organizer does not match event" });
    }

    const [result] = await conn.query(
      "INSERT INTO questions (user_id, event_id, organizer_id, title, content, is_answered) VALUES (?, ?, ?, ?, ?, FALSE)",
      [userId, eventId, organizerId, title.trim(), content.trim()]
    );

    const [questionRows] = await conn.query(
      "SELECT * FROM questions WHERE id = ?",
      [result.insertId]
    );

    res
      .status(201)
      .json({ message: "Question submitted", question: questionRows[0] });
  } catch (err) {
    console.error("[QUESTIONS] Error submitting question:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// POST /api/questions/:id/helpful - mark question as helpful
// MUST come before /:id/answers to avoid route conflicts
router.post("/:id/helpful", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "Question id must be a positive integer" });
    }

    const conn = db.promise();

    // Ensure the question exists
    const [questions] = await conn.query(
      "SELECT id, helpful_count FROM questions WHERE id = ? LIMIT 1",
      [questionId]
    );
    if (!questions.length) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Check if user has already voted on this question
    const [existingVote] = await conn.query(
      "SELECT id FROM helpful_votes WHERE user_id = ? AND question_id = ? LIMIT 1",
      [userId, questionId]
    );

    if (existingVote.length > 0) {
      return res.status(409).json({
        error: "You have already marked this question as helpful",
        alreadyVoted: true,
        question: questions[0]
      });
    }

    // Record the vote
    await conn.query(
      "INSERT INTO helpful_votes (user_id, question_id) VALUES (?, ?)",
      [userId, questionId]
    );

    // Increment helpful count (prevent negative counts with GREATEST)
    await conn.query(
      "UPDATE questions SET helpful_count = GREATEST(0, helpful_count + 1) WHERE id = ?",
      [questionId]
    );

    // Get updated question data
    const [updatedQuestions] = await conn.query(
      "SELECT id, helpful_count FROM questions WHERE id = ?",
      [questionId]
    );

    res.status(200).json({
      message: "Question marked as helpful",
      question: updatedQuestions[0]
    });
  } catch (err) {
    console.error("[QUESTIONS] Error marking question as helpful:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// POST /api/questions/:questionId/answers/:answerId/helpful - mark answer as helpful
// MUST come before /:id/answers to avoid route conflicts
router.post("/:questionId/answers/:answerId/helpful", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const questionId = Number(req.params.questionId);
    const answerId = Number(req.params.answerId);

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "Question id must be a positive integer" });
    }
    if (!Number.isInteger(answerId) || answerId <= 0) {
      return res.status(400).json({ error: "Answer id must be a positive integer" });
    }

    const conn = db.promise();

    // Ensure the question exists
    const [questions] = await conn.query(
      "SELECT id FROM questions WHERE id = ? LIMIT 1",
      [questionId]
    );
    if (!questions.length) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Ensure the answer exists and belongs to the question
    const [answers] = await conn.query(
      "SELECT id, helpful_count FROM answers WHERE id = ? AND question_id = ? LIMIT 1",
      [answerId, questionId]
    );
    if (!answers.length) {
      return res.status(404).json({ error: "Answer not found or does not belong to this question" });
    }

    // Check if user has already voted on this answer
    const [existingVote] = await conn.query(
      "SELECT id FROM helpful_votes WHERE user_id = ? AND answer_id = ? LIMIT 1",
      [userId, answerId]
    );

    if (existingVote.length > 0) {
      return res.status(409).json({
        error: "You have already marked this answer as helpful",
        alreadyVoted: true,
        answer: answers[0]
      });
    }

    // Record the vote
    await conn.query(
      "INSERT INTO helpful_votes (user_id, answer_id) VALUES (?, ?)",
      [userId, answerId]
    );

    // Increment helpful count (prevent negative counts with GREATEST)
    await conn.query(
      "UPDATE answers SET helpful_count = GREATEST(0, helpful_count + 1) WHERE id = ?",
      [answerId]
    );

    // Get updated answer data
    const [updatedAnswers] = await conn.query(
      "SELECT id, helpful_count FROM answers WHERE id = ?",
      [answerId]
    );

    res.status(200).json({
      message: "Answer marked as helpful",
      answer: updatedAnswers[0]
    });
  } catch (err) {
    console.error("[QUESTIONS] Error marking answer as helpful:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// POST /api/questions/:id/answers - submit an answer
router.post("/:id/answers", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const questionId = Number(req.params.id);
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "Question id must be a positive integer" });
    }

    const { content, is_anonymous } = req.body;
    if (typeof content !== "string" || content.trim().length === 0 || content.length > 5000) {
      return res
        .status(400)
        .json({ error: "Content must be a non-empty string up to 5000 characters" });
    }

    const conn = db.promise();

    // Ensure the question exists
    const [questions] = await conn.query(
      "SELECT id, organizer_id FROM questions WHERE id = ? LIMIT 1",
      [questionId]
    );
    if (!questions.length) {
      return res.status(404).json({ error: "Question not found" });
    }
    const question = questions[0];
    const isOfficial = Number(question.organizer_id) === Number(userId);
    // Organizers can never post anonymously
    const isAnonymous = isOfficial ? false : (is_anonymous === true);

    const [result] = await conn.query(
      "INSERT INTO answers (question_id, user_id, content, is_official_organizer_response, is_anonymous) VALUES (?, ?, ?, ?, ?)",
      [questionId, userId, content.trim(), isOfficial ? true : false, isAnonymous ? true : false]
    );

    // Debug: Log what we're storing
    console.log('[QUESTIONS] Answer submitted:', {
      is_anonymous_from_request: is_anonymous,
      isOfficial,
      isAnonymous_final: isAnonymous,
      stored_value: isAnonymous ? 1 : 0
    });

    // Mark question as answered
    await conn.query(
      "UPDATE questions SET is_answered = TRUE WHERE id = ?",
      [questionId]
    );

    const [answerRows] = await conn.query(
      "SELECT a.*, u.name AS author_name FROM answers a LEFT JOIN users u ON a.user_id = u.id WHERE a.id = ?",
      [result.insertId]
    );

    res.status(201).json({ message: "Answer submitted", answer: answerRows[0] });
  } catch (err) {
    console.error("[QUESTIONS] Error submitting answer:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// GET /api/questions - fetch questions with optional filters and answers
router.get("/", async (req, res) => {
  try {
    const {
      event_id,
      organizer_id,
      user_id,
      is_answered,
      include_answers = "false",
      sort = "recent",
      limit = 20,
      offset = 0
    } = req.query;
    const conn = db.promise();

    const filterEventId =
      event_id === undefined ? null : Number(event_id);
    if (event_id !== undefined && (!Number.isInteger(filterEventId) || filterEventId <= 0)) {
      return res.status(400).json({ error: "event_id must be a positive integer" });
    }

    const filterOrganizerId =
      organizer_id === undefined ? null : Number(organizer_id);
    if (organizer_id !== undefined && (!Number.isInteger(filterOrganizerId) || filterOrganizerId <= 0)) {
      return res.status(400).json({ error: "organizer_id must be a positive integer" });
    }

    const filterUserId =
      user_id === undefined ? null : Number(user_id);
    if (user_id !== undefined && (!Number.isInteger(filterUserId) || filterUserId <= 0)) {
      return res.status(400).json({ error: "user_id must be a positive integer" });
    }

    let answeredFilter = null;
    if (is_answered !== undefined) {
      if (
        String(is_answered).toLowerCase() !== "true" &&
        String(is_answered).toLowerCase() !== "false"
      ) {
        return res.status(400).json({ error: "is_answered must be true or false" });
      }
      answeredFilter = String(is_answered).toLowerCase() === "true" ? 1 : 0;
    }

    const includeAnswers =
      String(include_answers).toLowerCase() === "true";

    let query = `
      SELECT 
        q.*,
        asker.name AS asker_name,
        e.title AS event_title
      FROM questions q
      LEFT JOIN users asker ON q.user_id = asker.id
      LEFT JOIN events e ON q.event_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (filterEventId) {
      query += " AND q.event_id = ?";
      params.push(filterEventId);
    }
    if (filterOrganizerId) {
      query += " AND q.organizer_id = ?";
      params.push(filterOrganizerId);
    }
    if (filterUserId) {
      query += " AND q.user_id = ?";
      params.push(filterUserId);
    }
    if (answeredFilter !== null) {
      query += " AND q.is_answered = ?";
      params.push(answeredFilter);
    }

    let safeLimit = parseInt(limit, 10);
    let safeOffset = parseInt(offset, 10);
    if (!Number.isFinite(safeLimit)) safeLimit = 20;
    if (!Number.isFinite(safeOffset)) safeOffset = 0;
    safeLimit = Math.max(1, Math.min(safeLimit, 100));
    safeOffset = Math.max(0, safeOffset);

    // Build ORDER BY clause based on sort parameter
    let orderBy = "q.created_at DESC"; // default to recent
    const sortParam = String(sort).toLowerCase();
    if (sortParam === "helpful") {
      orderBy = "q.helpful_count DESC, q.created_at DESC"; // Sort by helpful, then recent
    } else if (sortParam === "unanswered") {
      orderBy = "q.is_answered ASC, q.created_at DESC"; // Unanswered first, then by recent
    }
    // else default to "recent" which is q.created_at DESC

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(safeLimit, safeOffset);

    const [questionRows] = await conn.query(query, params);

    let countQuery = "SELECT COUNT(*) as total FROM questions WHERE 1=1";
    const countParams = [];
    if (filterEventId) {
      countQuery += " AND event_id = ?";
      countParams.push(filterEventId);
    }
    if (filterOrganizerId) {
      countQuery += " AND organizer_id = ?";
      countParams.push(filterOrganizerId);
    }
    if (filterUserId) {
      countQuery += " AND user_id = ?";
      countParams.push(filterUserId);
    }
    if (answeredFilter !== null) {
      countQuery += " AND is_answered = ?";
      countParams.push(answeredFilter);
    }
    const [countRows] = await conn.query(countQuery, countParams);
    const total = countRows[0]?.total || 0;

    let questions = questionRows;

    if (includeAnswers && questionRows.length) {
      const questionIds = questionRows.map((q) => q.id);
      const placeholders = questionIds.map(() => "?").join(", ");
      const [answerRows] = await conn.query(
        `SELECT a.*, u.name AS author_name FROM answers a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.question_id IN (${placeholders}) ORDER BY a.created_at ASC`,
        questionIds
      );
      const grouped = {};
      for (const answer of answerRows) {
        const key = answer.question_id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(answer);
      }

      // Debug: Log sample answer to verify author_name is being returned
      if (answerRows.length > 0) {
        console.log('[QUESTIONS] Sample answer from DB:', JSON.stringify(answerRows[0], null, 2));
      }
      questions = questionRows.map((q) => ({
        ...q,
        answers: grouped[q.id] || []
      }));
    }

    res.status(200).json({
      questions,
      pagination: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: safeOffset + questionRows.length < total
      }
    });
  } catch (err) {
    console.error("[QUESTIONS] Error fetching questions:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// GET /api/questions/user-votes - get current user's helpful votes
router.get("/user-votes", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const conn = db.promise();

    // Get all question and answer IDs that the user has voted on
    const [votes] = await conn.query(
      `SELECT
        question_id,
        answer_id
      FROM helpful_votes
      WHERE user_id = ?`,
      [userId]
    );

    // Organize votes into separate arrays for easier lookup
    const votedQuestionIds = votes
      .filter(v => v.question_id !== null)
      .map(v => v.question_id);

    const votedAnswerIds = votes
      .filter(v => v.answer_id !== null)
      .map(v => v.answer_id);

    res.status(200).json({
      votedQuestionIds,
      votedAnswerIds
    });
  } catch (err) {
    console.error("[QUESTIONS] Error fetching user votes:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
