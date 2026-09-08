'use strict';

const http = require('http');
const { createApp } = require('./app');
const { initSockets } = require('./sockets');
const env = require('./config/env');
const bcrypt = require('bcrypt');
const users = require('./models/users.model');

// Silence noisy node-pg query pipeline deprecation warning in development
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message && warning.message.includes('client.query()')) {
    return;
  }
  console.warn(warning);
});

const app = createApp();
const server = http.createServer(app);

// Handle server error events (e.g., EADDRINUSE) gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${env.port} is already in use (EADDRINUSE). Please close the process using port ${env.port} and restart.`);
    process.exit(1);
  } else {
    console.error('[server] Unhandled server error:', err);
    process.exit(1);
  }
});

// Attach Socket.io (real-time score + camera events) to the same server.
const io = initSockets(server);
app.set('io', io);

async function start() {
  if (env.adminCredentials.email && env.adminCredentials.password) {
    const passwordHash = await bcrypt.hash(env.adminCredentials.password, 12);
    await users.ensureCredentialAdmin({ ...env.adminCredentials, passwordHash });
  }
  server.listen(env.port, () => {
    console.log(`\n  FieldCast API  →  http://localhost:${env.port}`);
    console.log(`  Socket.io      →  ws://localhost:${env.port}`);
    console.log(`  Frontend CORS  →  ${env.frontendUrl}`);
    console.log(`  Google OAuth   →  ${env.google.enabled ? 'enabled' : 'NOT configured'}`);
    console.log(`  Streaming      →  ${env.stream.simulate ? 'SIMULATED' : 'ffmpeg + SRS'}\n`);
  });
}

start().catch((error) => {
  console.error('[server] startup failed', error);
  process.exit(1);
});

// Graceful shutdown so server releases port 4000 and active connections immediately.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] shutting down (${signal}) …`);
  
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  
  server.close(() => {
    if (signal === 'SIGUSR2') {
      process.kill(process.pid, 'SIGUSR2');
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => process.exit(0), 500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGBREAK', () => shutdown('SIGBREAK'));
process.once('SIGUSR2', () => shutdown('SIGUSR2'));


