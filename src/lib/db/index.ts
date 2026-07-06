import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep the per-instance pool small in serverless: many concurrent function
  // instances each hold their own pool. Use a pooled connection string
  // (e.g. Neon's -pooler endpoint) in production.
  max: process.env.VERCEL ? 5 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export { pool };
export const db = drizzle({ client: pool, schema });
