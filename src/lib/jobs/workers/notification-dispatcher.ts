import type { Job } from 'pg-boss';
import { db } from '@/lib/db';
import { user, userCriteria, job as jobTable, requirement, evidenceMapping } from '@/lib/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { sendHighFitAlert } from '@/lib/email/send-alert';
import { logParserAudit } from '@/lib/db/queries/audit';

/**
 * Check for new high-fit roles for users with active criteria and send
 * digest emails (up to 10 new roles per user).
 * Callable directly (serverless-safe) or via the pg-boss wrapper below.
 */
export async function dispatchNotifications(): Promise<void> {
  try {
    // Get all users with active criteria
    const usersWithCriteria = await db
      .select({
        userId: userCriteria.userId,
        userEmail: user.email,
        userName: user.name,
        lastNotifiedAt: user.lastNotifiedAt,
      })
      .from(userCriteria)
      .innerJoin(user, eq(userCriteria.userId, user.id))
      .where(eq(userCriteria.isActive, true));

    console.log(`[notification-dispatcher] Checking ${usersWithCriteria.length} users...`);

    for (const userData of usersWithCriteria) {
      try {
        // Build WHERE condition based on lastNotifiedAt
        const timeFilter = userData.lastNotifiedAt
          ? gt(jobTable.createdAt, userData.lastNotifiedAt)
          : sql`true`; // If never notified, include all jobs

        // Find new high-fit jobs for this user
        // High-fit = mapped requirements / total requirements >= 80%
        const newHighFitJobs = await db
          .select({
            jobId: jobTable.id,
            title: jobTable.title,
            company: jobTable.company,
            totalRequirements: sql<number>`COUNT(DISTINCT ${requirement.id})`,
            mappedRequirements: sql<number>`COUNT(DISTINCT CASE WHEN ${evidenceMapping.decision} IN ('match', 'weak_match') THEN ${requirement.id} END)`,
          })
          .from(jobTable)
          .innerJoin(
            requirement,
            and(eq(requirement.jobId, jobTable.id), sql`${requirement.reviewStatus} != 'rejected'`)
          )
          .leftJoin(
            evidenceMapping,
            and(
              eq(evidenceMapping.requirementId, requirement.id),
              eq(evidenceMapping.userId, userData.userId)
            )
          )
          .where(and(eq(jobTable.isActive, true), timeFilter))
          .groupBy(jobTable.id, jobTable.title, jobTable.company, jobTable.createdAt)
          .having(
            sql`CAST(COUNT(DISTINCT CASE WHEN ${evidenceMapping.decision} IN ('match', 'weak_match') THEN ${requirement.id} END) AS FLOAT) / NULLIF(COUNT(DISTINCT ${requirement.id}), 0) >= 0.8`
          )
          .orderBy(sql`${jobTable.createdAt} DESC`)
          .limit(10); // Max 10 roles per notification

        if (newHighFitJobs.length === 0) {
          // No new high-fit roles for this user, skip
          continue;
        }

        // Calculate coverage percentage for fit band classification
        const rolesWithFitBand = newHighFitJobs.map((role) => {
          const coverage =
            role.totalRequirements > 0 ? role.mappedRequirements / role.totalRequirements : 0;
          const fitBand = coverage >= 0.8 ? 'high' : 'medium';

          return {
            title: role.title,
            company: role.company,
            fitBand,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/roles/${role.jobId}/brief`,
          };
        });

        // Send email alert
        const { error } = await sendHighFitAlert(
          userData.userEmail,
          userData.userName || 'there',
          rolesWithFitBand
        );

        if (error) {
          console.error(
            `[notification-dispatcher] Failed to send alert to ${userData.userEmail}:`,
            error
          );
          continue;
        }

        // Update user's lastNotifiedAt timestamp
        await db
          .update(user)
          .set({ lastNotifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(user.id, userData.userId));

        // Log audit trail
        await logParserAudit({
          userId: userData.userId,
          entityType: 'notification',
          entityId: userData.userId,
          action: 'create',
          afterValue: { roleCount: rolesWithFitBand.length, timestamp: new Date() },
          source: 'system',
        });

        console.log(
          `[notification-dispatcher] Sent alert to ${userData.userEmail} with ${rolesWithFitBand.length} roles`
        );
      } catch (userError) {
        console.error(
          `[notification-dispatcher] Error processing user ${userData.userId}:`,
          userError
        );
        // Continue to next user instead of failing entire batch
        continue;
      }
    }

    console.log('[notification-dispatcher] Completed notification check');
  } catch (error) {
    // Log error but don't throw - failed notification shouldn't crash worker
    console.error('[notification-dispatcher] Worker error:', error);
  }
}

/**
 * pg-boss worker wrapper (used when running with a persistent worker process).
 */
export async function notificationDispatcherHandler(jobs: Job[]): Promise<void> {
  if (!jobs[0]) return;
  return dispatchNotifications();
}
