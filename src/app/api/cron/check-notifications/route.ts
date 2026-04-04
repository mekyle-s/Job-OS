import { NextRequest } from 'next/server';
import { getJobQueue, registerJobWorkers } from '@/lib/jobs';

/**
 * Vercel Cron endpoint for hourly notification check
 *
 * Secured with CRON_SECRET bearer token.
 * Triggers notification dispatcher to check for new high-fit roles.
 */
export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET from authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Initialize pg-boss and register workers
  const boss = getJobQueue();
  await boss.start();
  await registerJobWorkers(boss);

  // 3. Queue notification dispatcher job
  await boss.send('dispatch-notifications', {});

  // 4. Return response
  return Response.json({
    success: true,
    scheduled: new Date().toISOString(),
  });
}
