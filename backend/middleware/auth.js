const db = require('../config/db');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }
  next();
}
//This is the ROLE based authorization 
/**
 * This is a middle ware. which accepts the 'role' string. (It will check whether: organizer, admin)
 * and returns a middleware function that performs the role check.
 * @param {*} role - the specific role required to access the route  
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.userId) { //Prelim check 
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }

    db.query('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, rows) => { // Linking SQL to find user ID
      if (err) {
        console.error("Database error during role check:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      
      if (rows.length === 0) { // Case Check: There isn't a userID in the table but but in the session
        return res.status(500).json({ error: "Internal Server Error: User not found" });
      }

      const userRole = rows[0].role; // Getting the role from the DB
      
      if (userRole !== role) { // Authorization Check -- Comparing the user's role to the actual role with the required role
        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }

      req.userRole = userRole; 
      
      next();
    });
  };
}

const requireOrganizer = requireRole('organizer');

module.exports = { requireAuth, requireRole, requireOrganizer };