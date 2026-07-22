'use strict';

const prisma = require('../config/prisma');

async function list({ sport } = {}) {
  return prisma.team.findMany({
    where: sport ? { sport } : undefined,
    orderBy: sport ? { name: 'asc' } : [{ sport: 'asc' }, { name: 'asc' }],
  });
}

async function findById(id) {
  return prisma.team.findUnique({ where: { id: Number(id) } });
}

async function create({ name, shortName, logoUrl, sport }) {
  return prisma.team.create({
    data: {
      name,
      shortName,
      logoUrl: logoUrl ?? null,
      sport,
    },
  });
}

module.exports = { list, findById, create };
