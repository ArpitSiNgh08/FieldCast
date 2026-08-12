'use strict';

const prisma = require('../config/prisma');

// ─── Cricket ─────────────────────────────────────────────────────────────────

async function addCricketEvent(matchId, e = {}) {
  return prisma.cricketEvent.create({
    data: {
      matchId: Number(matchId),
      innings: e.innings ?? 1,
      overNumber: e.overNumber ?? 0,
      battingTeamId: e.battingTeamId ? Number(e.battingTeamId) : null,
      runsTotal: e.runsTotal ?? 0,
      wickets: e.wickets ?? 0,
      runRate: e.runRate ?? 0,
      extras: e.extras ?? 0,
      description: e.description ?? null,
    },
  });
}

async function listCricketEvents(matchId) {
  return prisma.cricketEvent.findMany({
    where: { matchId: Number(matchId) },
    orderBy: [{ innings: 'asc' }, { overNumber: 'asc' }],
  });
}

// ─── Football ─────────────────────────────────────────────────────────────────

async function addFootballEvent(matchId, e = {}) {
  return prisma.footballEvent.create({
    data: {
      matchId: Number(matchId),
      half: e.half ?? 1,
      minute: e.minute ?? 0,
      extraTimeMinute: e.extraTimeMinute ?? 0,
      eventType: e.eventType,
      teamId: e.teamId ? Number(e.teamId) : null,
      playerId: e.playerId ? Number(e.playerId) : null,
      playerName: e.playerName ?? null,
      jerseyNumber: e.jerseyNumber ?? null,
    },
  });
}

async function listFootballEvents(matchId) {
  const rows = await prisma.footballEvent.findMany({
    where: { matchId: Number(matchId) },
    include: {
      team: { select: { id: true, name: true, shortName: true } },
      player: { select: { id: true, name: true } },
    },
    orderBy: [{ half: 'asc' }, { minute: 'asc' }, { extraTimeMinute: 'asc' }, { id: 'asc' }],
  });

  // Flatten to match the shape the scorecard page expects
  return rows.map((r) => ({
    id: r.id,
    match_id: r.matchId,
    half: r.half,
    minute: r.minute,
    extra_time_minute: r.extraTimeMinute,
    event_type: r.eventType,
    team_id: r.teamId,
    player_name: r.playerName,
    player_id: r.playerId,
    jersey_number: r.jerseyNumber,
    team_name: r.team?.name ?? null,
    team_short: r.team?.shortName ?? null,
  }));
}

// ─── Basketball ───────────────────────────────────────────────────────────────

/** Upsert a quarter's numbers for a basketball match. */
async function upsertBasketballQuarter(matchId, q = {}) {
  return prisma.basketballQuarter.upsert({
    where: {
      matchId_quarter: {
        matchId: Number(matchId),
        quarter: q.quarter ?? 1,
      },
    },
    create: {
      matchId: Number(matchId),
      quarter: q.quarter ?? 1,
      teamAPoints: q.teamAPoints ?? 0,
      teamBPoints: q.teamBPoints ?? 0,
      teamAFouls: q.teamAFouls ?? 0,
      teamBFouls: q.teamBFouls ?? 0,
      teamATimeouts: q.teamATimeouts ?? 0,
      teamBTimeouts: q.teamBTimeouts ?? 0,
    },
    update: {
      teamAPoints: q.teamAPoints ?? 0,
      teamBPoints: q.teamBPoints ?? 0,
      teamAFouls: q.teamAFouls ?? 0,
      teamBFouls: q.teamBFouls ?? 0,
      teamATimeouts: q.teamATimeouts ?? 0,
      teamBTimeouts: q.teamBTimeouts ?? 0,
    },
  });
}

async function listBasketballQuarters(matchId) {
  return prisma.basketballQuarter.findMany({
    where: { matchId: Number(matchId) },
    orderBy: { quarter: 'asc' },
  });
}

module.exports = {
  addCricketEvent,
  listCricketEvents,
  addFootballEvent,
  listFootballEvents,
  upsertBasketballQuarter,
  listBasketballQuarters,
};
