'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');
const env = require('./config/env');
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '3mb' }));
  app.use(cookieParser());

  // Session is only used to carry OAuth state during the Google handshake.
  app.use(
    session({
      secret: env.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: false },
    })
  );
  app.use(passport.initialize());

  // Decode a bearer token into req.user (optional) for every request.
  app.use(attachUser);

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
