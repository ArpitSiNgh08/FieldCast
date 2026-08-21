'use strict';

const prisma = require('../config/prisma');

// FieldCast tournament rules: every win is worth 3 points. Draws are worth 1.
function winPoints() {
  return 3;
}

/**
 * Recompute the entire standings table for a tournament from its completed
 * matches (idempotent — safe to run after every result). Final scores are read
 * from each match's match_state row.
 */
async function recomputeForTournament(tournamentId) {
  const id = Number(tournamentId);

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { sport: true, teams: { select: { teamId: true } } },
  });
  if (!tournament) return;

  const win = winPoints();

  const matches = await prisma.match.findMany({
    where: {
      tournamentId: id,
      status: 'completed',
      resultType: 'played',
      // Legacy fixtures had no stage. New knockout fixtures must not change pool standings.
      OR: [{ stageType: null }, { stageType: 'pool' }],
    },
    select: {
      teamAId: true,
      teamBId: true,
      winnerTeamId: true,
      state: { select: { teamAScore: true, teamBScore: true } },
    },
  });

  // Aggregate per team.
  const table = new Map();
  const blank = () => ({
    played: 0, won: 0, lost: 0, drawn: 0, points: 0,
    scoredFor: 0, scoredAgainst: 0,
  });
  const get = (teamId) => {
    if (!table.has(teamId)) table.set(teamId, blank());
    return table.get(teamId);
  };

  // Every approved tournament team appears even before its first result.
  for (const membership of tournament.teams) get(membership.teamId);

  for (const m of matches) {
    const a = m.state?.teamAScore ?? 0;
    const b = m.state?.teamBScore ?? 0;

    const A = get(m.teamAId);
    const B = get(m.teamBId);
    A.played++; B.played++;
    A.scoredFor += a; A.scoredAgainst += b;
    B.scoredFor += b; B.scoredAgainst += a;

    // Prefer the recorded winner; fall back to comparing scores.
    let winner = m.winnerTeamId;
    if (!winner && a !== b) winner = a > b ? m.teamAId : m.teamBId;

    if (!winner) {
      A.drawn++; B.drawn++;
      A.points += 1; B.points += 1;
    } else if (winner === m.teamAId) {
      A.won++; A.points += win; B.lost++;
    } else {
      B.won++; B.points += win; A.lost++;
    }
  }

  const rows = Array.from(table.entries()).map(([teamId, s]) => ({
    tournamentId: id,
    teamId,
    played: s.played,
    won: s.won,
    lost: s.lost,
    drawn: s.drawn,
    points: s.points,
    scoredFor: s.scoredFor,
    scoredAgainst: s.scoredAgainst,
  }));

  // Multiple result requests can finish close together. Serialize writes for
  // this tournament at the database level so two app processes cannot both
  // delete and then insert the same unique (tournament, team) rows.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1178878804, ${id})`;
    await tx.standing.deleteMany({ where: { tournamentId: id } });
    if (rows.length) await tx.standing.createMany({ data: rows });
  });
}

module.exports = { recomputeForTournament };
