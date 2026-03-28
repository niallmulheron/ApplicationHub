import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection status on first use
pool.on('connect', () => {
  console.log('  📦 Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Helper: run a single query.
 * Usage: const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
) {
  return pool.query<T>(text, params);
}

/**
 * Helper: grab a client for transactions.
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     // ... do work ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
export function getClient() {
  return pool.connect();
}
