'use strict';

const matchState = require('../models/matchState.model');
const events = require('../models/events.model');
const Matches = require('../models/matches.model');
const cameraSwitcher = require('../services/cameraSwitcher');
const authorization = require('../services/authorization.service');

const room = (matchId) => `match:${matchId}`;
const scoreQueues = new Map();

/** Guard: only an explicit organiser of this match's tournament may mutate. */
async function assertManager(socket, matchId) {
  if (!(await authorization.canManageMatch(socket.data.user, matchId))) {
    const err = new Error('Tournament organiser access required');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

/**
 * Serialize score events for each match inside this backend process. This keeps
 * two organiser devices from reading the same score and losing one of two
 * near-simultaneous goals.
 */
async function enqueueScoreUpdate(matchId, task) {
  const id = Number(matchId);
  const previous = scoreQueues.get(id) || Promise.resolve();
  const operation = previous.catch(() => undefined).then(task);
  scoreQueues.set(id, operation);
  try {
    return await operation;
  } finally {
    if (scoreQueues.get(id) === operation) scoreQueues.delete(id);
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
    const minute = Number(d.minute);
    const extraTimeMinute = Number(d.extraTimeMinute || 0);
    if (!Number.isInteger(minute) || minute < 0 || minute > 120) throw new Error('Minute must be between 0 and 120');
    if (!Number.isInteger(extraTimeMinute) || extraTimeMinute < 0 || extraTimeMinute > 30) throw new Error('Extra-time minute must be between 0 and 30');
    if (!['goal', 'yellow_card', 'red_card', 'substitution'].includes(d.eventType)) throw new Error('Invalid football event');
    if (!team) throw new Error('Choose a team from this match');

    const history = await events.listFootballEvents(matchId);
    const activePlayerIds = new Set(team.players.filter((candidate) => candidate.squadRole === 'playing').map((candidate) => candidate.playerId));
    for (const event of history.filter((candidate) => candidate.team_id === team.id && candidate.event_type === 'substitution')) {
      if (event.player_out_id) activePlayerIds.delete(event.player_out_id);
      if (event.player_in_id) activePlayerIds.add(event.player_in_id);
    }

    if (d.eventType === 'substitution') {
      const outgoing = team.players.find((candidate) => candidate.playerId === Number(d.playerOutId));
      const incoming = team.players.find((candidate) => candidate.playerId === Number(d.playerInId));
      if (!outgoing || !incoming || outgoing.playerId === incoming.playerId) throw new Error('Choose two different players from the same team roster');
      if (!activePlayerIds.has(outgoing.playerId)) throw new Error('The player going off is not currently on the field');
      if (activePlayerIds.has(incoming.playerId)) throw new Error('The player coming on is already on the field');
      await events.addFootballEvent(matchId, {
        ...d,
        teamId: team.id,
        playerId: outgoing.playerId,
        playerName: outgoing.player.name,
        jerseyNumber: outgoing.jerseyNumber,
        playerOutId: outgoing.playerId,
        playerOutName: outgoing.player.name,
        playerOutJersey: outgoing.jerseyNumber,
        playerInId: incoming.playerId,
        playerInName: incoming.player.name,
        playerInJersey: incoming.jerseyNumber,
        minute,
        extraTimeMinute,
      });
      return { eventType: d.eventType, teamId: team.id };
    }

    const membership = team.players.find((candidate) => candidate.playerId === Number(d.playerId));
    if (!membership || !activePlayerIds.has(membership.playerId)) throw new Error('Choose a player currently on the field');
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
  // Viewers and organisers join the same match room to receive live updates.
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

  // Organiser updates the score → persist state (+ detail) → broadcast to the room.
  socket.on('score:update', async ({ matchId, sport, state, detail }, ack) => {
    try {
      await assertManager(socket, matchId);
      const newState = await enqueueScoreUpdate(matchId, async () => {
        const match = await Matches.findById(matchId);
        if (!match || match.sport !== sport) throw new Error('Invalid match sport');
        if (sport === 'football' && !detail) throw new Error('Football score updates require a match event');
        const recorded = await recordDetail(matchId, sport, { detail });
        let statePatch = state || {};
        if (sport === 'football') {
          // Football scores are server-authoritative. A stale organiser screen
          // may update the clock or a card, but cannot roll the score backward.
          const current = await matchState.findByMatch(matchId);
          statePatch = {
            ...statePatch,
            teamAScore: current.teamAScore + (recorded?.eventType === 'goal' && recorded.teamId === match.teamA.id ? 1 : 0),
            teamBScore: current.teamBScore + (recorded?.eventType === 'goal' && recorded.teamId === match.teamB.id ? 1 : 0),
          };
        }
        return matchState.update(matchId, statePatch);
      });
      io.to(room(matchId)).emit('score:updated', { matchId, state: newState });
      if (typeof ack === 'function') ack({ ok: true, state: newState });
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  // Organiser switches the active camera → ffmpeg re-pipe → broadcast.
  socket.on('camera:switch', async ({ matchId, cameraId }, ack) => {
    try {
      await assertManager(socket, matchId);
      const match = await Matches.findById(matchId);
      const configured = match?.cameras.some((camera) => camera.streamKey === cameraId);
      if (!configured) throw new Error('Camera is not configured for this match');
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
