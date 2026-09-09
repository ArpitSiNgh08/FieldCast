'use strict';

const Matches = require('../models/matches.model');
const { withStreamUrl } = require('./matches.controller');
const prisma = require('../config/prisma');
const authorization = require('../services/authorization.service');
const clipService = require('../services/clipService');
const env = require('../config/env');

async function ensureManager(req, res) {
  if (!(await authorization.canManageMatch(req.user, req.params.id))) {
    res.status(403).json({ error: 'Tournament organiser access required' });
    return false;
  }
  return true;
}

async function list(req, res) {
  if (!(await ensureManager(req, res))) return;
  const jobs = await prisma.clipJob.findMany({
    where: { matchId: Number(req.params.id) },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  res.json(jobs);
}

async function create(req, res) {
  if (!(await ensureManager(req, res))) return;
  const match = await Matches.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.status !== 'live') return res.status(409).json({ error: 'Clips can only be requested during a live match' });
  if (!env.clips.enabled) return res.status(503).json({ error: 'Clip capture is not enabled on this server' });
  if (!match.tournamentId) return res.status(409).json({ error: 'Clips require a tournament match with a shared Drive destination' });
  const destination = await prisma.tournamentClipDestination.findUnique({ where: { tournamentId: match.tournamentId } });
  if (!destination?.folderId) return res.status(409).json({ error: 'An organizer must link Google Drive and choose a shared clips folder first' });
  const formatted = withStreamUrl(match);
  const job = await clipService.queue(match.id, req.user.sub, match.tournamentId, formatted.liveUrl);
  res.status(202).json(job);
}

async function getStatus(req, res) {
  if (!(await ensureManager(req, res))) return;
  const match = await Matches.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  const formatted = withStreamUrl(match);
  if (match.status === 'live' && formatted.liveUrl) {
    const existing = clipService.getRecorder(match.id);
    if (!existing || existing.stopped || !existing.proc) {
      await clipService.start(match.id, formatted.liveUrl);
    }
  }
  const status = await clipService.getStatus(req.params.id);
  res.json(status);
}

async function wakeService(req, res) {
  if (!(await ensureManager(req, res))) return;
  const match = await Matches.findById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.status !== 'live') return res.status(409).json({ error: 'Clips can only be requested during a live match' });
  const formatted = withStreamUrl(match);
  const status = await clipService.wake(match.id, formatted.liveUrl);
  res.json(status);
}

module.exports = { list, create, getStatus, wakeService };
