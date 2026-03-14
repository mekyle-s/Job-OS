import { PgBoss } from 'pg-boss';
import { jobPollerHandler } from './workers/job-poller';
import { requirementParserHandler } from './workers/requirement-parser';

let boss: PgBoss | null = null;

// Track registered workers to ensure idempotency
const registeredWorkers = new Set<string>();

export function getJobQueue(): PgBoss {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DATABASE_URL!,
      max: 5, // smaller pool since this shares the database with Drizzle
      schema: 'pgboss', // isolate pg-boss tables in their own schema
    });

    boss.on('error', (error: Error) => {
      console.error('pg-boss error:', error);
    });
  }
  return boss;
}

export async function startJobQueue(): Promise<PgBoss> {
  const queue = getJobQueue();
  await queue.start();
  console.log('pg-boss job queue started');
  return queue;
}

export async function stopJobQueue(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 30000 });
    boss = null;
    console.log('pg-boss job queue stopped');
  }
}

/**
 * Register job workers (idempotent)
 *
 * Must be called after starting pg-boss and before sending jobs to the queue.
 * This ensures workers are registered and ready to process jobs.
 */
export async function registerJobWorkers(boss: PgBoss): Promise<void> {
  // Only register if not already registered (idempotent)
  if (!registeredWorkers.has('poll-jobs-for-user')) {
    await boss.work('poll-jobs-for-user', jobPollerHandler);
    registeredWorkers.add('poll-jobs-for-user');
    console.log('Registered worker: poll-jobs-for-user');
  }

  if (!registeredWorkers.has('extract-requirements')) {
    await boss.work('extract-requirements', requirementParserHandler);
    registeredWorkers.add('extract-requirements');
    console.log('Registered worker: extract-requirements');
  }
}
