import { db } from '@/lib/db';
import { parserAudit } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================================
// Type Definitions
// ============================================================

export type ParserAudit = InferSelectModel<typeof parserAudit>;

// ============================================================
// Audit Logging Functions
// ============================================================

/**
 * Log parser audit entry
 * Fire-and-forget helper - catches errors to prevent blocking business operations
 */
export async function logParserAudit(params: {
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  parserConfidence?: number | null;
  beforeValue?: unknown;
  afterValue?: unknown;
  source?: string;
  userFeedback?: string | null;
}): Promise<void> {
  try {
    const id = crypto.randomUUID();

    await db.insert(parserAudit).values({
      id,
      userId: params.userId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      parserConfidence: params.parserConfidence ?? null,
      beforeValue: params.beforeValue ?? null,
      afterValue: params.afterValue ?? null,
      source: params.source ?? 'user',
      userFeedback: params.userFeedback ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Log error but don't throw - audit should not block business operations
    console.error('Failed to log parser audit:', error);
  }
}

/**
 * Get audit trail for an entity
 * Returns audit entries ordered by creation time (newest first)
 */
export async function getAuditTrail(entityType: string, entityId: string): Promise<ParserAudit[]> {
  return db
    .select()
    .from(parserAudit)
    .where(and(eq(parserAudit.entityType, entityType), eq(parserAudit.entityId, entityId)))
    .orderBy(desc(parserAudit.createdAt));
}
