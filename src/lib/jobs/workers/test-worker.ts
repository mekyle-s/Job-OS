import type { PgBoss, Job } from 'pg-boss';

export const TEST_QUEUE = 'test-queue';

interface TestJobPayload {
  message: string;
  timestamp: string;
}

export async function registerTestWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(TEST_QUEUE);

  await boss.work<TestJobPayload>(TEST_QUEUE, async (jobs: Job<TestJobPayload>[]) => {
    const job = jobs[0];
    console.log(
      `[test-worker] Processing job ${job.id}: ${job.data.message} (sent at ${job.data.timestamp})`
    );

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`[test-worker] Completed job ${job.id}`);
  });

  console.log(`[test-worker] Registered worker for queue: ${TEST_QUEUE}`);
}
