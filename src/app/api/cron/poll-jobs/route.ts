import { NextRequest } from 'next/server';
import { getJobQueue, registerJobWorkers } from '@/lib/jobs';
import { getAllActiveCriteria } from '@/lib/db/queries/user-criteria';

/**
 * Vercel Cron endpoint for hourly job polling
 *
 * Secured with CRON_SECRET bearer token.
 * Triggers polling for all active user criteria.
 */
export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET from authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Get all active criteria
  const allCriteria = await getAllActiveCriteria();

  if (allCriteria.length === 0) {
    return Response.json({
      success: true,
      usersQueued: 0,
      timestamp: new Date().toISOString(),
      message: 'No active criteria found',
    });
  }

  // 3. Initialize pg-boss and register workers
  const boss = getJobQueue();
  await boss.start();
  await registerJobWorkers(boss);

  // 4. Queue polling jobs for each criteria
  for (const criteria of allCriteria) {
    await boss.send('poll-jobs-for-user', {
      userId: criteria.userId,
      criteriaId: criteria.id,
    });
  }

  // 5. Return response
  return Response.json({
    success: true,
    usersQueued: allCriteria.length,
    timestamp: new Date().toISOString(),
  });
}
