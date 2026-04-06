import { verifySession } from '@/lib/auth/session';
import { getRankedJobs } from '@/lib/matching/ranker';

// ============================================================
// GET /api/matching/queue - Get ranked match queue
// ============================================================

export async function GET() {
  try {
    console.log('[Queue API] Received request');

    // Authenticate
    const user = await verifySession();
    if (!user) {
      console.log('[Queue API] Unauthorized - no user session');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Queue API] User authenticated:', user.id);

    // Get ranked jobs
    const queue = await getRankedJobs(user.id);

    console.log('[Queue API] Returning queue:', {
      count: queue.length,
      jobIds: queue.slice(0, 3).map((j) => j.jobId),
    });

    return Response.json({
      queue,
      count: queue.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Queue API] Error fetching match queue:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch match queue';
    return Response.json({ error: message }, { status: 500 });
  }
}
