#!/usr/bin/env node
/**
 * DEPRECATED — replaced by Prisma migrations.
 *
 * This file is kept for reference only. Do not use it.
 *
 * Migration workflow (Prisma):
 *   npm run db:migrate        → prisma migrate dev  (creates + applies new migration)
 *   npm run db:migrate:deploy → prisma migrate deploy (CI/CD, applies pending migrations)
 *   npm run db:reset          → prisma migrate reset --force (wipes + re-applies all, dev only)
 *
 * The baseline SQL lives in: prisma/migrations/0001_init/migration.sql
 */
console.warn(
  '[migrate.js] DEPRECATED: Use "npm run db:migrate" (prisma migrate dev) instead.'
);
process.exit(0);
