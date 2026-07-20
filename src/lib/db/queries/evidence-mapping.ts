import { db } from '@/lib/db';
import { evidenceMapping, evidenceMappingAudit, evidenceItem, requirement } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Evidence mapping CRUD with audit trail.
 * Per CONTEXT.md locked decision #8: Full provenance tracking with before/after values.
 */

// ============================================================
// Type Definitions
// ============================================================

export type EvidenceMapping = InferSelectModel<typeof evidenceMapping>;
export type EvidenceMappingAudit = InferSelectModel<typeof evidenceMappingAudit>;

export interface EvidenceMappingWithTitle extends EvidenceMapping {
  evidenceTitle: string;
}

// ============================================================
// Evidence Mapping CRUD Functions
// ============================================================

/**
 * Create a single evidence mapping with audit trail.
 * Per CONTEXT.md locked decision #6: Store all version info.
 * Per CONTEXT.md locked decision #8: Create audit entry.
 */
export async function createEvidenceMapping(data: {
  userId: string;
  requirementId: string;
  evidenceItemId: string;
  decision: string;
  confidenceBand: string;
  reason: string;
  needsReview: boolean;
  sourceRequirementText: string;
  sourceEvidenceExcerpt: string;
  embeddingModelVersion: string;
  matchingPromptVersion: string;
  llmModelVersion: string;
  createdBySystem?: boolean;
  manualOverrideReason?: string;
}): Promise<EvidenceMapping> {
  return await db.transaction(async (tx) => {
    const id = crypto.randomUUID();

    // Create mapping. If the (user, requirement, evidence) triple already
    // exists, overwrite it in place — a manual create over an existing
    // system mapping is an override, not a duplicate.
    const [created] = await tx
      .insert(evidenceMapping)
      .values({
        id,
        userId: data.userId,
        requirementId: data.requirementId,
        evidenceItemId: data.evidenceItemId,
        decision: data.decision,
        confidenceBand: data.confidenceBand,
        reason: data.reason,
        needsReview: data.needsReview,
        sourceRequirementText: data.sourceRequirementText,
        sourceEvidenceExcerpt: data.sourceEvidenceExcerpt,
        embeddingModelVersion: data.embeddingModelVersion,
        matchingPromptVersion: data.matchingPromptVersion,
        llmModelVersion: data.llmModelVersion,
        createdBySystem: data.createdBySystem ?? true,
        manualOverrideReason: data.manualOverrideReason,
      })
      .onConflictDoUpdate({
        target: [
          evidenceMapping.userId,
          evidenceMapping.requirementId,
          evidenceMapping.evidenceItemId,
        ],
        set: {
          decision: data.decision,
          confidenceBand: data.confidenceBand,
          reason: data.reason,
          needsReview: data.needsReview,
          sourceRequirementText: data.sourceRequirementText,
          sourceEvidenceExcerpt: data.sourceEvidenceExcerpt,
          embeddingModelVersion: data.embeddingModelVersion,
          matchingPromptVersion: data.matchingPromptVersion,
          llmModelVersion: data.llmModelVersion,
          createdBySystem: data.createdBySystem ?? true,
          manualOverrideReason: data.manualOverrideReason,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Create audit trail entry
    await tx.insert(evidenceMappingAudit).values({
      id: crypto.randomUUID(),
      mappingId: created.id,
      userId: data.userId,
      action: 'create',
      beforeValue: null,
      afterValue: {
        requirementId: created.requirementId,
        evidenceItemId: created.evidenceItemId,
        decision: created.decision,
        confidenceBand: created.confidenceBand,
        reason: created.reason,
        needsReview: created.needsReview,
      },
    });

    return created;
  });
}

/**
 * Batch insert multiple evidence mappings (for matching pipeline results).
 * Creates audit trail entries for each mapping.
 */
export async function createManyEvidenceMappings(
  mappings: Array<{
    userId: string;
    requirementId: string;
    evidenceItemId: string;
    decision: string;
    confidenceBand: string;
    reason: string;
    needsReview: boolean;
    sourceRequirementText: string;
    sourceEvidenceExcerpt: string;
    embeddingModelVersion: string;
    matchingPromptVersion: string;
    llmModelVersion: string;
  }>
): Promise<EvidenceMapping[]> {
  if (mappings.length === 0) {
    return [];
  }

  return await db.transaction(async (tx) => {
    const mappingsWithIds = mappings.map((m) => ({
      id: crypto.randomUUID(),
      userId: m.userId,
      requirementId: m.requirementId,
      evidenceItemId: m.evidenceItemId,
      decision: m.decision,
      confidenceBand: m.confidenceBand,
      reason: m.reason,
      needsReview: m.needsReview,
      sourceRequirementText: m.sourceRequirementText,
      sourceEvidenceExcerpt: m.sourceEvidenceExcerpt,
      embeddingModelVersion: m.embeddingModelVersion,
      matchingPromptVersion: m.matchingPromptVersion,
      llmModelVersion: m.llmModelVersion,
      createdBySystem: true,
    }));

    // Batch insert mappings. ON CONFLICT DO NOTHING: a concurrent run that
    // validated the same pair first wins; this run's duplicate is dropped
    // (and gets no audit entry, since returning() only yields inserted rows)
    const inserted = await tx
      .insert(evidenceMapping)
      .values(mappingsWithIds)
      .onConflictDoNothing({
        target: [
          evidenceMapping.userId,
          evidenceMapping.requirementId,
          evidenceMapping.evidenceItemId,
        ],
      })
      .returning();

    // Create audit trail entries
    const auditEntries = inserted.map((mapping) => ({
      id: crypto.randomUUID(),
      mappingId: mapping.id,
      userId: mapping.userId,
      action: 'create' as const,
      beforeValue: null,
      afterValue: {
        requirementId: mapping.requirementId,
        evidenceItemId: mapping.evidenceItemId,
        decision: mapping.decision,
        confidenceBand: mapping.confidenceBand,
        reason: mapping.reason,
        needsReview: mapping.needsReview,
      },
    }));

    if (auditEntries.length > 0) {
      await tx.insert(evidenceMappingAudit).values(auditEntries);
    }

    return inserted;
  });
}

/**
 * Update an evidence mapping with audit trail.
 * Per CONTEXT.md locked decision #7: Mark as manually edited (createdBySystem=false).
 */
export async function updateEvidenceMapping(
  mappingId: string,
  userId: string,
  updates: {
    decision?: string;
    confidenceBand?: string;
    reason?: string;
    sourceEvidenceExcerpt?: string;
    manualOverrideReason?: string;
  }
): Promise<EvidenceMapping> {
  // Get current mapping for audit trail
  const [current] = await db
    .select()
    .from(evidenceMapping)
    .where(and(eq(evidenceMapping.id, mappingId), eq(evidenceMapping.userId, userId)))
    .limit(1);

  if (!current) {
    throw new Error(`Evidence mapping ${mappingId} not found`);
  }

  // Execute update and audit insert in transaction
  return await db.transaction(async (tx) => {
    // Update mapping
    const [updated] = await tx
      .update(evidenceMapping)
      .set({
        decision: updates.decision ?? current.decision,
        confidenceBand: updates.confidenceBand ?? current.confidenceBand,
        reason: updates.reason ?? current.reason,
        sourceEvidenceExcerpt: updates.sourceEvidenceExcerpt ?? current.sourceEvidenceExcerpt,
        manualOverrideReason: updates.manualOverrideReason ?? current.manualOverrideReason,
        createdBySystem: false, // Mark as manually edited
        updatedAt: new Date(),
      })
      .where(eq(evidenceMapping.id, mappingId))
      .returning();

    // Create audit trail entry
    await tx.insert(evidenceMappingAudit).values({
      id: crypto.randomUUID(),
      mappingId,
      userId,
      action: 'update',
      beforeValue: {
        decision: current.decision,
        confidenceBand: current.confidenceBand,
        reason: current.reason,
        sourceEvidenceExcerpt: current.sourceEvidenceExcerpt,
        manualOverrideReason: current.manualOverrideReason,
      },
      afterValue: {
        decision: updated.decision,
        confidenceBand: updated.confidenceBand,
        reason: updated.reason,
        sourceEvidenceExcerpt: updated.sourceEvidenceExcerpt,
        manualOverrideReason: updated.manualOverrideReason,
      },
    });

    return updated;
  });
}

/**
 * Delete an evidence mapping with audit trail.
 */
export async function deleteEvidenceMapping(mappingId: string, userId: string): Promise<void> {
  // Get current mapping for audit trail
  const [current] = await db
    .select()
    .from(evidenceMapping)
    .where(and(eq(evidenceMapping.id, mappingId), eq(evidenceMapping.userId, userId)))
    .limit(1);

  if (!current) {
    throw new Error(`Evidence mapping ${mappingId} not found`);
  }

  // Execute delete and audit insert in transaction
  await db.transaction(async (tx) => {
    // Create audit trail entry before deletion
    await tx.insert(evidenceMappingAudit).values({
      id: crypto.randomUUID(),
      mappingId,
      userId,
      action: 'delete',
      beforeValue: {
        requirementId: current.requirementId,
        evidenceItemId: current.evidenceItemId,
        decision: current.decision,
        confidenceBand: current.confidenceBand,
        reason: current.reason,
        needsReview: current.needsReview,
      },
      afterValue: null,
    });

    // Delete mapping (cascade will handle related data)
    await tx.delete(evidenceMapping).where(eq(evidenceMapping.id, mappingId));
  });
}

/**
 * Get all evidence mappings for a job+user, joined with evidence item titles.
 */
export async function getEvidenceMappingsForJob(
  jobId: string,
  userId: string
): Promise<EvidenceMappingWithTitle[]> {
  const results = await db
    .select({
      id: evidenceMapping.id,
      userId: evidenceMapping.userId,
      requirementId: evidenceMapping.requirementId,
      evidenceItemId: evidenceMapping.evidenceItemId,
      decision: evidenceMapping.decision,
      confidenceBand: evidenceMapping.confidenceBand,
      reason: evidenceMapping.reason,
      needsReview: evidenceMapping.needsReview,
      sourceRequirementText: evidenceMapping.sourceRequirementText,
      sourceEvidenceExcerpt: evidenceMapping.sourceEvidenceExcerpt,
      embeddingModelVersion: evidenceMapping.embeddingModelVersion,
      matchingPromptVersion: evidenceMapping.matchingPromptVersion,
      llmModelVersion: evidenceMapping.llmModelVersion,
      createdBySystem: evidenceMapping.createdBySystem,
      manualOverrideReason: evidenceMapping.manualOverrideReason,
      createdAt: evidenceMapping.createdAt,
      updatedAt: evidenceMapping.updatedAt,
      evidenceTitle: evidenceItem.title,
    })
    .from(evidenceMapping)
    .innerJoin(evidenceItem, eq(evidenceMapping.evidenceItemId, evidenceItem.id))
    .innerJoin(requirement, eq(evidenceMapping.requirementId, requirement.id))
    .where(and(eq(requirement.jobId, jobId), eq(evidenceMapping.userId, userId)));

  return results;
}

/**
 * Get evidence mappings for a specific requirement.
 */
export async function getEvidenceMappingsForRequirement(
  requirementId: string,
  userId: string
): Promise<EvidenceMappingWithTitle[]> {
  const results = await db
    .select({
      id: evidenceMapping.id,
      userId: evidenceMapping.userId,
      requirementId: evidenceMapping.requirementId,
      evidenceItemId: evidenceMapping.evidenceItemId,
      decision: evidenceMapping.decision,
      confidenceBand: evidenceMapping.confidenceBand,
      reason: evidenceMapping.reason,
      needsReview: evidenceMapping.needsReview,
      sourceRequirementText: evidenceMapping.sourceRequirementText,
      sourceEvidenceExcerpt: evidenceMapping.sourceEvidenceExcerpt,
      embeddingModelVersion: evidenceMapping.embeddingModelVersion,
      matchingPromptVersion: evidenceMapping.matchingPromptVersion,
      llmModelVersion: evidenceMapping.llmModelVersion,
      createdBySystem: evidenceMapping.createdBySystem,
      manualOverrideReason: evidenceMapping.manualOverrideReason,
      createdAt: evidenceMapping.createdAt,
      updatedAt: evidenceMapping.updatedAt,
      evidenceTitle: evidenceItem.title,
    })
    .from(evidenceMapping)
    .innerJoin(evidenceItem, eq(evidenceMapping.evidenceItemId, evidenceItem.id))
    .where(
      and(eq(evidenceMapping.requirementId, requirementId), eq(evidenceMapping.userId, userId))
    );

  return results;
}

/**
 * Get audit trail for an evidence mapping.
 */
export async function getEvidenceMappingAuditTrail(
  mappingId: string
): Promise<EvidenceMappingAudit[]> {
  return db
    .select()
    .from(evidenceMappingAudit)
    .where(eq(evidenceMappingAudit.mappingId, mappingId))
    .orderBy(desc(evidenceMappingAudit.createdAt));
}
