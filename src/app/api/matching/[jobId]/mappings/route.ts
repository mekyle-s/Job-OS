import { verifySession } from '@/lib/auth/session';
import {
  getEvidenceMappingsForJob,
  createEvidenceMapping,
} from '@/lib/db/queries/evidence-mapping';
import { CreateEvidenceMappingSchema } from '@/lib/schemas/matching';
import {
  EMBEDDING_MODEL_VERSION,
  MATCHING_PROMPT_VERSION,
  LLM_MODEL_VERSION,
} from '@/lib/matching/versions';

// ============================================================
// GET /api/matching/[jobId]/mappings - Get all mappings for a job
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

    // Get mappings for this job
    const mappings = await getEvidenceMappingsForJob(jobId, user.id);

    return Response.json({ mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch mappings';
    return Response.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// POST /api/matching/[jobId]/mappings - Manually create a mapping
// ============================================================

export async function POST(
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

    // Parse and validate request body
    const body = await request.json();
    const result = CreateEvidenceMappingSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    const data = result.data;

    // Create mapping (manual creation, so createdBySystem=false)
    const mapping = await createEvidenceMapping({
      userId: user.id,
      requirementId: data.requirementId,
      evidenceItemId: data.evidenceItemId,
      decision: data.decision,
      confidenceBand: data.confidenceBand,
      reason: data.reason,
      needsReview: data.needsReview,
      sourceRequirementText: data.sourceRequirementText,
      sourceEvidenceExcerpt: data.sourceEvidenceExcerpt,
      embeddingModelVersion: EMBEDDING_MODEL_VERSION,
      matchingPromptVersion: MATCHING_PROMPT_VERSION,
      llmModelVersion: LLM_MODEL_VERSION,
      createdBySystem: false,
    });

    return Response.json({ mapping }, { status: 201 });
  } catch (error) {
    console.error('Error creating mapping:', error);
    const message = error instanceof Error ? error.message : 'Failed to create mapping';
    return Response.json({ error: message }, { status: 500 });
  }
}
