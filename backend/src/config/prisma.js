'use strict';

require('dotenv/config');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

/**
 * Prisma 7 client singleton using the official pg driver adapter.
 *
 * Prisma 7 removed `datasources` and `datasourceUrl` from the PrismaClient
 * constructor. The correct way to pass a connection URL is via a driver adapter.
 * See: https://pris.ly/d/prisma7-client-config
 *
 * DATABASE_URL is read from .env via dotenv/config (loaded at the top).
 *
 * The global singleton prevents multiple pool/client instances during
 * nodemon hot-reloads in development.
 */
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ??
  (() => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error'] // change to ['query','warn','error'] for SQL logging
          : ['warn', 'error'],
    });
  })();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
