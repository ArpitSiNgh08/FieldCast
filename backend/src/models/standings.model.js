'use strict';

const prisma = require('../config/prisma');

/** Standings for a tournament, ordered by points → score difference → wins → name. */
async function listByTournament(tournamentId) {
  const id = Number(tournamentId);
  const [rows, overrides, memberships] = await Promise.all([
    prisma.standing.findMany({
      where: { tournamentId: id },
      include: { team: { select: { name: true, shortName: true, logoUrl: true } } },
    }),
    prisma.standingOverride.findMany({ where: { tournamentId: id } }),
    prisma.tournamentTeam.findMany({
      where: { tournamentId: id },
      select: { teamId: true, poolId: true, pool: { select: { name: true, sortOrder: true } } },
    }),
  ]);
  const overrideByTeam = new Map(overrides.map((row) => [row.teamId, row]));
  const membershipByTeam = new Map(memberships.map((row) => [row.teamId, row]));

  return rows
    .map((r) => {
      const o = overrideByTeam.get(r.teamId);
      const value = (key) => o?.[key] ?? r[key];
      const scoredFor = value('scoredFor');
      const scoredAgainst = value('scoredAgainst');
      const membership = membershipByTeam.get(r.teamId);
      return {
        teamId: r.teamId, teamName: r.team.name, teamShort: r.team.shortName, teamLogo: r.team.logoUrl,
        poolId: membership?.poolId ?? null, poolName: membership?.pool?.name ?? null, poolSortOrder: membership?.pool?.sortOrder ?? null,
        played: value('played'), won: value('won'), lost: value('lost'), drawn: value('drawn'), points: value('points'),
        scoredFor, scoredAgainst, scoreDiff: scoredFor - scoredAgainst, overridden: Boolean(o),
      };
    })
    .sort((a, b) => {
      if ((a.poolSortOrder ?? -1) !== (b.poolSortOrder ?? -1)) return (a.poolSortOrder ?? -1) - (b.poolSortOrder ?? -1);
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      if (b.won !== a.won) return b.won - a.won;
      return a.teamName.localeCompare(b.teamName);
    });
}

module.exports = { listByTournament };
