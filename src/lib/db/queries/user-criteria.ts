import { db } from '@/lib/db';
import { userCriteria } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================================
// Type Definitions
// ============================================================

export type UserCriteria = InferSelectModel<typeof userCriteria>;

// ============================================================
// User Criteria CRUD Functions
// ============================================================

/**
 * Get active criteria for a user (V1: one profile per user)
 */
export async function getUserCriteria(userId: string): Promise<UserCriteria | undefined> {
  const [criteria] = await db
    .select()
    .from(userCriteria)
    .where(and(eq(userCriteria.userId, userId), eq(userCriteria.isActive, true)))
    .limit(1);

  return criteria;
}

/**
 * Upsert user criteria (create or update)
 */
export async function upsertUserCriteria(
  userId: string,
  data: {
    jobFunction?: string;
    locations?: string[];
    visaRequired?: boolean;
    targetCompanies: string[];
    jobTypes?: string[];
  }
): Promise<UserCriteria> {
  // Check if user already has criteria
  const existing = await getUserCriteria(userId);

  if (existing) {
    // Update existing criteria
    // Note: Use null explicitly instead of undefined to ensure fields are cleared
    const [updated] = await db
      .update(userCriteria)
      .set({
        jobFunction: data.jobFunction ?? null,
        locations: data.locations ?? null,
        visaRequired: data.visaRequired ?? null,
        targetCompanies: data.targetCompanies,
        jobTypes: data.jobTypes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(userCriteria.id, existing.id))
      .returning();

    return updated;
  } else {
    // Create new criteria
    const id = crypto.randomUUID();

    const [created] = await db
      .insert(userCriteria)
      .values({
        id,
        userId,
        jobFunction: data.jobFunction,
        locations: data.locations,
        visaRequired: data.visaRequired,
        targetCompanies: data.targetCompanies,
        jobTypes: data.jobTypes,
        isActive: true,
      })
      .returning();

    return created;
  }
}

/**
 * Get all active criteria for cron polling (no user filter)
 */
export async function getAllActiveCriteria(): Promise<UserCriteria[]> {
  return db.select().from(userCriteria).where(eq(userCriteria.isActive, true));
}

/**
 * Update lastPolledAt timestamp after polling
 */
export async function updateLastPolledAt(criteriaId: string): Promise<UserCriteria> {
  const [updated] = await db
    .update(userCriteria)
    .set({
      lastPolledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userCriteria.id, criteriaId))
    .returning();

  return updated;
}
