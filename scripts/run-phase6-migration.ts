import { config } from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Load environment variables per DEV-027
config({ path: '.env.local' });

async function runPhase6Migration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const client = await pool.connect();

  try {
    console.log('Running Phase 6 migration (0005_careful_iceman)...');

    // Read the migration file
    const migrationScript = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0005_careful_iceman.sql'),
      'utf-8'
    );

    // Calculate hash for tracking (same algorithm drizzle uses)
    const hash = crypto.createHash('sha256').update(migrationScript).digest('hex');

    // Check if already applied
    const checkResult = await client.query(
      'SELECT * FROM drizzle.__drizzle_migrations WHERE hash = $1',
      [hash]
    );

    if (checkResult.rows.length > 0) {
      console.log('✓ Migration already applied, skipping');
      return;
    }

    // Apply the migration
    await client.query(migrationScript);
    console.log('✓ Schema changes applied');

    // Record in migrations table
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       VALUES ($1, $2)`,
      [hash, Date.now()]
    );
    console.log('✓ Migration recorded');

    console.log('\n✅ Phase 6 migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase6Migration().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
