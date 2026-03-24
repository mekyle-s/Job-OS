import { verifySession } from '@/lib/auth/session';
import { getRequirementAuditTrail } from '@/lib/db/queries/requirements';

/**
 * GET /api/jobs/[id]/requirements/[requirementId]/audit
 *
 * Test endpoint to view audit trail for a requirement
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  try {
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requirementId } = await params;
    const auditTrail = await getRequirementAuditTrail(requirementId);

    return Response.json({
      requirementId,
      auditTrail,
      count: auditTrail.length
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
}
