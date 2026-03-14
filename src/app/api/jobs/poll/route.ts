import { requireUser } from '@/lib/auth/session';
import { getJobQueue, registerJobWorkers } from '@/lib/jobs';
import { getUserCriteria } from '@/lib/db/queries/user-criteria';

/**
 * Manual job polling endpoint for development
 *
 * Authenticated endpoint that triggers polling for the current user only.
 * Useful for testing without needing CRON_SECRET.
 */
export async function POST() {
  // 1. Verify auth using requireUser
  const user = await requireUser();

  // 2. Get user's criteria
  const criteria = await getUserCriteria(user.id);

  if (!criteria) {
    return Response.json(
      { error: 'No active criteria found for user' },
      { status: 404 }
    );
  }

  // 3. Initialize pg-boss and register workers
  const boss = getJobQueue();
  await boss.start();
  await registerJobWorkers(boss);

  // 4. Queue polling job for this user
  await boss.send('poll-jobs-for-user', {
    userId: user.id,
    criteriaId: criteria.id,
  });

  // 5. Return response
  return Response.json({
    success: true,
    userId: user.id,
    criteriaId: criteria.id,
    targetCompanies: criteria.targetCompanies,
    timestamp: new Date().toISOString(),
    message: 'Job polling queued successfully',
  });
}
