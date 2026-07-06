import { after } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { getUserCriteria } from '@/lib/db/queries/user-criteria';
import { pollJobsForUser } from '@/lib/jobs/workers/job-poller';

// Polling + capped requirement extraction continue in after() past the response
export const maxDuration = 300;

/**
 * Manual job polling endpoint
 *
 * Authenticated endpoint that triggers polling for the current user only.
 * The poll runs after the response via after() — serverless-safe, no
 * background worker process required.
 */
export async function POST() {
  // 1. Verify auth using requireUser
  const user = await requireUser();

  // 2. Get user's criteria
  const criteria = await getUserCriteria(user.id);

  if (!criteria) {
    return Response.json({ error: 'No active criteria found for user' }, { status: 404 });
  }

  // 3. Run the poll after the response is sent
  after(async () => {
    try {
      const result = await pollJobsForUser(user.id, criteria.id);
      console.log(`[Poll API] Poll complete for user ${user.id}:`, result);
    } catch (error) {
      console.error(`[Poll API] Poll failed for user ${user.id}:`, error);
    }
  });

  // 4. Return response
  return Response.json({
    success: true,
    userId: user.id,
    criteriaId: criteria.id,
    targetCompanies: criteria.targetCompanies,
    timestamp: new Date().toISOString(),
    message: 'Job polling started',
  });
}
