import { PgBoss } from 'pg-boss';

let boss: PgBoss | null = null;

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
