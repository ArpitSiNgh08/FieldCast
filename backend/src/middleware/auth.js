'use strict';

const { verify } = require('../utils/jwt');

/** Extract a bearer token from the Authorization header. */
function tokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Populate req.user if a valid token is present; never rejects. */
function attachUser(req, _res, next) {
  const token = tokenFromRequest(req);
  if (token) {
    try {
      req.user = verify(token);
    } catch {
      /* ignore invalid/expired tokens for optional auth */
    }
  }
  next();
}

/** Require any authenticated user. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

/** Require an authenticated admin. */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin, tokenFromRequest };
