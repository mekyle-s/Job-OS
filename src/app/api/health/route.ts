import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Never cache health checks

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check database connectivity
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, current_database() as db');
    client.release();

    health.checks = {
      ...(health.checks as object),
      database: {
        status: 'ok',
        database: result.rows[0].db,
        serverTime: result.rows[0].now,
      },
    };
  } catch (error) {
    health.status = 'degraded';
    health.checks = {
      ...(health.checks as object),
      database: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }

  // Check pgvector extension
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
    );
    client.release();

    health.checks = {
      ...(health.checks as object),
      pgvector: {
        status: result.rows.length > 0 ? 'ok' : 'missing',
        version: result.rows[0]?.extversion || null,
      },
    };
  } catch (error) {
    health.checks = {
      ...(health.checks as object),
      pgvector: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
