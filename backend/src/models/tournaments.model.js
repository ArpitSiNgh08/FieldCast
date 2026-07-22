'use strict';

const prisma = require('../config/prisma');

async function list({ sport } = {}) {
  return prisma.tournament.findMany({
    where: sport ? { sport } : undefined,
    orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
  });
}

async function findById(id) {
  return prisma.tournament.findUnique({ where: { id: Number(id) } });
}

async function create({ name, sport, format, startDate, endDate, status }) {
  return prisma.tournament.create({
    data: {
      name,
      sport,
      format: format ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status ?? 'upcoming',
    },
  });
}

module.exports = { list, findById, create };
