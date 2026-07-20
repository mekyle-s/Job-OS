import { verifySession } from '@/lib/auth/session';
import { getRankedJobs } from '@/lib/matching/ranker';

// ============================================================
// GET /api/matching/queue - Get ranked match queue
// ============================================================

export async function GET() {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ranked jobs
    const queue = await getRankedJobs(user.id);

    return Response.json({
      queue,
      count: queue.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Queue API] Error fetching match queue:', error);
    return Response.json({ error: 'Failed to fetch match queue' }, { status: 500 });
  }
}
