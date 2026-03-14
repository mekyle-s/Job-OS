import { verifySession } from '@/lib/auth/session';
import { getJobWithRequirements } from '@/lib/db/queries/jobs';

// ============================================================
// GET /api/jobs/[id] - Get single job with requirements
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get job ID from params
    const { id } = await params;

    // Get job with requirements
    const job = await getJobWithRequirements(id);

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    return Response.json({ job });
  } catch (error) {
    console.error('Error fetching job:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch job';
    return Response.json({ error: message }, { status: 500 });
  }
}
