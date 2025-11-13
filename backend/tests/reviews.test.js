// Automated tests for POST /api/reviews and recalcAverageRating
const request = require('supertest');
const express = require('express');

// Mock db BEFORE requiring the routes
jest.mock('../config/db');
const db = require('../config/db');

const reviewsRouter = require('../routes/reviews');
const recalcAverageRating = reviewsRouter.recalcAverageRating;

const app = express();
app.use(express.json());

// Global middleware to set session for all requests
app.use((req, res, next) => {
  req.session = { userId: 3 };
  next();
});

app.use('/api/reviews', reviewsRouter);

// Mock data
const eventId = 1;
const organizerId = 2;
const userId = 3;
const ticketId = 10;

// Test POST /api/reviews
describe('POST /api/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock for db.promise to prevent errors
    db.promise = jest.fn().mockReturnValue({ query: jest.fn() });
  });

  test('should reject missing required fields', async () => {
    db.promise.mockReturnValue({ query: jest.fn() }); // Prevent db error
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: eventId, organizer_id: organizerId });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  test('should reject invalid rating', async () => {
    db.promise.mockReturnValue({ query: jest.fn() }); // Prevent db error
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: eventId, organizer_id: organizerId, rating: 10, title: 'Test', content: 'Test content' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Rating must be a number between 1 and 5/);
  });

  test('should reject if event not found', async () => {
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValue([[], []]),
    });
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: 999, organizer_id: organizerId, rating: 5, title: 'Test', content: 'Test content' });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Event not found/);
  });

  test('should reject if organizer does not match event', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ id: eventId, organizer_id: 99 }], []]) // event lookup
        .mockResolvedValueOnce([[{ id: ticketId, checked_in: 1 }], []]) // ticket lookup
        .mockResolvedValueOnce([[], []]) // duplicate check
        .mockResolvedValueOnce([[{ insertId: 1 }], []]) // insert
        .mockResolvedValueOnce([[{ id: 1 }], []]) // review fetch
    });
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: eventId, organizer_id: organizerId, rating: 5, title: 'Test', content: 'Test content' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Organizer does not match event/);
  });

  test('should reject if user did not check-in', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ id: eventId, organizer_id: organizerId }], []]) // event lookup
        .mockResolvedValueOnce([[{ id: ticketId, checked_in: 0 }], []]) // ticket lookup
    });
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: eventId, organizer_id: organizerId, rating: 5, title: 'Test', content: 'Test content' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/User did not attend/);
  });

  test('should reject duplicate review', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ id: eventId, organizer_id: organizerId }], []]) // event lookup
        .mockResolvedValueOnce([[{ id: ticketId, checked_in: 1 }], []]) // ticket lookup
        .mockResolvedValueOnce([[{ id: 99 }], []]) // duplicate check
    });
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: eventId, organizer_id: organizerId, rating: 5, title: 'Test', content: 'Test content' });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/Duplicate review/);
  });

  test('should submit review and update rating', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ id: eventId, organizer_id: organizerId }], []]) // event lookup
        .mockResolvedValueOnce([[{ id: ticketId, checked_in: 1 }], []]) // ticket lookup
        .mockResolvedValueOnce([[], []]) // duplicate check
          .mockResolvedValueOnce([{ insertId: 1 }, []]) // insert (note: result object, not array)
          .mockResolvedValueOnce([[{ avg_rating: 5.00 }], []]) // recalcAverageRating - avg query
          .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // recalcAverageRating - update query
          .mockResolvedValueOnce([[{ id: 1, user_id: userId, event_id: eventId, organizer_id: organizerId, rating: 5, title: 'Test', content: 'Test content' }], []]) // review fetch
    });
    const res = await request(app)
      .post('/api/reviews')
      // session is set by global middleware
      .send({ event_id: eventId, organizer_id: organizerId, rating: 5, title: 'Test', content: 'Test content' });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/Review submitted/);
    expect(res.body.review).toBeDefined();
    expect(res.body.review.rating).toBe(5);
  });
});

// Test recalcAverageRating (integration)
describe('recalcAverageRating', () => {
  test('should set average_rating to null if no reviews', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ avg_rating: null }], []]) // avg
        .mockResolvedValueOnce([[], []]) // update
    });
    const avg = await recalcAverageRating(organizerId);
    expect(avg).toBeNull();
  });

  test('should update average_rating with correct value', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ avg_rating: 4.25 }], []]) // avg
        .mockResolvedValueOnce([[], []]) // update
    });
    const avg = await recalcAverageRating(organizerId);
    expect(avg).toBe(4.25);
  });
});
