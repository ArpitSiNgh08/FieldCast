'use strict';

const env = require('../config/env');
const { sign } = require('../utils/jwt');
const users = require('../models/users.model');

/**
 * Passport has attached req.user after a successful Google callback.
 * Issue a JWT and hand it back to the frontend via a redirect.
 */
function oauthCallback(req, res) {
  const token = sign(req.user);
  const url = new URL('/auth/callback', env.frontendUrl);
  url.searchParams.set('token', token);
  res.redirect(url.toString());
}

/** Return the current user (from the verified JWT). */
async function me(req, res) {
  const user = await users.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    role: user.role,
  });
}

/** Report whether Google OAuth is configured (frontend hides the button otherwise). */
function status(_req, res) {
  res.json({ googleEnabled: env.google.enabled });
}

module.exports = { oauthCallback, me, status };
