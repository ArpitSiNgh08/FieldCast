'use strict';

const matchState = require('../models/matchState.model');
const events = require('../models/events.model');
const Matches = require('../models/matches.model');
const cameraSwitcher = require('../services/cameraSwitcher');

const room = (matchId) => `match:${matchId}`;

/** Guard: only admin sockets may mutate. */
function assertAdmin(socket) {
  if (socket.data.user?.role !== 'admin') {
    const err = new Error('Admin access required');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

/**
 * Persist a sport-specific detailed event alongside the overlay state update,
 * so the scorecard/history stays in sync with the overlay.
 */
async function recordDetail(matchId, sport, payload) {
  const d = payload.detail;
  if (!d) return;
  if (sport === 'cricket') await events.addCricketEvent(matchId, d);
  else if (sport === 'football') await events.addFootballEvent(matchId, d);
  else if (sport === 'basketball') await events.upsertBasketballQuarter(matchId, d);
}

function register(io, socket) {
  // Viewer (or admin) joins a match room to receive live updates.
  socket.on('match:join', async ({ matchId }, ack) => {
    if (!matchId) return;
    socket.join(room(matchId));
    const state = await matchState.findByMatch(matchId);
    if (typeof ack === 'function') ack({ ok: true, state });
    else socket.emit('score:updated', { matchId, state });
  });

  socket.on('match:leave', ({ matchId }) => {
    if (matchId) socket.leave(room(matchId));
  });

  // Admin updates the score → persist state (+ detail) → broadcast to the room.
  socket.on('score:update', async ({ matchId, sport, state, detail }, ack) => {
    try {
      assertAdmin(socket);
      const newState = await matchState.update(matchId, state || {});
      await recordDetail(matchId, sport, { detail });
      io.to(room(matchId)).emit('score:updated', { matchId, state: newState });
      if (typeof ack === 'function') ack({ ok: true, state: newState });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // Admin switches the active camera → ffmpeg re-pipe → broadcast.
  socket.on('camera:switch', async ({ matchId, cameraId }, ack) => {
    try {
      assertAdmin(socket);
      const result = cameraSwitcher.switchCamera(matchId, cameraId);
      await Matches.setActiveCamera(matchId, cameraId);
      io.to(room(matchId)).emit('camera:switched', {
        matchId,
        cameraId,
        simulated: result.simulated,
      });
      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });
}

module.exports = { register };
