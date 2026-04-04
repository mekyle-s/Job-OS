import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config({ path: '.env.local' });

async function checkMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const client = await pool.connect();

  try {
    // Check if migrations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'drizzle'
        AND table_name = '__drizzle_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('No migrations table found in drizzle schema');
      return;
    }

    // Get applied migrations
    const result = await client.query(`
      SELECT * FROM drizzle.__drizzle_migrations
      ORDER BY created_at;
    `);

    console.log('Applied migrations:');
    result.rows.forEach((row) => {
      console.log(`- ${row.hash} (created: ${row.created_at})`);
    });
  } catch (error) {
    console.error('Error checking migrations:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMigrations();
