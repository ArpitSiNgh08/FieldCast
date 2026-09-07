'use strict';

const env = require('../config/env');
const prisma = require('../config/prisma');
const drive = require('../services/googleDriveOAuth.service');
const authorization = require('../services/authorization.service');

function redirect(res, matchId, query) {
  const url = new URL(matchId ? `/organizer/matches/${matchId}` : '/organizer', env.frontendUrl);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  return res.redirect(url.toString());
}

async function start(req, res) {
  if (!env.clips.driveOAuthEnabled) return res.status(503).json({ error: 'Google OAuth client credentials are not configured' });
  const { tournamentId, matchId } = req.body;
  if (!tournamentId || !matchId || !(await authorization.canManageTournament(req.user, tournamentId))) return res.status(403).json({ error: 'Tournament organiser access required' });
  res.json({ url: drive.authUrl({ userId: req.user.sub, tournamentId, matchId }) });
}

async function callback(req, res) {
  try {
    if (req.query.error) return redirect(res, req.query.matchId || '', { drive: 'error', message: 'Google Drive authorization was cancelled' });
    const result = await drive.complete(req.query.state, req.query.code);
    await prisma.tournamentClipDestination.upsert({
      where: { tournamentId: result.tournamentId },
      create: { tournamentId: result.tournamentId, googleDriveConnectionId: result.connection.id, folderId: result.connection.folderId || env.clips.folderId || '', linkedByUserId: result.linkedByUserId },
      update: { googleDriveConnectionId: result.connection.id, linkedByUserId: result.linkedByUserId },
    });
    return redirect(res, result.matchId, { drive: 'connected' });
  } catch (error) {
    return redirect(res, '', { drive: 'error', message: error.message || 'Google Drive connection failed' });
  }
}

async function status(req, res) {
  const tournamentId = Number(req.query.tournamentId);
  if (!tournamentId || !(await authorization.canManageTournament(req.user, tournamentId))) return res.status(403).json({ error: 'Tournament organiser access required' });
  const destination = await prisma.tournamentClipDestination.findUnique({ where: { tournamentId }, include: { googleDriveConnection: { select: { accountEmail: true } } } });
  res.json({ enabled: env.clips.driveOAuthEnabled, connected: Boolean(destination), accountEmail: destination?.googleDriveConnection.accountEmail || null, folderId: destination?.folderId || null, linkedByUserId: destination?.linkedByUserId || null });
}

async function setFolder(req, res) {
  const folderId = typeof req.body.folderId === 'string' ? req.body.folderId.trim() : '';
  const tournamentId = Number(req.body.tournamentId);
  if (!folderId || !tournamentId) return res.status(400).json({ error: 'tournamentId and folderId are required' });
  if (!(await authorization.canManageTournament(req.user, tournamentId))) return res.status(403).json({ error: 'Tournament organiser access required' });
  const existing = await prisma.tournamentClipDestination.findUnique({ where: { tournamentId }, include: { googleDriveConnection: true } });
  if (!existing) return res.status(409).json({ error: 'Link a Google account before choosing the clips folder' });
  await drive.verifyFolder(existing.googleDriveConnection, folderId);
  const destination = await prisma.tournamentClipDestination.update({ where: { tournamentId }, data: { folderId }, include: { googleDriveConnection: { select: { accountEmail: true } } } });
  res.json({ connected: true, accountEmail: destination.googleDriveConnection.accountEmail, folderId: destination.folderId, linkedByUserId: destination.linkedByUserId });
}

module.exports = { start, callback, status, setFolder };
