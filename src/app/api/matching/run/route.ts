import { verifySession } from '@/lib/auth/session';
import { runMatchingForJob } from '@/lib/matching/pipeline';
import { db } from '@/lib/db';
import { job, requirement, matchingRun } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================
// POST /api/matching/run - Trigger matching for a job
// ============================================================

// Matching runs capped LLM validations (MAX_EVALUATIONS_PER_RUN) in-request
export const maxDuration = 300;

const RequestSchema = z.object({
  jobId: z.string(),
});

export async function POST(request: Request) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    const { jobId } = result.data;

    // Validate job exists
    const [jobRecord] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);

    if (!jobRecord) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Cost guard: each run is capped, but this also throttles run frequency.
    // Re-runs shortly after a match add nothing (validated pairs are cached),
    // so reject them instead of burning API calls.
    //
    // The claim is an atomic per-(user, job) upsert: the insert wins on first
    // run, the conditional update wins only when the cooldown has elapsed.
    // Concurrent runs (double-click, two tabs) and other users' runs on the
    // same job can never double-spend LLM calls or 429 each other.
    const COOLDOWN_MINUTES = 10;
    const claimed = await db
      .insert(matchingRun)
      .values({ userId: user.id, jobId, lastRunAt: new Date() })
      .onConflictDoUpdate({
        target: [matchingRun.userId, matchingRun.jobId],
        set: { lastRunAt: new Date() },
        setWhere: sql`${matchingRun.lastRunAt} < now() - make_interval(mins => ${COOLDOWN_MINUTES})`,
      })
      .returning({ lastRunAt: matchingRun.lastRunAt });

    if (claimed.length === 0) {
      return Response.json(
        {
          error: `Matching for this role ran within the last ${COOLDOWN_MINUTES} minutes. Try again shortly.`,
        },
        { status: 429 }
      );
    }

    // Check job has requirements
    const requirements = await db.select().from(requirement).where(eq(requirement.jobId, jobId));

    if (requirements.length === 0) {
      return Response.json({ error: 'Job has no extracted requirements' }, { status: 400 });
    }

    // Run matching pipeline
    const matchingResult = await runMatchingForJob(jobId, user.id);

    return Response.json({
      success: true,
      totalRequirements: matchingResult.totalRequirements,
      mapped: matchingResult.mapped,
      gaps: matchingResult.gaps,
      needsReview: matchingResult.needsReview,
    });
  } catch (error) {
    console.error('Error running matching:', error);
    const message = error instanceof Error ? error.message : 'Failed to run matching';
    return Response.json({ error: message }, { status: 500 });
  }
}
