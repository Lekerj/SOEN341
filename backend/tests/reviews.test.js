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

// Test GET /api/reviews (list)
describe('GET /api/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch reviews with pagination', async () => {
    const mockReviews = [
      { id: 1, user_id: userId, event_id: eventId, rating: 5, title: 'Great', content: 'Awesome event', reviewer_name: 'John', event_title: 'Test Event' },
      { id: 2, user_id: userId, event_id: eventId, rating: 4, title: 'Good', content: 'Nice event', reviewer_name: 'Jane', event_title: 'Test Event' }
    ];
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([mockReviews, []]) // reviews query
        .mockResolvedValueOnce([[{ total: 2 }], []]) // count query
    });
    const res = await request(app).get('/api/reviews?limit=10&offset=0');
    expect(res.statusCode).toBe(200);
    expect(res.body.reviews).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('should filter by event_id', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ id: 1, event_id: eventId }], []]) // reviews query
        .mockResolvedValueOnce([[{ total: 1 }], []]) // count query
    });
    const res = await request(app).get(`/api/reviews?event_id=${eventId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
  });

  test('should sort by rating descending', async () => {
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[{ id: 1, rating: 5 }, { id: 2, rating: 3 }], []]) // reviews query
        .mockResolvedValueOnce([[{ total: 2 }], []]) // count query
    });
    const res = await request(app).get('/api/reviews?sort=rating&order=DESC');
    expect(res.statusCode).toBe(200);
    expect(res.body.reviews[0].rating).toBe(5);
  });
});

// Test GET /api/reviews/:id (single)
describe('GET /api/reviews/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch single review by id', async () => {
    const mockReview = { id: 1, user_id: userId, event_id: eventId, rating: 5, title: 'Great', content: 'Awesome', reviewer_name: 'John', event_title: 'Test Event' };
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[mockReview], []])
    });
    const res = await request(app).get('/api/reviews/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.review.id).toBe(1);
    expect(res.body.review.title).toBe('Great');
  });

  test('should return 404 if review not found', async () => {
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[], []])
    });
    const res = await request(app).get('/api/reviews/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Review not found/);
  });
});

// Test PUT /api/reviews/:id
describe('PUT /api/reviews/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update review successfully', async () => {
    const existingReview = { id: 1, user_id: userId, organizer_id: organizerId, rating: 3 };
    const updatedReview = { ...existingReview, rating: 5, title: 'Updated' };
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[existingReview], []]) // fetch existing
        .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // update query
        .mockResolvedValueOnce([[{ avg_rating: 4.5 }], []]) // recalc avg
        .mockResolvedValueOnce([[], []]) // recalc update
        .mockResolvedValueOnce([[updatedReview], []]) // fetch updated
    });
    const res = await request(app)
      .put('/api/reviews/1')
      .send({ rating: 5, title: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Review updated/);
    expect(res.body.review.rating).toBe(5);
  });

  test('should reject if review not found', async () => {
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[], []])
    });
    const res = await request(app).put('/api/reviews/999').send({ rating: 4 });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Review not found/);
  });

  test('should reject if user is not owner', async () => {
    const existingReview = { id: 1, user_id: 999, organizer_id: organizerId }; // different user
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[existingReview], []])
    });
    const res = await request(app).put('/api/reviews/1').send({ rating: 4 });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Unauthorized/);
  });

  test('should reject invalid rating on update', async () => {
    const existingReview = { id: 1, user_id: userId, organizer_id: organizerId };
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[existingReview], []])
    });
    const res = await request(app).put('/api/reviews/1').send({ rating: 10 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Rating must be a number between 1 and 5/);
  });

  test('should reject if no fields to update', async () => {
    const existingReview = { id: 1, user_id: userId, organizer_id: organizerId };
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[existingReview], []])
    });
    const res = await request(app).put('/api/reviews/1').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/No fields to update/);
  });
});

// Test DELETE /api/reviews/:id
describe('DELETE /api/reviews/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete review as owner', async () => {
    const existingReview = { id: 1, user_id: userId, organizer_id: organizerId };
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[existingReview], []]) // fetch existing
        .mockResolvedValueOnce([[{ role: 'user' }], []]) // fetch user role
        .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // delete query
        .mockResolvedValueOnce([[{ avg_rating: 4.0 }], []]) // recalc avg
        .mockResolvedValueOnce([[], []]) // recalc update
    });
    const res = await request(app).delete('/api/reviews/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Review deleted successfully/);
  });

  test('should delete review as admin', async () => {
    // Set admin session for this test
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use((req, res, next) => {
      req.session = { userId: 99 }; // different user, but admin
      next();
    });
    adminApp.use('/api/reviews', reviewsRouter);

    const existingReview = { id: 1, user_id: userId, organizer_id: organizerId }; // owned by userId=3
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[existingReview], []]) // fetch existing
        .mockResolvedValueOnce([[{ role: 'admin' }], []]) // fetch user role (admin)
        .mockResolvedValueOnce([{ affectedRows: 1 }, []]) // delete query
        .mockResolvedValueOnce([[{ avg_rating: 4.0 }], []]) // recalc avg
        .mockResolvedValueOnce([[], []]) // recalc update
    });
    const res = await request(adminApp).delete('/api/reviews/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/Review deleted successfully/);
  });

  test('should reject if review not found', async () => {
    db.promise.mockReturnValue({
      query: jest.fn().mockResolvedValueOnce([[], []])
    });
    const res = await request(app).delete('/api/reviews/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/Review not found/);
  });

  test('should reject if user is not owner and not admin', async () => {
    const existingReview = { id: 1, user_id: 999, organizer_id: organizerId }; // different user
    db.promise.mockReturnValue({
      query: jest.fn()
        .mockResolvedValueOnce([[existingReview], []]) // fetch existing
        .mockResolvedValueOnce([[{ role: 'user' }], []]) // fetch user role (not admin)
    });
    const res = await request(app).delete('/api/reviews/1');
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Unauthorized/);
  });
});
