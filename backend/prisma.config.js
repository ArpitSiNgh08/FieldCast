// prisma.config.js — CommonJS config for Prisma 7
// Uses Node built-ins only (no external deps) to parse .env before Prisma reads the config.

const path = require('path');
const fs = require('fs');

// Parse .env synchronously — must happen before defineConfig is called
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (process.env[key] !== undefined) continue; // don't overwrite shell env
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const { defineConfig } = require('prisma/config');

/**
 * Prisma 7 config.
 * The correct field is `datasource.url` (not migrate.connectionString).
 *
 * DATABASE_URL examples:
 *   Local Docker:  postgresql://fieldcast:fieldcast@localhost:5432/fieldcast
 *   Neon (prod):   postgresql://user:pass@ep-xxx.neon.tech/fieldcast?sslmode=require
 */
module.exports = defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'node prisma/seed.js',
  },
});
