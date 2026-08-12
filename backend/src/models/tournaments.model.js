'use strict';

const prisma = require('../config/prisma');

const DETAIL_INCLUDE = {
  creator: { select: { id: true, name: true, email: true } },
  teams: {
    orderBy: { createdAt: 'asc' },
    include: {
      team: {
        include: {
          players: {
            orderBy: { createdAt: 'asc' },
            include: { player: true },
          },
        },
      },
    },
  },
  organizers: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  },
};

function list({ sport, creatorId, approvalStatus = 'approved' } = {}) {
  return prisma.tournament.findMany({
    where: {
      ...(sport ? { sport } : {}),
      ...(creatorId ? { creatorId: Number(creatorId) } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
    },
    include: DETAIL_INCLUDE,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
}

function findById(id) {
  return prisma.tournament.findUnique({ where: { id: Number(id) }, include: DETAIL_INCLUDE });
}

function create({ name, sport, format, startDate, endDate, imageUrl, creatorId }) {
  return prisma.tournament.create({
    data: {
      name, sport, format: format ?? null, imageUrl: imageUrl ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      creatorId: Number(creatorId), approvalStatus: 'draft',
    },
    include: DETAIL_INCLUDE,
  });
}

function update(id, data) {
  const allowed = {};
  for (const key of ['name', 'sport', 'format', 'imageUrl']) {
    if (data[key] !== undefined) allowed[key] = data[key] || null;
  }
  if (data.startDate !== undefined) allowed.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) allowed.endDate = data.endDate ? new Date(data.endDate) : null;
  return prisma.tournament.update({ where: { id: Number(id) }, data: allowed, include: DETAIL_INCLUDE });
}

async function addTeam(tournamentId, { name, shortName, sport, ownerId }) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: { name, shortName, sport, ownerId: Number(ownerId) } });
    await tx.tournamentTeam.create({ data: { tournamentId: Number(tournamentId), teamId: team.id } });
    return team;
  });
}

function updateTeam(teamId, data) {
  return prisma.team.update({
    where: { id: Number(teamId) },
    data: { name: data.name, shortName: data.shortName, logoUrl: data.logoUrl ?? undefined },
  });
}

async function addPlayer(teamId, { playerId, name, jerseyNumber, position, ownerId }) {
  return prisma.$transaction(async (tx) => {
    const player = playerId
      ? await tx.player.findFirstOrThrow({ where: { id: Number(playerId), ownerId: Number(ownerId) } })
      : await tx.player.create({ data: { name: name.trim(), ownerId: Number(ownerId) } });
    return tx.teamPlayer.create({
      data: { teamId: Number(teamId), playerId: player.id, jerseyNumber: String(jerseyNumber), position: position || null },
      include: { player: true },
    });
  });
}

function removePlayer(teamId, playerId) {
  return prisma.teamPlayer.delete({ where: { teamId_playerId: { teamId: Number(teamId), playerId: Number(playerId) } } });
}

function removeTeam(tournamentId, teamId) {
  return prisma.tournamentTeam.delete({ where: { tournamentId_teamId: { tournamentId: Number(tournamentId), teamId: Number(teamId) } } });
}

function setSubmission(id) {
  return prisma.tournament.update({
    where: { id: Number(id) },
    data: { approvalStatus: 'submitted', submittedAt: new Date(), rejectionReason: null },
    include: DETAIL_INCLUDE,
  });
}

function review(id, { decision, reason, reviewerId }) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.update({
      where: { id: Number(id) },
      data: {
        approvalStatus: decision,
        rejectionReason: decision === 'rejected' ? reason : null,
        reviewedById: Number(reviewerId), reviewedAt: new Date(),
      },
    });
    if (decision === 'approved' && tournament.creatorId) {
      await tx.tournamentOrganizer.upsert({
        where: { tournamentId_userId: { tournamentId: tournament.id, userId: tournament.creatorId } },
        create: { tournamentId: tournament.id, userId: tournament.creatorId, addedById: Number(reviewerId) },
        update: {},
      });
    }
    return tx.tournament.findUnique({ where: { id: tournament.id }, include: DETAIL_INCLUDE });
  });
}

function listPlayers(ownerId) {
  return prisma.player.findMany({ where: { ownerId: Number(ownerId) }, orderBy: { name: 'asc' } });
}

function listOrganized(userId) {
  return prisma.tournament.findMany({
    where: { approvalStatus: 'approved', organizers: { some: { userId: Number(userId) } } },
    include: DETAIL_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
}

async function addOrganizer(tournamentId, email, addedById) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  await prisma.tournamentOrganizer.upsert({
    where: { tournamentId_userId: { tournamentId: Number(tournamentId), userId: user.id } },
    create: { tournamentId: Number(tournamentId), userId: user.id, addedById: Number(addedById) },
    update: {},
  });
  return findById(tournamentId);
}

module.exports = { list, findById, create, update, addTeam, updateTeam, addPlayer, removePlayer, removeTeam, setSubmission, review, listPlayers, listOrganized, addOrganizer };
