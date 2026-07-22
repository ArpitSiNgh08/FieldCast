'use strict';

/** 404 handler for unmatched routes. */
function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

/** Central error handler. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: err.publicMessage || err.message || 'Server error' });
}

/** Wrap an async route handler so thrown errors reach errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { notFound, errorHandler, asyncHandler };
