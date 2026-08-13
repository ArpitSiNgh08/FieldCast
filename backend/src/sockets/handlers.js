'use strict';

const matchState = require('../models/matchState.model');
const events = require('../models/events.model');
const Matches = require('../models/matches.model');
const cameraSwitcher = require('../services/cameraSwitcher');
const authorization = require('../services/authorization.service');

const room = (matchId) => `match:${matchId}`;

/** Guard: global admins or an organiser of this match's tournament may mutate. */
async function assertManager(socket, matchId) {
  if (!(await authorization.canManageMatch(socket.data.user, matchId))) {
    const err = new Error('Tournament organiser access required');
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
  else if (sport === 'football') {
    const match = await Matches.findById(matchId);
    const team = [match?.teamA, match?.teamB].find((candidate) => candidate.id === Number(d.teamId));
    const membership = team?.players?.find((candidate) => candidate.playerId === Number(d.playerId) && candidate.squadRole === 'playing');
    if (!team || !membership) throw new Error('Choose a registered player from this match');
    const minute = Number(d.minute);
    const extraTimeMinute = Number(d.extraTimeMinute || 0);
    if (!Number.isInteger(minute) || minute < 0 || minute > 120) throw new Error('Minute must be between 0 and 120');
    if (!Number.isInteger(extraTimeMinute) || extraTimeMinute < 0 || extraTimeMinute > 30) throw new Error('Extra-time minute must be between 0 and 30');
    if (!['goal', 'yellow_card', 'red_card', 'substitution'].includes(d.eventType)) throw new Error('Invalid football event');
    await events.addFootballEvent(matchId, {
      ...d,
      teamId: team.id,
      playerId: membership.playerId,
      playerName: membership.player.name,
      jerseyNumber: membership.jerseyNumber,
      minute,
      extraTimeMinute,
    });
    return { eventType: d.eventType, teamId: team.id };
  }
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
      await assertManager(socket, matchId);
      const match = await Matches.findById(matchId);
      if (!match || match.sport !== sport) throw new Error('Invalid match sport');
      const recorded = await recordDetail(matchId, sport, { detail });
      let statePatch = state || {};
      if (sport === 'football' && recorded?.eventType === 'goal') {
        const match = await Matches.findById(matchId);
        const current = await matchState.findByMatch(matchId);
        statePatch = {
          ...statePatch,
          teamAScore: current.teamAScore + (recorded.teamId === match.teamA.id ? 1 : 0),
          teamBScore: current.teamBScore + (recorded.teamId === match.teamB.id ? 1 : 0),
        };
      }
      const newState = await matchState.update(matchId, statePatch);
      io.to(room(matchId)).emit('score:updated', { matchId, state: newState });
      if (typeof ack === 'function') ack({ ok: true, state: newState });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // Admin switches the active camera → ffmpeg re-pipe → broadcast.
  socket.on('camera:switch', async ({ matchId, cameraId }, ack) => {
    try {
      await assertManager(socket, matchId);
      const match = await Matches.findById(matchId);
      const configured = match?.cameras.some((camera) => camera.streamKey === cameraId);
      const legacyAdminCamera = socket.data.user?.role === 'admin' && match?.cameras.length === 0;
      if (!configured && !legacyAdminCamera) throw new Error('Camera is not configured for this match');
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
