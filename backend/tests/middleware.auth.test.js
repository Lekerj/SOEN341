// Shared mock DB instance for all middleware tests
const mockDb = { query: jest.fn() };

// New tests for requireStudent (role restriction for ticket claiming)
describe("requireStudent middleware", () => {
  let requireStudent;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.doMock("../config/db", () => mockDb);
    requireStudent = require("../middleware/auth").requireStudent;
  });

  function makeRes() {
    return {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(obj) {
        this.body = obj;
        return this;
      },
    };
  }

  test("blocks unauthenticated user", () => {
    const req = { session: {} };
    const res = makeRes();
    const next = jest.fn();
    requireStudent(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows student role", () => {
    const req = { session: { userId: 42 } };
    const res = makeRes();
    const next = jest.fn();
    mockDb.query.mockImplementation((sql, params, cb) => {
      cb(null, [{ role: "student", organizer_auth_status: "null" }]);
    });
    requireStudent(req, res, next);
    expect(res.statusCode).toBe(0); // not set -> success path
    expect(next).toHaveBeenCalled();
    expect(req.userRole).toBe("student");
  });

  test("blocks organizer role", () => {
    const req = { session: { userId: 99 } };
    const res = makeRes();
    const next = jest.fn();
    mockDb.query.mockImplementation((sql, params, cb) => {
      cb(null, [{ role: "organizer", organizer_auth_status: "approved" }]);
    });
    requireStudent(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
    expect(next).not.toHaveBeenCalled();
  });

  test("blocks admin role", () => {
    const req = { session: { userId: 7 } };
    const res = makeRes();
    const next = jest.fn();
    mockDb.query.mockImplementation((sql, params, cb) => {
      cb(null, [{ role: "admin", organizer_auth_status: "null" }]);
    });
    requireStudent(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Organizers and admins cannot claim/);
    expect(next).not.toHaveBeenCalled();
  });

  test("blocks approved organizer even if role still student", () => {
    const req = { session: { userId: 55 } };
    const res = makeRes();
    const next = jest.fn();
    mockDb.query.mockImplementation((sql, params, cb) => {
      cb(null, [{ role: "student", organizer_auth_status: "approved" }]);
    });
    requireStudent(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
    expect(next).not.toHaveBeenCalled();
  });
});
// Integration tests for authentication and authorization middleware

// Mock the database before requiring middleware
jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

const {
  requireAuth,
  requireRole,
  requireOrganizer,
} = require("../middleware/auth");
const db = require("../config/db");

describe("Authentication Middleware Tests - requireAuth()", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { session: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  test("requireAuth allows authenticated users to proceed", () => {
    mockReq.session.userId = 1;

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test("requireAuth blocks unauthenticated users with 401", () => {
    mockReq.session.userId = null;

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Unauthorized - Please log in",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("requireAuth blocks users with missing session userId", () => {
    // Don't set userId
    mockReq.session = {};

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("requireAuth blocks users with empty userId", () => {
    mockReq.session.userId = "";

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("requireAuth blocks users with userId = 0", () => {
    mockReq.session.userId = 0;

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe("Role-Based Authorization Middleware Tests - requireRole()", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { session: { userId: 1 } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Clear any previous mock implementations
    jest.clearAllMocks();
  });

  test("requireRole blocks unauthenticated users before DB query", (done) => {
    mockReq.session.userId = null;
    const roleMiddleware = requireRole("organizer");

    roleMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Unauthorized - Please log in",
      });
      expect(mockNext).not.toHaveBeenCalled();
      done();
    }, 10);
  });

  test("requireRole returns 403 when user role does not match required role", (done) => {
    const roleMiddleware = requireRole("organizer");

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "student" }]);
    });

    roleMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Forbidden - Insufficient permissions",
      });
      expect(mockNext).not.toHaveBeenCalled();
      done();
    }, 10);
  });

  test("requireRole allows users with matching role", (done) => {
    const roleMiddleware = requireRole("organizer");

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "organizer" }]);
    });

    roleMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.userRole).toBe("organizer");
      done();
    }, 10);
  });

  test("requireRole returns 500 when database error occurs", (done) => {
    const roleMiddleware = requireRole("organizer");

    db.query.mockImplementation((query, params, callback) => {
      callback(new Error("Database connection failed"));
    });

    roleMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
      });
      expect(mockNext).not.toHaveBeenCalled();
      done();
    }, 10);
  });

  test("requireRole returns 500 when user not found in database", (done) => {
    const roleMiddleware = requireRole("organizer");

    db.query.mockImplementation((query, params, callback) => {
      callback(null, []); // Empty result set
    });

    roleMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal Server Error: User not found",
      });
      expect(mockNext).not.toHaveBeenCalled();
      done();
    }, 10);
  });

  test("requireRole queries database with correct userId", (done) => {
    const roleMiddleware = requireRole("admin");
    mockReq.session.userId = 42;

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "admin" }]);
    });

    roleMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(db.query).toHaveBeenCalledWith(
        "SELECT role FROM users WHERE id = ?",
        [42],
        expect.any(Function)
      );
      done();
    }, 10);
  });
});

describe("Authorization Scenarios - Real-World Use Cases", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  test("Scenario: Student cannot access organizer endpoint", (done) => {
    mockReq = { session: { userId: 5 } };
    const organizerMiddleware = requireOrganizer;

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "student" }]); // Student role
    });

    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Forbidden - Insufficient permissions",
      });
      done();
    }, 10);
  });

  test("Scenario: Organizer CAN access organizer endpoint", (done) => {
    mockReq = { session: { userId: 10 } };
    const organizerMiddleware = requireOrganizer;

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "organizer" }]); // Organizer role
    });

    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      done();
    }, 10);
  });

  test("Scenario: Admin cannot use student-only endpoint", (done) => {
    mockReq = { session: { userId: 15 } };
    const studentMiddleware = requireRole("student");

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "admin" }]); // Admin role
    });

    studentMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(403);
      done();
    }, 10);
  });

  test("Scenario: Unauthenticated user cannot access protected endpoint", (done) => {
    mockReq = { session: {} }; // No userId
    const protectedMiddleware = requireAuth;

    protectedMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Unauthorized - Please log in",
    });
    done();
  });

  test("Scenario: Valid organizer with correct ID can proceed", (done) => {
    mockReq = { session: { userId: 20 } };
    const organizerMiddleware = requireOrganizer;

    db.query.mockImplementation((query, params, callback) => {
      // Verify we're checking the correct user ID
      if (params[0] === 20) {
        callback(null, [{ role: "organizer" }]);
      }
    });

    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.userRole).toBe("organizer");
      done();
    }, 10);
  });

  test("Scenario: Multiple failed attempts maintain security", (done) => {
    const organizerMiddleware = requireOrganizer;
    let attemptCount = 0;

    db.query.mockImplementation((query, params, callback) => {
      attemptCount++;
      callback(null, [{ role: "student" }]);
    });

    // Simulate multiple access attempts
    mockReq = { session: { userId: 25 } };
    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      // Second attempt
      mockReq = { session: { userId: 26 } };
      mockRes.status.mockClear();
      mockRes.json.mockClear();
      mockNext.mockClear();

      organizerMiddleware(mockReq, mockRes, mockNext);

      setTimeout(() => {
        expect(mockRes.status).toHaveBeenLastCalledWith(403);
        expect(attemptCount).toBe(2);
        done();
      }, 10);
    }, 10);
  });
});

describe("Authorization Edge Cases", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  test("Role comparison is case-sensitive", (done) => {
    mockReq = { session: { userId: 1 } };
    const organizerMiddleware = requireRole("organizer");

    db.query.mockImplementation((query, params, callback) => {
      callback(null, [{ role: "Organizer" }]); // Capital O
    });

    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(403); // Should fail
      done();
    }, 10);
  });

  test("Null userId in session is rejected", (done) => {
    mockReq = { session: { userId: null } };
    const organizerMiddleware = requireOrganizer;

    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(mockRes.status).toHaveBeenCalledWith(401);
      done();
    }, 10);
  });

  test("Database query uses parameterized queries to prevent SQL injection", (done) => {
    mockReq = { session: { userId: "1'; DROP TABLE users; --" } };
    const organizerMiddleware = requireOrganizer;

    db.query.mockImplementation((query, params, callback) => {
      // Verify parameter is passed separately, not concatenated into query
      expect(params[0]).toBe("1'; DROP TABLE users; --");
      callback(null, [{ role: "organizer" }]);
    });

    organizerMiddleware(mockReq, mockRes, mockNext);

    setTimeout(() => {
      expect(db.query).toHaveBeenCalledWith(
        "SELECT role FROM users WHERE id = ?",
        expect.any(Array),
        expect.any(Function)
      );
      done();
    }, 10);
  });
});
