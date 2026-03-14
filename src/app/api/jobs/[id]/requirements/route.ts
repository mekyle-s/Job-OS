import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getRequirementsForJob, createManualRequirement } from '@/lib/db/queries/requirements';
import {
  RequirementCategorySchema,
  RequirementPrioritySchema,
} from '@/lib/schemas/requirements';
import { z } from 'zod';

// ============================================================
// Validation Schemas
// ============================================================

const CreateRequirementSchema = z.object({
  category: RequirementCategorySchema,
  priority: RequirementPrioritySchema,
  normalizedText: z.string().min(1).max(500),
  sourceText: z.string().default(''), // Empty for manual entries
});

// ============================================================
// GET /api/jobs/[id]/requirements - Get all requirements for a job
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
    const { id: jobId } = await params;

    // Get requirements
    const requirements = await getRequirementsForJob(jobId);

    return Response.json({ requirements });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch requirements';
    return Response.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// POST /api/jobs/[id]/requirements - Manually add a requirement
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get job ID from params
    const { id: jobId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateRequirementSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Create manual requirement
    const requirement = await createManualRequirement(jobId, user.id, validation.data);

    return Response.json({ requirement }, { status: 201 });
  } catch (error) {
    console.error('Error creating requirement:', error);
    const message = error instanceof Error ? error.message : 'Failed to create requirement';
    return Response.json({ error: message }, { status: 500 });
  }
}
