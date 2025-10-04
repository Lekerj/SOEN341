// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }
  next();
}

// Middleware to check if user has a specific role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }
    // You would need to fetch user from DB to check role
    // For now, this is a placeholder
    next();
  };
}

module.exports = { requireAuth, requireRole };
