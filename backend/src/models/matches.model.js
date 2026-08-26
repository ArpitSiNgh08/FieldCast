'use strict';

const prisma = require('../config/prisma');

const UPCOMING_RETENTION_MS = 4 * 60 * 60 * 1000;

/** Upcoming fixtures remain publicly/workspace-visible until four hours after kickoff. */
function isUpcomingVisible(match, now = Date.now()) {
  if (match.status !== 'upcoming' || !match.scheduledAt) return true;
  return new Date(match.scheduledAt).getTime() >= now - UPCOMING_RETENTION_MS;
}

// ─── shape helpers ───────────────────────────────────────────────────────────
// Convert Prisma's camelCase relation output to the API response contract the
// frontend and socket handlers already expect.

function shapeTeam(t) {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    logoUrl: t.logoUrl,
    sport: t.sport,
    players: (t.players || []).map((membership) => ({
      teamId: membership.teamId,
      playerId: membership.playerId,
      jerseyNumber: membership.jerseyNumber,
      position: membership.position,
      squadRole: membership.squadRole,
      player: membership.player,
    })),
  };
}

function shapeState(s) {
  if (!s) return { teamAScore: 0, teamBScore: 0, period: 1, periodLabel: '', status: 'break', extra: {} };
  return {
    teamAScore: s.teamAScore,
    teamBScore: s.teamBScore,
    period: s.period,
    periodLabel: s.periodLabel,
    status: s.status,
    extra: s.extra ?? {},
    updatedAt: s.updatedAt,
  };
}

function shapeMatch(m) {
  return {
    id: m.id,
    tournamentId: m.tournamentId,
    tournamentName: m.tournament?.name ?? null,
    stageType: m.stageType,
    poolId: m.poolId,
    poolName: m.pool?.name ?? null,
    knockoutStage: m.knockoutStage,
    sport: m.sport,
    scheduledAt: m.scheduledAt,
    status: m.status,
    winnerTeamId: m.winnerTeamId,
    resultType: m.resultType,
    activeCamera: m.activeCamera,
    streamUrl: m.streamUrl,
    replayUrl: m.replayUrl,
    venue: m.venue,
    broadcastChecklist: m.broadcastChecklist ?? {},
    cameras: m.cameras ?? [],
    // HLS URL derived from the active camera if streamUrl not overridden
    liveUrl: m.streamUrl ?? null,
    teamA: shapeTeam(m.teamA),
    teamB: shapeTeam(m.teamB),
    state: shapeState(m.state),
    createdAt: m.createdAt,
  };
}

const MATCH_INCLUDE = {
  tournament: { select: { name: true, approvalStatus: true, creatorId: true } },
  pool: { select: { id: true, name: true } },
  teamA: { include: { players: { include: { player: true }, orderBy: { jerseyNumber: 'asc' } } } },
  teamB: { include: { players: { include: { player: true }, orderBy: { jerseyNumber: 'asc' } } } },
  state: true,
  cameras: { orderBy: { createdAt: 'asc' } },
};

// ─── queries ─────────────────────────────────────────────────────────────────

async function list({ sport, status, tournamentId } = {}) {
  const where = {};
  if (sport) where.sport = sport;
  if (status) where.status = status;
  if (tournamentId) where.tournamentId = Number(tournamentId);
  // Legacy seed fixtures have no creator. Lists contain only approved,
  // user-created tournament matches.
  where.tournament = { approvalStatus: 'approved', creatorId: { not: null } };

  const rows = await prisma.match.findMany({
    where,
    include: MATCH_INCLUDE,
    orderBy: [
      { status: 'asc' },      // 'live' sorts before 'upcoming' before 'completed'
      { scheduledAt: 'desc' },
      { id: 'desc' },
    ],
  });

  return rows.filter((match) => isUpcomingVisible(match)).map(shapeMatch);
}

async function findById(id) {
  const m = await prisma.match.findUnique({
    where: { id: Number(id) },
    include: MATCH_INCLUDE,
  });
  return m ? shapeMatch(m) : null;
}

async function create({ tournamentId, teamAId, teamBId, sport, scheduledAt, venue, stageType, poolId, knockoutStage }) {
  const m = await prisma.match.create({
    data: {
      tournamentId: tournamentId ? Number(tournamentId) : null,
      stageType,
      poolId: stageType === 'pool' ? Number(poolId) : null,
      knockoutStage: stageType === 'knockout' ? knockoutStage : null,
      teamAId: Number(teamAId),
      teamBId: Number(teamBId),
      sport,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      venue: venue?.trim() || null,
    },
    include: MATCH_INCLUDE,
  });

  // Every new match gets a default state row immediately.
  await prisma.matchState.upsert({
    where: { matchId: m.id },
    create: { matchId: m.id },
    update: {},
  });

  // Re-fetch with state so the caller gets a fully shaped object.
  return findById(m.id);
}

async function setStatus(id, status) {
  const m = await prisma.match.update({
    where: { id: Number(id) },
    data: { status },
    include: MATCH_INCLUDE,
  });
  return shapeMatch(m);
}

async function setResult(id, { winnerTeamId, replayUrl, resultType = 'played' }) {
  const m = await prisma.match.update({
    where: { id: Number(id) },
    data: {
      status: 'completed',
      winnerTeamId: winnerTeamId ? Number(winnerTeamId) : null,
      resultType,
      replayUrl: replayUrl ?? null,
    },
    include: MATCH_INCLUDE,
  });
  return shapeMatch(m);
}

async function setActiveCamera(id, cameraId) {
  const m = await prisma.match.update({
    where: { id: Number(id) },
    data: { activeCamera: cameraId },
    include: MATCH_INCLUDE,
  });
  return shapeMatch(m);
}

async function addCamera(matchId, { name, angle, streamKey }) {
  await prisma.matchCamera.create({ data: { matchId: Number(matchId), name, angle, streamKey } });
  const match = await prisma.match.findUnique({ where: { id: Number(matchId) }, select: { activeCamera: true } });
  if (!match?.activeCamera || match.activeCamera === 'camera1') {
    await prisma.match.update({ where: { id: Number(matchId) }, data: { activeCamera: streamKey } });
  }
  return findById(matchId);
}

async function removeCamera(matchId, cameraId) {
  const camera = await prisma.matchCamera.findFirst({ where: { id: Number(cameraId), matchId: Number(matchId) } });
  if (!camera) return null;
  await prisma.matchCamera.delete({ where: { id: camera.id } });
  const replacement = await prisma.matchCamera.findFirst({ where: { matchId: Number(matchId) }, orderBy: { createdAt: 'asc' } });
  await prisma.match.update({ where: { id: Number(matchId) }, data: { activeCamera: replacement?.streamKey || 'camera1' } });
  return findById(matchId);
}

async function updateBroadcastSetup(id, { venue, scheduledAt, checklist }) {
  await prisma.match.update({
    where: { id: Number(id) },
    data: {
      venue: venue?.trim() || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      broadcastChecklist: checklist || {},
    },
  });
  return findById(id);
}

module.exports = { list, findById, create, setStatus, setResult, setActiveCamera, addCamera, removeCamera, updateBroadcastSetup, shapeMatch, isUpcomingVisible };
