import db from '../config/database.js'

// Parse token from Authorization header and validate against sessions (doesn't require auth)
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      // Look up the token in the sessions table
      const session = db.prepare(`
        SELECT s.*, u.id as user_id, u.email, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
      `).get(token)

      if (session) {
        req.user = {
          id: session.user_id,
          email: session.email,
          is_admin: session.is_admin
        }
      }
    } catch (err) {
      // Invalid token or database error, continue without user
    }
  }
  next()
}

// Require authentication
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

// Require admin role
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
