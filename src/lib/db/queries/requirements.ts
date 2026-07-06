import { db } from '@/lib/db';
import { requirement, requirementAudit } from '@/lib/db/schema';
import { eq, ne, and, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { ExtractedRequirement } from '@/lib/schemas/requirements';

// ============================================================
// Type Definitions
// ============================================================

export type Requirement = InferSelectModel<typeof requirement>;
export type RequirementAudit = InferSelectModel<typeof requirementAudit>;

// ============================================================
// Requirement CRUD Functions
// ============================================================

/**
 * Bulk insert extracted requirements for a job
 */
export async function createRequirements(
  jobId: string,
  requirements: ExtractedRequirement[]
): Promise<Requirement[]> {
  if (requirements.length === 0) {
    return [];
  }

  const requirementRecords = requirements.map((req) => ({
    id: crypto.randomUUID(),
    jobId,
    category: req.category,
    priority: req.priority,
    normalizedText: req.normalized_text,
    sourceText: req.source_text,
    sourceSpan: req.source_span,
    reviewStatus: 'parsed' as const,
    isManuallyEdited: false,
  }));

  const inserted = await db.insert(requirement).values(requirementRecords).returning();

  return inserted;
}

/**
 * Get all requirements for a job (excluding soft-rejected ones)
 */
export async function getRequirementsForJob(jobId: string): Promise<Requirement[]> {
  return db
    .select()
    .from(requirement)
    .where(and(eq(requirement.jobId, jobId), ne(requirement.reviewStatus, 'rejected')));
}

/**
 * Update a requirement with audit trail
 */
export async function updateRequirement(
  requirementId: string,
  userId: string,
  updates: {
    category?: string;
    priority?: string;
    normalizedText?: string;
    sourceText?: string;
    sourceSpan?: string | null;
    reviewStatus?: string;
  }
): Promise<Requirement> {
  // Get current requirement for audit trail
  const [current] = await db
    .select()
    .from(requirement)
    .where(eq(requirement.id, requirementId))
    .limit(1);

  if (!current) {
    throw new Error(`Requirement ${requirementId} not found`);
  }

  // Execute update and audit insert in transaction
  return await db.transaction(async (tx) => {
    // Update requirement
    const [updated] = await tx
      .update(requirement)
      .set({
        category: updates.category ?? current.category,
        priority: updates.priority ?? current.priority,
        normalizedText: updates.normalizedText ?? current.normalizedText,
        sourceText: updates.sourceText ?? current.sourceText,
        sourceSpan: updates.sourceSpan !== undefined ? updates.sourceSpan : current.sourceSpan,
        reviewStatus: updates.reviewStatus ?? current.reviewStatus,
        isManuallyEdited: true,
        updatedAt: new Date(),
      })
      .where(eq(requirement.id, requirementId))
      .returning();

    // Create audit trail entry
    await tx.insert(requirementAudit).values({
      id: crypto.randomUUID(),
      requirementId,
      userId,
      action: 'update',
      beforeValue: {
        category: current.category,
        priority: current.priority,
        normalizedText: current.normalizedText,
        sourceText: current.sourceText,
        sourceSpan: current.sourceSpan,
        reviewStatus: current.reviewStatus,
      },
      afterValue: {
        category: updated.category,
        priority: updated.priority,
        normalizedText: updated.normalizedText,
        sourceText: updated.sourceText,
        sourceSpan: updated.sourceSpan,
        reviewStatus: updated.reviewStatus,
      },
    });

    return updated;
  });
}

/**
 * Reject (soft-delete) a requirement with audit trail.
 *
 * Requirements are shared parse data across all users, so a hard DELETE
 * would cascade away every user's evidence mappings for that requirement.
 * Rejecting instead marks reviewStatus='rejected': the requirement is
 * excluded from display, matching, and ranking, but the row (and audit
 * history) survives and the action is reversible.
 */
export async function deleteRequirement(requirementId: string, userId: string): Promise<void> {
  // Get current requirement for audit trail
  const [current] = await db
    .select()
    .from(requirement)
    .where(eq(requirement.id, requirementId))
    .limit(1);

  if (!current) {
    throw new Error(`Requirement ${requirementId} not found`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(requirement)
      .set({ reviewStatus: 'rejected', isManuallyEdited: true, updatedAt: new Date() })
      .where(eq(requirement.id, requirementId));

    await tx.insert(requirementAudit).values({
      id: crypto.randomUUID(),
      requirementId,
      userId,
      action: 'reject',
      beforeValue: {
        category: current.category,
        priority: current.priority,
        normalizedText: current.normalizedText,
        sourceText: current.sourceText,
        sourceSpan: current.sourceSpan,
        reviewStatus: current.reviewStatus,
      },
      afterValue: { reviewStatus: 'rejected' },
    });
  });
}

/**
 * Create a manual requirement with audit trail
 */
export async function createManualRequirement(
  jobId: string,
  userId: string,
  data: {
    category: string;
    priority: string;
    normalizedText: string;
    sourceText: string;
    sourceSpan?: string | null;
    reviewStatus?: string;
  }
): Promise<Requirement> {
  return await db.transaction(async (tx) => {
    // Create requirement
    const id = crypto.randomUUID();

    const [created] = await tx
      .insert(requirement)
      .values({
        id,
        jobId,
        category: data.category,
        priority: data.priority,
        normalizedText: data.normalizedText,
        sourceText: data.sourceText,
        sourceSpan: data.sourceSpan,
        reviewStatus: data.reviewStatus ?? 'parsed',
        isManuallyEdited: true,
      })
      .returning();

    // Create audit trail entry
    await tx.insert(requirementAudit).values({
      id: crypto.randomUUID(),
      requirementId: created.id,
      userId,
      action: 'create',
      beforeValue: null,
      afterValue: {
        category: created.category,
        priority: created.priority,
        normalizedText: created.normalizedText,
        sourceText: created.sourceText,
        sourceSpan: created.sourceSpan,
        reviewStatus: created.reviewStatus,
      },
    });

    return created;
  });
}

/**
 * Get audit trail for a requirement
 */
export async function getRequirementAuditTrail(requirementId: string): Promise<RequirementAudit[]> {
  return db
    .select()
    .from(requirementAudit)
    .where(eq(requirementAudit.requirementId, requirementId))
    .orderBy(desc(requirementAudit.createdAt));
}
