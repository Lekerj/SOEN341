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
      
      if (userRole !== role) { 
    
      console.error(`AUDIT: Forbidden access attempt. User ID: ${req.session.userId}, Role: ${userRole}, Endpoint: ${req.originalUrl}, Required Role: ${role}`);

      return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      }

      req.userRole = userRole; 
      
      next();
    });
  };
}

//#202
const requireAdmin = requireRole('admin');
const requireModerator = requireAdmin; // Modertion uses the same high level admin check
const requireOrganizer = requireRole('organizer');

<<<<<<< HEAD
/**
 * Middleware to check if user is an APPROVED organizer
 * This checks both role='organizer' AND organizer_auth_status='approved'
 */
function requireApprovedOrganizer(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }

  db.query(
    'SELECT role, organizer_auth_status FROM users WHERE id = ?',
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error("Database error during organizer check:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (rows.length === 0) {
        return res.status(500).json({ error: "Internal Server Error: User not found" });
      }

      const user = rows[0];

      // Check if user has organizer role
      if (user.role !== 'organizer') {
        console.error(`AUDIT: Forbidden access attempt. User ID: ${req.session.userId}, Role: ${user.role}, Endpoint: ${req.originalUrl}, Required Role: organizer`);
        return res.status(403).json({ error: "Forbidden - Organizer role required" });
      }

      // Check if organizer is approved
      if (user.organizer_auth_status !== 'approved') {
        const status = user.organizer_auth_status || 'not requested';
        console.error(`AUDIT: Unapproved organizer access attempt. User ID: ${req.session.userId}, Status: ${status}, Endpoint: ${req.originalUrl}`);
        return res.status(403).json({ 
          error: "Forbidden - Organizer approval required",
          organizer_auth_status: user.organizer_auth_status,
          message: status === 'pending' 
            ? "Your organizer request is pending admin approval"
            : status === 'refused'
            ? "Your organizer request was refused. Please submit a new request."
            : "Please submit an organizer request to access this feature"
        });
      }

      req.userRole = user.role;
      req.organizerAuthStatus = user.organizer_auth_status;
      next();
    }
  );
}

module.exports = { 
  requireAuth, 
  requireRole, 
  requireOrganizer, 
  requireApprovedOrganizer,  // New middleware for approved organizers only
  requireAdmin, 
  requireModerator
}; 
=======
module.exports = { requireAuth, requireRole, requireOrganizer, requireAdmin, requireModerator};
// Exporting the new Admin Middleware
// Exporting  the new Moderator alias. 
>>>>>>> 88473ddf5e0af440b4c6438876bcbc703d1189e0
