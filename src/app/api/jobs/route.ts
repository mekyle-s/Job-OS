import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getUserCriteria } from '@/lib/db/queries/user-criteria';
import { getJobsForUser } from '@/lib/db/queries/jobs';

// ============================================================
// GET /api/jobs - Get jobs matching user's criteria
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's criteria
    const criteria = await getUserCriteria(user.id);

    if (!criteria) {
      return Response.json(
        {
          jobs: [],
          total: 0,
          hasMore: false,
          message: 'Set up your criteria first',
        },
        { status: 200 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const active = searchParams.get('active') !== 'false'; // Default to true

    // Get jobs for user's target companies
    const jobs = await getJobsForUser(criteria.targetCompanies, {
      limit,
      offset,
      isActive: active,
    });

    return Response.json({
      jobs,
      total: jobs.length,
      hasMore: jobs.length === limit,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch jobs';
    return Response.json({ error: message }, { status: 500 });
  }
}
