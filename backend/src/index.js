'use strict';

const http = require('http');
const { createApp } = require('./app');
const { initSockets } = require('./sockets');
const env = require('./config/env');

const app = createApp();
const server = http.createServer(app);

// Attach Socket.io (real-time score + camera events) to the same server.
const io = initSockets(server);
app.set('io', io);

server.listen(env.port, () => {
  console.log(`\n  FieldCast API  →  http://localhost:${env.port}`);
  console.log(`  Socket.io      →  ws://localhost:${env.port}`);
  console.log(`  Frontend CORS  →  ${env.frontendUrl}`);
  console.log(`  Google OAuth   →  ${env.google.enabled ? 'enabled' : 'NOT configured'}`);
  console.log(`  Streaming      →  ${env.stream.simulate ? 'SIMULATED' : 'ffmpeg + SRS'}\n`);
});

// Graceful shutdown so ffmpeg children don't leak.
function shutdown() {
  console.log('\n[server] shutting down …');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
