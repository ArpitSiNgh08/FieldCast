'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');
const { verify } = require('../utils/jwt');
const handlers = require('./handlers');

/**
 * Attach a Socket.io server to an http server. Viewers connect anonymously;
 * an optional JWT in the handshake grants scoped admin/organiser abilities.
 */
function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.frontendUrl, credentials: true },
  });

  // Optional auth: decode the token if present; missing/invalid = anonymous viewer.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.data.user = verify(token);
      } catch {
        /* anonymous viewer */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    handlers.register(io, socket);
  });

  return io;
}

module.exports = { initSockets };
