'use strict';

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const env = require('./env');
const users = require('../models/users.model');

// Only register the Google strategy when credentials are present, so the app
// still boots (with auth disabled) before OAuth is configured.
if (env.google.enabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || '').toLowerCase();
          if (!email) return done(null, false, { message: 'No email on Google profile' });

          const role = env.adminEmails.includes(email) ? 'admin' : 'viewer';
          const user = await users.upsertByEmail({
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value || null,
            role,
          });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// We use JWTs (stateless) for the app, but passport-google-oauth20 needs these
// during the OAuth handshake.
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    done(null, await users.findById(id));
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
