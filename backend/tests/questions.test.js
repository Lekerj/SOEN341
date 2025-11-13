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
