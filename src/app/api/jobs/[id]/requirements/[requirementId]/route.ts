import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { updateRequirement, deleteRequirement } from '@/lib/db/queries/requirements';
import {
  RequirementCategorySchema,
  RequirementPrioritySchema,
  RequirementReviewStatusSchema,
} from '@/lib/schemas/requirements';
import { z } from 'zod';

// ============================================================
// Validation Schemas
// ============================================================

const UpdateRequirementSchema = z.object({
  category: RequirementCategorySchema.optional(),
  priority: RequirementPrioritySchema.optional(),
  normalizedText: z.string().min(1).max(500).optional(),
  reviewStatus: RequirementReviewStatusSchema.optional(),
});

// ============================================================
// PATCH /api/jobs/[id]/requirements/[requirementId] - Edit a requirement
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requirement ID from params
    const { requirementId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateRequirementSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Update requirement (creates audit trail)
    const requirement = await updateRequirement(requirementId, user.id, validation.data);

    return Response.json({ requirement });
  } catch (error) {
    console.error('Error updating requirement:', error);
    const message = error instanceof Error ? error.message : 'Failed to update requirement';
    return Response.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/jobs/[id]/requirements/[requirementId] - Delete a requirement
// ============================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requirement ID from params
    const { requirementId } = await params;

    // Delete requirement (creates audit trail)
    await deleteRequirement(requirementId, user.id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting requirement:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete requirement';
    return Response.json({ error: message }, { status: 500 });
  }
}
