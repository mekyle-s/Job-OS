import { getRankedJobs } from './ranker';
import { runMatchingForJob } from './pipeline';
import { claimMatchingRun } from './run-claim';

// Jobs auto-matched per trigger (post-poll, post-resume-parse). Each job's
// run is itself capped by MAX_EVALUATIONS_PER_RUN, so worst-case LLM spend
// per trigger is MAX_AUTO_MATCH_JOBS × MAX_EVALUATIONS_PER_RUN mini calls —
// and already-validated pairs are skipped, so repeat triggers cost near zero.
const MAX_AUTO_MATCH_JOBS = Number(process.env.MAX_AUTO_MATCH_JOBS ?? 3);

/**
 * Run matching automatically for the top of a user's queue. This is what
 * makes the Fresh Match Queue actually show fit coverage without the user
 * opening every role brief and clicking "Run Matching" by hand.
 *
 * Respects the same per-(user, job) cooldown claims as manual runs: jobs
 * matched recently are skipped and the next-ranked job takes their slot.
 */
export async function autoMatchTopJobs(
  userId: string,
  maxJobs: number = MAX_AUTO_MATCH_JOBS
): Promise<{ attempted: number; matched: number }> {
  const queue = await getRankedJobs(userId);

  let attempted = 0;
  let matched = 0;

  for (const rankedJob of queue) {
    if (matched >= maxJobs) break;

    if (!(await claimMatchingRun(userId, rankedJob.jobId))) {
      continue; // matched recently (or another run owns it) — try the next role
    }

    attempted++;
    try {
      await runMatchingForJob(rankedJob.jobId, userId);
      matched++;
    } catch (error) {
      console.error(
        `[AutoMatch] Matching failed for job ${rankedJob.jobId}, user ${userId}:`,
        error
      );
      // Continue to next job
    }
  }

  if (attempted > 0) {
    console.log(`[AutoMatch] Ran matching on ${matched}/${attempted} jobs for user ${userId}`);
  }
  return { attempted, matched };
}
