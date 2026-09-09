'use strict';

/**
 * Migration Script: Clone data from Old Neon DB to New Neon DB
 * Usage:
 *   node backend/src/scripts/migrateDb.js "<OLD_DATABASE_URL>" "<NEW_DATABASE_URL>"
 */

const { Client } = require('pg');

const tables = [
  'users',
  'teams',
  'players',
  'tournaments',
  'tournament_pools',
  'tournament_organizers',
  'tournament_teams',
  'team_players',
  'matches',
  'match_views',
  'clip_jobs',
  'google_drive_connections',
  'tournament_clip_destinations',
  'match_cameras',
  'standings',
  'standing_overrides',
  'match_state',
  'cricket_events',
  'football_events',
  'basketball_quarters',
];

async function migrate() {
  const sourceUrl = process.argv[2] || process.env.SOURCE_DB_URL;
  const targetUrl = process.argv[3] || process.env.TARGET_DB_URL;

  if (!sourceUrl || !targetUrl) {
    console.error('Usage: node backend/src/scripts/migrateDb.js "<SOURCE_DB_URL>" "<TARGET_DB_URL>"');
    process.exit(1);
  }

  console.log('🔗 Connecting to Source DB...');
  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  await source.connect();

  console.log('🔗 Connecting to Target DB...');
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });
  await target.connect();

  try {
    for (const table of tables) {
      console.log(`\n📦 Migrating table [${table}]...`);
      const { rows } = await source.query(`SELECT * FROM "${table}"`);
      if (rows.length === 0) {
        console.log(`   └─ Table [${table}] is empty. Skipping.`);
        continue;
      }

      const columns = Object.keys(rows[0]).map((col) => `"${col}"`).join(', ');

      let inserted = 0;
      for (const row of rows) {
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`;
        await target.query(query, values);
        inserted++;
      }
      console.log(`   └─ Successfully copied ${inserted} / ${rows.length} rows into [${table}].`);

      // Reset sequence if table has autoincrement id
      if (Object.keys(rows[0]).includes('id')) {
        await target.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`).catch(() => {});
      }
    }
    console.log('\n✅ Data Migration Completed Successfully!');
  } catch (error) {
    console.error('\n❌ Migration Failed:', error);
  } finally {
    await source.end();
    await target.end();
  }
}

migrate();
