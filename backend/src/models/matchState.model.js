'use strict';

const prisma = require('../config/prisma');

function shapeState(s) {
  if (!s) return null;
  return {
    matchId: s.matchId,
    teamAScore: s.teamAScore,
    teamBScore: s.teamBScore,
    period: s.period,
    periodLabel: s.periodLabel,
    status: s.status,
    extra: s.extra ?? {},
    updatedAt: s.updatedAt,
  };
}

async function findByMatch(matchId) {
  const s = await prisma.matchState.findUnique({
    where: { matchId: Number(matchId) },
  });
  return shapeState(s);
}

/**
 * Upsert the live overlay state for a match. Only provided fields are applied;
 * the rest keep their current values. Mirrors the old ON CONFLICT … DO UPDATE
 * behaviour from the raw-pg version.
 */
async function update(matchId, patch = {}) {
  const id = Number(matchId);

  const s = await prisma.matchState.upsert({
    where: { matchId: id },
    create: {
      matchId: id,
      teamAScore: patch.teamAScore ?? 0,
      teamBScore: patch.teamBScore ?? 0,
      period: patch.period ?? 1,
      periodLabel: patch.periodLabel ?? '',
      status: patch.status ?? 'break',
      extra: patch.extra ?? {},
    },
    update: {
      ...(patch.teamAScore !== undefined && { teamAScore: patch.teamAScore }),
      ...(patch.teamBScore !== undefined && { teamBScore: patch.teamBScore }),
      ...(patch.period !== undefined && { period: patch.period }),
      ...(patch.periodLabel !== undefined && { periodLabel: patch.periodLabel }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.extra !== undefined && { extra: patch.extra }),
    },
  });

  return shapeState(s);
}

module.exports = { findByMatch, update };
