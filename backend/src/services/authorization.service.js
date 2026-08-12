'use strict';

const prisma = require('../config/prisma');

async function canManageTournament(user, tournamentId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const membership = await prisma.tournamentOrganizer.findUnique({
    where: { tournamentId_userId: { tournamentId: Number(tournamentId), userId: Number(user.sub) } },
  });
  return Boolean(membership);
}

async function canManageMatch(user, matchId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const match = await prisma.match.findUnique({ where: { id: Number(matchId) }, select: { tournamentId: true } });
  return match?.tournamentId ? canManageTournament(user, match.tournamentId) : false;
}

module.exports = { canManageTournament, canManageMatch };
