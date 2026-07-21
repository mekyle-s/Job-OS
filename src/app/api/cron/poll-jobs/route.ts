import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron';
import { getAllActiveCriteria } from '@/lib/db/queries/user-criteria';
import { pollJobsForUser } from '@/lib/jobs/workers/job-poller';
import { autoMatchTopJobs } from '@/lib/matching/auto-match';

// Polls run in after() past the response; extraction is capped per poll
export const maxDuration = 300;

/**
 * Vercel Cron endpoint for scheduled job polling
 *
 * Secured with CRON_SECRET bearer token (Vercel attaches it automatically
 * when the CRON_SECRET env var is set). Polls run sequentially after the
 * response via after() — serverless-safe, no background worker process.
 */
export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET from authorization header (fails closed when unset)
  if (!isCronAuthorized(request)) {
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

  // 3. Run polls sequentially after the response is sent, auto-matching each
  // user's top queue roles so coverage stays fresh without manual runs
  after(async () => {
    for (const criteria of allCriteria) {
      try {
        const result = await pollJobsForUser(criteria.userId, criteria.id);
        console.log(`[Cron Poll] Complete for user ${criteria.userId}:`, result);
        await autoMatchTopJobs(criteria.userId);
      } catch (error) {
        console.error(`[Cron Poll] Failed for user ${criteria.userId}:`, error);
        // Continue to next user
      }
    }
  });

  // 4. Return response
  return Response.json({
    success: true,
    usersQueued: allCriteria.length,
    timestamp: new Date().toISOString(),
  });
}
