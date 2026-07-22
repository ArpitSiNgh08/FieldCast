'use strict';

const prisma = require('../config/prisma');

// Points awarded for a win, per sport. Draws are always worth 1.
function winPoints(sport) {
  return sport === 'football' ? 3 : 2;
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
    select: { sport: true },
  });
  if (!tournament) return;

  const { sport } = tournament;
  const win = winPoints(sport);

  const matches = await prisma.match.findMany({
    where: { tournamentId: id, status: 'completed' },
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

  // Persist: reset this tournament's standings, then insert fresh rows.
  // Done in a transaction for consistency.
  await prisma.$transaction([
    prisma.standing.deleteMany({ where: { tournamentId: id } }),
    ...Array.from(table.entries()).map(([teamId, s]) =>
      prisma.standing.create({
        data: {
          tournamentId: id,
          teamId,
          played: s.played,
          won: s.won,
          lost: s.lost,
          drawn: s.drawn,
          points: s.points,
          scoredFor: s.scoredFor,
          scoredAgainst: s.scoredAgainst,
        },
      })
    ),
  ]);
}

module.exports = { recomputeForTournament };
