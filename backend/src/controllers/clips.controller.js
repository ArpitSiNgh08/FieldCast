'use strict';

const Matches = require('../models/matches.model');
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
  const job = await clipService.queue(match.id);
  res.status(202).json(job);
}

module.exports = { list, create };
