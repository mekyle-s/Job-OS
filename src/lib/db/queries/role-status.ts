import { db } from '@/lib/db';
import { roleStatus } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================================
// Type Definitions
// ============================================================

export type RoleStatus = InferSelectModel<typeof roleStatus>;

// ============================================================
// Role Status CRUD Functions
// ============================================================

/**
 * Upsert role status for a job
 * Creates new status or updates existing based on (userId, jobId) unique constraint
 */
export async function upsertRoleStatus(
  userId: string,
  jobId: string,
  status: string,
  notes?: string
): Promise<RoleStatus> {
  const id = crypto.randomUUID();

  const [result] = await db
    .insert(roleStatus)
    .values({
      id,
      userId,
      jobId,
      status,
      notes: notes ?? null,
      statusChangedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [roleStatus.userId, roleStatus.jobId],
      set: {
        status,
        notes: notes ?? null,
        statusChangedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
}

/**
 * Get role status for a specific job
 */
export async function getRoleStatusForJob(
  userId: string,
  jobId: string
): Promise<RoleStatus | undefined> {
  const [result] = await db
    .select()
    .from(roleStatus)
    .where(and(eq(roleStatus.userId, userId), eq(roleStatus.jobId, jobId)))
    .limit(1);

  return result;
}

/**
 * Get all role statuses for a user, optionally filtered by status value
 */
export async function getRoleStatusesForUser(
  userId: string,
  statusFilter?: string
): Promise<
  Array<{
    jobId: string;
    status: string;
    notes: string | null;
    statusChangedAt: Date;
  }>
> {
  // Build where condition based on filter
  const whereCondition =
    statusFilter && statusFilter !== 'all'
      ? and(eq(roleStatus.userId, userId), eq(roleStatus.status, statusFilter))
      : eq(roleStatus.userId, userId);

  return db
    .select({
      jobId: roleStatus.jobId,
      status: roleStatus.status,
      notes: roleStatus.notes,
      statusChangedAt: roleStatus.statusChangedAt,
    })
    .from(roleStatus)
    .where(whereCondition);
}

/**
 * Delete role status for a job
 */
export async function deleteRoleStatus(userId: string, jobId: string): Promise<void> {
  await db
    .delete(roleStatus)
    .where(and(eq(roleStatus.userId, userId), eq(roleStatus.jobId, jobId)));
}
