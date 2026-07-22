'use strict';

require('dotenv').config();

/** Parse a boolean-ish env var ("true"/"1"/"yes"). */
function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://fieldcast:fieldcast@localhost:5432/fieldcast',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'dev-insecure-session-secret',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:4000/api/auth/google/callback',
  },

  // Emails granted the admin role on login.
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  stream: {
    simulate: bool(process.env.SIMULATE_STREAM, true),
    rtmpHost: process.env.RTMP_HOST || 'localhost',
    rtmpPort: parseInt(process.env.RTMP_PORT || '1935', 10),
    hlsBase: process.env.SRS_HLS_BASE || 'http://localhost:8080',
    apiBase: process.env.SRS_API_BASE || 'http://localhost:1985',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  },
};

/** True when Google OAuth is fully configured. */
env.google.enabled = Boolean(env.google.clientId && env.google.clientSecret);

module.exports = env;
