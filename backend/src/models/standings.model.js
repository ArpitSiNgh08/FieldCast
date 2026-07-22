'use strict';

const prisma = require('../config/prisma');

/** Standings for a tournament, ordered by points → score difference → wins → name. */
async function listByTournament(tournamentId) {
  const rows = await prisma.standing.findMany({
    where: { tournamentId: Number(tournamentId) },
    include: {
      team: { select: { name: true, shortName: true, logoUrl: true } },
    },
    orderBy: [
      { points: 'desc' },
      { won: 'desc' },
      // score diff is a computed column — we sort it in JS below
    ],
  });

  return rows
    .map((r) => ({
      teamId: r.teamId,
      teamName: r.team.name,
      teamShort: r.team.shortName,
      teamLogo: r.team.logoUrl,
      played: r.played,
      won: r.won,
      lost: r.lost,
      drawn: r.drawn,
      points: r.points,
      scoredFor: r.scoredFor,
      scoredAgainst: r.scoredAgainst,
      scoreDiff: r.scoredFor - r.scoredAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      if (b.won !== a.won) return b.won - a.won;
      return a.teamName.localeCompare(b.teamName);
    });
}

module.exports = { listByTournament };
