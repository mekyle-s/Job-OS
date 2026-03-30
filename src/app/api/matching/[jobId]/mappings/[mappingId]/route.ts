import { verifySession } from '@/lib/auth/session';
import {
  updateEvidenceMapping,
  deleteEvidenceMapping,
} from '@/lib/db/queries/evidence-mapping';
import { UpdateEvidenceMappingSchema } from '@/lib/schemas/matching';

// ============================================================
// PATCH /api/matching/[jobId]/mappings/[mappingId] - Edit a mapping
// ============================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string; mappingId: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get mappingId from params
    const { mappingId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const result = UpdateEvidenceMappingSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    const updates = result.data;

    // Validate manualOverrideReason if decision or confidenceBand changed
    if ((updates.decision || updates.confidenceBand) && !updates.manualOverrideReason) {
      return Response.json(
        { error: 'manualOverrideReason required when changing decision or confidence' },
        { status: 400 }
      );
    }

    // Update mapping
    const updated = await updateEvidenceMapping(mappingId, user.id, updates);

    return Response.json({ mapping: updated });
  } catch (error) {
    console.error('Error updating mapping:', error);
    const message = error instanceof Error ? error.message : 'Failed to update mapping';
    return Response.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/matching/[jobId]/mappings/[mappingId] - Remove a mapping
// ============================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string; mappingId: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get mappingId from params
    const { mappingId } = await params;

    // Delete mapping
    await deleteEvidenceMapping(mappingId, user.id);

    return Response.json({ deleted: mappingId });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete mapping';
    return Response.json({ error: message }, { status: 500 });
  }
}
