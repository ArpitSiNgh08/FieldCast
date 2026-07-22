'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/** Sign a JWT carrying the minimal user identity. */
function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

/** Verify a token, returning the decoded payload or throwing. */
function verify(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { sign, verify };
