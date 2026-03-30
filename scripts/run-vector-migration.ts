import { config } from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

async function runVectorMigration() {
  // Create a dedicated pool for migration
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const client = await pool.connect();

  try {
    console.log('Step 1: Enabling pgvector extension...');
    const preScript = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0004_pre_enable_pgvector.sql'),
      'utf-8'
    );
    await client.query(preScript);
    console.log('✓ pgvector extension enabled');

    console.log('\nStep 2: Running main migration (0004_robust_king_bedlam.sql)...');
    const mainScript = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0004_robust_king_bedlam.sql'),
      'utf-8'
    );
    await client.query(mainScript);
    console.log('✓ Main migration applied');

    console.log('\nStep 3: Creating HNSW indexes...');
    const postScript = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0004_post_create_hnsw_indexes.sql'),
      'utf-8'
    );
    await client.query(postScript);
    console.log('✓ HNSW indexes created');

    console.log('\n✅ Vector migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runVectorMigration().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
