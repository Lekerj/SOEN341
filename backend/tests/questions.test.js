const request = require("supertest");
const express = require("express");

jest.mock("../config/db");
const db = require("../config/db");

const questionsRouter = require("../routes/questions");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.session = { userId: 5 };
  next();
});
app.use("/api/questions", questionsRouter);

describe("POST /api/questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects when required fields are missing", async () => {
    db.promise.mockReturnValue({ query: jest.fn() });

    const res = await request(app)
      .post("/api/questions")
      .send({ event_id: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  test("returns 404 when event is not found", async () => {
    db.promise.mockReturnValue({
      query: jest
        .fn()
        .mockResolvedValueOnce([[], []]) // event lookup
    });

    const res = await request(app)
      .post("/api/questions")
      .send({
        event_id: 1,
        organizer_id: 2,
        title: "Question",
        content: "Details"
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Event not found/);
  });

  test("returns 400 when organizer does not match event", async () => {
    db.promise.mockReturnValue({
      query: jest
        .fn()
        .mockResolvedValueOnce([[{ id: 1, organizer_id: 99 }], []]) // event lookup
    });

    const res = await request(app)
      .post("/api/questions")
      .send({
        event_id: 1,
        organizer_id: 2,
        title: "Question",
        content: "Details"
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Organizer does not match event/);
  });

  test("creates a question successfully", async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 1, organizer_id: 2 }], []]) // event lookup
      .mockResolvedValueOnce([{ insertId: 10 }, []]) // insert question
      .mockResolvedValueOnce([[{ id: 10, user_id: 5, event_id: 1, organizer_id: 2, is_answered: 0 }], []]); // fetch inserted

    db.promise.mockReturnValue({ query: queryMock });

    const res = await request(app)
      .post("/api/questions")
      .send({
        event_id: 1,
        organizer_id: 2,
        title: "Question title",
        content: "Details about the question"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/Question submitted/);
    expect(res.body.question).toMatchObject({
      id: 10,
      event_id: 1,
      organizer_id: 2
    });
    expect(res.body.question.is_answered).toBe(0);
  });
});

describe("POST /api/questions/:id/answers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 404 when question is not found", async () => {
    db.promise.mockReturnValue({
      query: jest
        .fn()
        .mockResolvedValueOnce([[], []]) // question lookup
    });

    const res = await request(app)
      .post("/api/questions/10/answers")
      .send({ content: "Answer" });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Question not found/);
  });

  test("creates an answer successfully for non-organizer", async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 10, organizer_id: 2 }], []]) // question lookup
      .mockResolvedValueOnce([{ insertId: 55 }, []]) // insert answer
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // update question
      .mockResolvedValueOnce([[{ id: 55, question_id: 10, user_id: 5, content: "Answer", is_official_organizer_response: 0 }], []]); // fetch answer

    db.promise.mockReturnValue({ query: queryMock });

    const res = await request(app)
      .post("/api/questions/10/answers")
      .send({ content: "Answer" });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/Answer submitted/);
    expect(res.body.answer).toMatchObject({
      id: 55,
      question_id: 10,
      user_id: 5,
      is_official_organizer_response: 0
    });
  });

  test("marks answer as official when organizer responds", async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([[{ id: 10, organizer_id: 5 }], []]) // question lookup organizer matches session user
      .mockResolvedValueOnce([{ insertId: 77 }, []]) // insert answer
      .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // update question
      .mockResolvedValueOnce([[{ id: 77, question_id: 10, user_id: 5, content: "Official answer", is_official_organizer_response: 1 }], []]); // fetch answer

    db.promise.mockReturnValue({ query: queryMock });

    const res = await request(app)
      .post("/api/questions/10/answers")
      .send({ content: "Official answer" });

    expect(res.statusCode).toBe(201);
    expect(res.body.answer.is_official_organizer_response).toBe(1);
  });
});
