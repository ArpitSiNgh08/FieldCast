'use strict';

const env = require('../config/env');
const { sign } = require('../utils/jwt');
const users = require('../models/users.model');
const bcrypt = require('bcrypt');

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, role: user.role };
}

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || typeof password !== 'string') {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (await users.findByEmail(email.trim())) return res.status(409).json({ error: 'An account with this email already exists' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.createWithPassword({ email: email.trim(), name: name.trim(), passwordHash });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = email ? await users.findByEmail(email.trim()) : null;
  if (!user?.passwordHash || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: sign(user), user: publicUser(user) });
}

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
    avatarUrl: user.avatarUrl,
    role: user.role,
  });
}

/** Report whether Google OAuth is configured (frontend hides the button otherwise). */
function status(_req, res) {
  res.json({ googleEnabled: env.google.enabled });
}

module.exports = { oauthCallback, me, status, register, login };
