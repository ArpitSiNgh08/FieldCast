'use strict';

const prisma = require('../config/prisma');

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
    sport: m.sport,
    scheduledAt: m.scheduledAt,
    status: m.status,
    winnerTeamId: m.winnerTeamId,
    activeCamera: m.activeCamera,
    streamUrl: m.streamUrl,
    replayUrl: m.replayUrl,
    // HLS URL derived from the active camera if streamUrl not overridden
    liveUrl: m.streamUrl ?? null,
    teamA: shapeTeam(m.teamA),
    teamB: shapeTeam(m.teamB),
    state: shapeState(m.state),
    createdAt: m.createdAt,
  };
}

const MATCH_INCLUDE = {
  tournament: { select: { name: true } },
  teamA: true,
  teamB: true,
  state: true,
};

// ─── queries ─────────────────────────────────────────────────────────────────

async function list({ sport, status, tournamentId } = {}) {
  const where = {};
  if (sport) where.sport = sport;
  if (status) where.status = status;
  if (tournamentId) where.tournamentId = Number(tournamentId);

  const rows = await prisma.match.findMany({
    where,
    include: MATCH_INCLUDE,
    orderBy: [
      { status: 'asc' },      // 'live' sorts before 'upcoming' before 'completed'
      { scheduledAt: 'desc' },
      { id: 'desc' },
    ],
  });

  return rows.map(shapeMatch);
}

async function findById(id) {
  const m = await prisma.match.findUnique({
    where: { id: Number(id) },
    include: MATCH_INCLUDE,
  });
  return m ? shapeMatch(m) : null;
}

async function create({ tournamentId, teamAId, teamBId, sport, scheduledAt }) {
  const m = await prisma.match.create({
    data: {
      tournamentId: tournamentId ? Number(tournamentId) : null,
      teamAId: Number(teamAId),
      teamBId: Number(teamBId),
      sport,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
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

async function setResult(id, { winnerTeamId, replayUrl }) {
  const m = await prisma.match.update({
    where: { id: Number(id) },
    data: {
      status: 'completed',
      winnerTeamId: winnerTeamId ? Number(winnerTeamId) : null,
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

module.exports = { list, findById, create, setStatus, setResult, setActiveCamera, shapeMatch };
