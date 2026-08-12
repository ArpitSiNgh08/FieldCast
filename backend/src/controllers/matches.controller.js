'use strict';

const Matches = require('../models/matches.model');
const standingsService = require('../services/standings.service');
const env = require('../config/env');
const prisma = require('../config/prisma');
const authorization = require('../services/authorization.service');
const cameraSwitcher = require('../services/cameraSwitcher');
const crypto = require('crypto');

const FOOTBALL_CHECKS = ['networkStable', 'powerReady', 'audioChecked', 'permissionsConfirmed', 'cameraOperatorsReady'];

async function requireManager(req, res, matchId = req.params.id) {
  if (!(await authorization.canManageMatch(req.user, matchId))) {
    res.status(403).json({ error: 'Tournament organiser access required' });
    return false;
  }
  return true;
}

/** Attach the LL-HLS URL a viewer should play for a live match. */
function withStreamUrl(match) {
  if (!match) return match;
  // Explicit override wins; otherwise derive from SRS. One active output per match.
  const derived = `${env.stream.hlsBase}/live/active_${match.id}.m3u8`;
  const selectedCamera = match.cameras?.find((camera) => camera.streamKey === match.activeCamera);
  const cameraFallbackUrl = selectedCamera
    ? `${env.stream.hlsBase}/live/${selectedCamera.streamKey}.m3u8`
    : null;
  return {
    ...match,
    // A single-camera local broadcast does not need ffmpeg re-publishing.
    // Multi-camera matches keep the stable active_<id> URL for seamless cuts.
    liveUrl: match.streamUrl || (match.cameras?.length === 1 ? cameraFallbackUrl : derived),
    cameraFallbackUrl,
    cameras: (match.cameras || []).map((camera) => ({
      ...camera,
      ingestUrl: `rtmp://${env.stream.rtmpHost}:${env.stream.rtmpPort}/live/${camera.streamKey}`,
    })),
  };
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
  const { tournamentId, teamAId, teamBId, sport, scheduledAt, venue } = req.body;
  if (!tournamentId || !teamAId || !teamBId || !sport) {
    return res.status(400).json({ error: 'tournamentId, teamAId, teamBId and sport are required' });
  }
  if (!(await authorization.canManageTournament(req.user, tournamentId))) return res.status(403).json({ error: 'Tournament organiser access required' });
  const tournament = await prisma.tournament.findUnique({ where: { id: Number(tournamentId) }, include: { teams: true } });
  if (!tournament || tournament.approvalStatus !== 'approved') return res.status(409).json({ error: 'Only approved tournaments can schedule matches' });
  if (tournament.sport !== sport) return res.status(400).json({ error: 'Match sport must match the tournament' });
  const teamIds = new Set(tournament.teams.map((x) => x.teamId));
  if (!teamIds.has(Number(teamAId)) || !teamIds.has(Number(teamBId)) || Number(teamAId) === Number(teamBId)) return res.status(400).json({ error: 'Choose two different teams from this tournament' });
  const match = await Matches.create({ tournamentId, teamAId, teamBId, sport, scheduledAt, venue });
  res.status(201).json(withStreamUrl(match));
}

async function updateStatus(req, res) {
  if (!(await requireManager(req, res))) return;
  const { status } = req.body;
  if (!['upcoming', 'live', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (status === 'live') {
    const candidate = await Matches.findById(req.params.id);
    if (!candidate?.scheduledAt || !candidate.venue) return res.status(400).json({ error: 'Kickoff time and venue are required before going live' });
    if (!candidate.cameras.length) return res.status(400).json({ error: 'Add at least one camera before going live' });
    if (candidate.sport === 'football') {
      const missing = FOOTBALL_CHECKS.filter((key) => candidate.broadcastChecklist?.[key] !== true);
      if (missing.length) return res.status(400).json({ error: 'Complete every football broadcast preflight check before going live' });
    }
    const selected = candidate.cameras.find((camera) => camera.streamKey === candidate.activeCamera) || candidate.cameras[0];
    await Matches.setActiveCamera(candidate.id, selected.streamKey);
    cameraSwitcher.switchCamera(candidate.id, selected.streamKey);
  }
  if (status === 'completed') cameraSwitcher.stop(Number(req.params.id));
  const match = await Matches.setStatus(req.params.id, status);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(withStreamUrl(match));
}

async function setResult(req, res) {
  if (!(await requireManager(req, res))) return;
  const { winnerTeamId, replayUrl } = req.body;
  const match = await Matches.setResult(req.params.id, { winnerTeamId, replayUrl });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  // Recompute standings for the tournament this match belongs to.
  if (match.tournamentId) {
    await standingsService.recomputeForTournament(match.tournamentId);
  }
  res.json(withStreamUrl(match));
}

async function updateBroadcastSetup(req, res) {
  if (!(await requireManager(req, res))) return;
  res.json(withStreamUrl(await Matches.updateBroadcastSetup(req.params.id, req.body)));
}

async function addCamera(req, res) {
  if (!(await requireManager(req, res))) return;
  const { name, angle } = req.body;
  if (!name?.trim() || !angle?.trim()) return res.status(400).json({ error: 'Camera name and angle are required' });
  const streamKey = `match${req.params.id}_${crypto.randomBytes(5).toString('hex')}`;
  const match = await Matches.addCamera(req.params.id, { name: name.trim(), angle: angle.trim(), streamKey });
  res.status(201).json(withStreamUrl(match));
}

async function removeCamera(req, res) {
  if (!(await requireManager(req, res))) return;
  const match = await Matches.removeCamera(req.params.id, req.params.cameraId);
  if (!match) return res.status(404).json({ error: 'Camera not found' });
  res.json(withStreamUrl(match));
}

module.exports = { list, get, create, updateStatus, setResult, updateBroadcastSetup, addCamera, removeCamera, withStreamUrl };
