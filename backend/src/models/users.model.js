'use strict';

const prisma = require('../config/prisma');

/**
 * Insert or update a user by email, returning the full row.
 * Role is decided by the caller (admin whitelist) — passed in on create.
 */
async function upsertByEmail({ email, name, avatarUrl, role }) {
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: {
      email: email.toLowerCase(),
      name: name ?? null,
      avatarUrl: avatarUrl ?? null,
      role: role ?? 'viewer',
    },
    update: {
      name: name ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
      role: role ?? undefined,
    },
  });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id: Number(id) } });
}

module.exports = { upsertByEmail, findById };
