// Tests for GET /api/admin/analytics handler (unit-level, DB mocked)

jest.mock('../config/db', () => ({
  query: jest.fn(),
}));

const db = require('../config/db');
const adminModule = require('../routes/admin');

function makeMockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('Admin Analytics Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns global analytics with defaults when no org provided', (done) => {
    const handler = adminModule.getAnalyticsHandler(db);
    const req = { query: {} };
    const res = makeMockRes();

    db.query.mockImplementation((sql, params, cb) => {
      expect(sql).toMatch(/FROM events e[\s\S]*LEFT JOIN tickets t/i);
      // Should not have WHERE clause when no organization provided
      expect(sql).not.toMatch(/WHERE e\.organization/i);
      expect(params).toEqual([]);
      cb(null, [{ total_events: 5, total_tickets_issued: 20, total_checked_in: 12 }]);
    });

    handler(req, res);

    setTimeout(() => {
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.total_events).toBe(5);
      expect(payload.data.total_tickets_issued).toBe(20);
      expect(payload.data.total_checked_in).toBe(12);
      expect(payload.data.total_not_checked_in).toBe(8);
      expect(payload.data.attendance_rate).toBeCloseTo(0.6);
      expect(payload.filters_applied.organization).toBeNull();
      expect(typeof payload.meta.query_ms).toBe('number');
      done();
    }, 5);
  });

  test('applies organization filter and computes attendance', (done) => {
    const handler = adminModule.getAnalyticsHandler(db);
    const req = { query: { organization: 'Concordia CS' } };
    const res = makeMockRes();

    db.query.mockImplementation((sql, params, cb) => {
      expect(sql).toMatch(/WHERE e\.organization = \?/i);
      expect(params).toEqual(['Concordia CS']);
      cb(null, [{ total_events: 2, total_tickets_issued: 7, total_checked_in: 5 }]);
    });

    handler(req, res);

    setTimeout(() => {
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.total_events).toBe(2);
      expect(payload.data.total_tickets_issued).toBe(7);
      expect(payload.data.total_checked_in).toBe(5);
      expect(payload.data.total_not_checked_in).toBe(2);
      expect(payload.data.attendance_rate).toBeCloseTo(0.7143, 4);
      expect(payload.filters_applied.organization).toBe('Concordia CS');
      done();
    }, 5);
  });

  test('handles null aggregates safely', (done) => {
    const handler = adminModule.getAnalyticsHandler(db);
    const req = { query: { organization: 'No Tickets Org' } };
    const res = makeMockRes();

    db.query.mockImplementation((sql, params, cb) => {
      cb(null, [{ total_events: 1, total_tickets_issued: null, total_checked_in: null }]);
    });

    handler(req, res);

    setTimeout(() => {
      const payload = res.json.mock.calls[0][0];
      expect(payload.data.total_events).toBe(1);
      expect(payload.data.total_tickets_issued).toBe(0);
      expect(payload.data.total_checked_in).toBe(0);
      expect(payload.data.total_not_checked_in).toBe(0);
      expect(payload.data.attendance_rate).toBe(0);
      done();
    }, 5);
  });
});

