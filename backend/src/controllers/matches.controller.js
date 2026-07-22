'use strict';

const Matches = require('../models/matches.model');
const standingsService = require('../services/standings.service');
const env = require('../config/env');

/** Attach the LL-HLS URL a viewer should play for a live match. */
function withStreamUrl(match) {
  if (!match) return match;
  // Explicit override wins; otherwise derive from SRS. One active output per match.
  const derived = `${env.stream.hlsBase}/live/active_${match.id}.m3u8`;
  return { ...match, liveUrl: match.streamUrl || derived };
}

async function list(req, res) {
  const { sport, status, tournamentId } = req.query;
  const matches = await Matches.list({
    sport,
    status,
    tournamentId: tournamentId ? Number(tournamentId) : undefined,
  });
  res.json(matches.map(withStreamUrl));
}

async function get(req, res) {
  const match = await Matches.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(withStreamUrl(match));
}

async function create(req, res) {
  const { tournamentId, teamAId, teamBId, sport, scheduledAt } = req.body;
  if (!teamAId || !teamBId || !sport) {
    return res.status(400).json({ error: 'teamAId, teamBId and sport are required' });
  }
  const match = await Matches.create({ tournamentId, teamAId, teamBId, sport, scheduledAt });
  res.status(201).json(withStreamUrl(match));
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!['upcoming', 'live', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const match = await Matches.setStatus(req.params.id, status);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(withStreamUrl(match));
}

async function setResult(req, res) {
  const { winnerTeamId, replayUrl } = req.body;
  const match = await Matches.setResult(req.params.id, { winnerTeamId, replayUrl });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  // Recompute standings for the tournament this match belongs to.
  if (match.tournamentId) {
    await standingsService.recomputeForTournament(match.tournamentId);
  }
  res.json(withStreamUrl(match));
}

module.exports = { list, get, create, updateStatus, setResult, withStreamUrl };
