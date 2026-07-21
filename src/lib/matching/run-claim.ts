import { db } from '@/lib/db';
import { matchingRun } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export const MATCHING_COOLDOWN_MINUTES = 10;

/**
 * Atomically claim a per-(user, job) matching-run slot. The insert wins on
 * first run; the conditional update wins only when the cooldown has elapsed.
 * Concurrent runs (double-click, auto-match racing a manual run) and other
 * users' runs on the same job can never double-spend LLM calls.
 *
 * @returns true if the claim was won and the caller may run matching
 */
export async function claimMatchingRun(
  userId: string,
  jobId: string,
  cooldownMinutes: number = MATCHING_COOLDOWN_MINUTES
): Promise<boolean> {
  const claimed = await db
    .insert(matchingRun)
    .values({ userId, jobId, lastRunAt: new Date() })
    .onConflictDoUpdate({
      target: [matchingRun.userId, matchingRun.jobId],
      set: { lastRunAt: new Date() },
      setWhere: sql`${matchingRun.lastRunAt} < now() - make_interval(mins => ${cooldownMinutes})`,
    })
    .returning({ lastRunAt: matchingRun.lastRunAt });

  return claimed.length > 0;
}
