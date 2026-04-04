import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { UpdateRoleStatusSchema } from '@/lib/schemas/role-status';
import { upsertRoleStatus, getRoleStatusForJob } from '@/lib/db/queries/role-status';
import { logParserAudit } from '@/lib/db/queries/audit';
import { ZodError } from 'zod';

/**
 * PATCH /api/roles/[jobId]/status
 * Update role status for authenticated user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // 1. Verify authentication
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract jobId from params
    const { jobId } = await params;

    // 3. Parse and validate request body
    const body = await request.json();
    const validated = UpdateRoleStatusSchema.parse(body);

    // 4. Get current status BEFORE update (for audit trail)
    const previousStatus = await getRoleStatusForJob(user.id, jobId);

    // 5. Update status
    await upsertRoleStatus(user.id, jobId, validated.status, validated.notes);

    // 6. Log audit trail
    await logParserAudit({
      userId: user.id,
      entityType: 'role_status',
      action: 'status_change',
      entityId: jobId,
      beforeValue: previousStatus
        ? { status: previousStatus.status, notes: previousStatus.notes }
        : null,
      afterValue: { status: validated.status, notes: validated.notes },
      source: 'user',
    });

    // 7. Return success response
    return Response.json({ success: true, status: validated.status });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return Response.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error updating role status:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/roles/[jobId]/status
 * Get current role status for authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // 1. Verify authentication
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract jobId from params
    const { jobId } = await params;

    // 3. Get current status
    const result = await getRoleStatusForJob(user.id, jobId);

    // 4. Return status (null if not set)
    return Response.json({
      status: result?.status ?? null,
      notes: result?.notes ?? null,
    });
  } catch (error) {
    console.error('Error getting role status:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
