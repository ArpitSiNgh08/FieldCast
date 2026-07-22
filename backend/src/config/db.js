'use strict';

const { Pool } = require('pg');
const env = require('./env');

// A single shared connection pool for the whole process.
const pool = new Pool({ connectionString: env.databaseUrl });

pool.on('error', (err) => {
  // Log unexpected errors on idle clients rather than crashing the process.
  console.error('[db] unexpected idle client error:', err.message);
});

/**
 * Run a parameterised query.
 * @param {string} text SQL with $1, $2 … placeholders
 * @param {any[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
function query(text, params) {
  return pool.query(text, params);
}

/** Run a set of statements inside a transaction. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
