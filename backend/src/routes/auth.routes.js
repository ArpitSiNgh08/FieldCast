'use strict';

const express = require('express');
const passport = require('../config/passport');
const env = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.get('/status', authController.status);
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));

// Start the Google OAuth handshake.
router.get('/google', (req, res, next) => {
  if (!env.google.enabled) {
    return res.status(503).json({ error: 'Google OAuth is not configured' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(
    req,
    res,
    next
  );
});

// Google redirects back here; on success we issue a JWT and bounce to the SPA.
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!env.google.enabled) {
      return res.status(503).json({ error: 'Google OAuth is not configured' });
    }
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${env.frontendUrl}/auth/callback?error=oauth`,
    })(req, res, next);
  },
  authController.oauthCallback
);

router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
