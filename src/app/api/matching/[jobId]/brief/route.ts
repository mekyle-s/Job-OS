import { verifySession } from '@/lib/auth/session';
import { generateRoleBrief } from '@/lib/matching/gap-analyzer';

// ============================================================
// GET /api/matching/[jobId]/brief - Get role brief for a job
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get jobId from params
    const { jobId } = await params;

    // Generate role brief
    const brief = await generateRoleBrief(jobId, user.id);

    return Response.json(brief);
  } catch (error) {
    console.error('Error generating role brief:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate role brief';
    return Response.json({ error: message }, { status: 500 });
  }
}
