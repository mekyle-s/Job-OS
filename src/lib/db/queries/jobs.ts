import { db } from '@/lib/db';
import { rawJobSource, job, requirement } from '@/lib/db/schema';
import { eq, and, or, isNull, inArray, notInArray, desc, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================================
// Type Definitions
// ============================================================

export type RawJobSource = InferSelectModel<typeof rawJobSource>;
export type Job = InferSelectModel<typeof job>;
export type Requirement = InferSelectModel<typeof requirement>;

export type JobWithRequirements = Job & {
  requirements: Requirement[];
};

export type JobWithCount = Job & {
  _count: { requirements: number };
};

// ============================================================
// Raw Job Source Operations
// ============================================================

/**
 * Insert or update raw job source record
 */
export async function upsertRawJobSource(data: {
  source: string;
  sourceJobId: string;
  rawData: unknown;
}): Promise<RawJobSource> {
  const id = crypto.randomUUID();

  const [result] = await db
    .insert(rawJobSource)
    .values({
      id,
      source: data.source,
      sourceJobId: data.sourceJobId,
      rawData: data.rawData,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [rawJobSource.source, rawJobSource.sourceJobId],
      set: {
        rawData: data.rawData,
        fetchedAt: new Date(),
      },
    })
    .returning();

  return result;
}

// ============================================================
// Job CRUD Operations
// ============================================================

/**
 * Insert or update canonical job
 * Returns { job, isNew, isUpdated } to determine if requirement extraction needed
 */
export async function upsertJob(data: {
  source: string;
  sourceJobId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedAt?: Date;
  sourceUpdatedAt: Date;
  metadata?: {
    departmentName?: string;
    officeLocation?: string;
    employmentType?: string;
    remote?: boolean;
    visaSponsorship?: boolean;
    [key: string]: unknown;
  };
  roleType?: string; // 'internship' | 'full_time' | 'part_time' | 'contract' | 'unknown'
  isActive?: boolean;
}): Promise<{ job: Job; isNew: boolean; isUpdated: boolean }> {
  // Check if job exists
  const [existing] = await db
    .select()
    .from(job)
    .where(and(eq(job.source, data.source), eq(job.sourceJobId, data.sourceJobId)))
    .limit(1);

  if (existing) {
    // Check if description changed (trigger re-extraction)
    const isUpdated = existing.description !== data.description;

    const [updated] = await db
      .update(job)
      .set({
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        url: data.url,
        postedAt: data.postedAt,
        sourceUpdatedAt: data.sourceUpdatedAt,
        metadata: data.metadata,
        roleType: data.roleType ?? existing.roleType,
        isActive: data.isActive ?? true,
        parseStatus: isUpdated ? 'pending' : existing.parseStatus,
      })
      .where(eq(job.id, existing.id))
      .returning();

    return { job: updated, isNew: false, isUpdated };
  } else {
    // Create new job
    const id = crypto.randomUUID();

    const [created] = await db
      .insert(job)
      .values({
        id,
        source: data.source,
        sourceJobId: data.sourceJobId,
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        url: data.url,
        postedAt: data.postedAt,
        sourceUpdatedAt: data.sourceUpdatedAt,
        metadata: data.metadata,
        roleType: data.roleType,
        isActive: data.isActive ?? true,
        parseStatus: 'pending',
      })
      .returning();

    return { job: created, isNew: true, isUpdated: false };
  }
}

/**
 * Get jobs for user's target companies.
 * Empty companies array = "All companies" (discover mode): no company filter.
 * Company matching is case-insensitive so criteria tokens ("stripe") match
 * stored company names ("Stripe").
 */
export async function getJobsForUser(
  companies: string[],
  options?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
    /** Restrict to specific job types; jobs with unknown role type pass through */
    jobTypes?: string[];
    /** Restrict to a single company */
    company?: string;
  }
): Promise<JobWithCount[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const isActiveFilter = options?.isActive ?? true;

  const conditions = [eq(job.isActive, isActiveFilter)];

  // Case-insensitive company scope. A single-company filter narrows the
  // target list, or stands alone in discover mode (no target list).
  if (options?.company) {
    const target = options.company.toLowerCase();
    if (companies.length > 0 && !companies.some((c) => c.toLowerCase() === target)) {
      return [];
    }
    conditions.push(eq(sql`lower(${job.company})`, target));
  } else if (companies.length > 0) {
    conditions.push(
      inArray(
        sql`lower(${job.company})`,
        companies.map((c) => c.toLowerCase())
      )
    );
  }

  // Job type filter: exclude explicit mismatches, keep unknown/unclassified jobs
  if (options?.jobTypes && options.jobTypes.length > 0) {
    conditions.push(
      or(
        isNull(job.roleType),
        eq(job.roleType, 'unknown'),
        inArray(job.roleType, options.jobTypes)
      )!
    );
  }

  // Build query with requirement count
  const jobsWithCounts = await db
    .select({
      id: job.id,
      source: job.source,
      sourceJobId: job.sourceJobId,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      url: job.url,
      postedAt: job.postedAt,
      sourceUpdatedAt: job.sourceUpdatedAt,
      metadata: job.metadata,
      parseStatus: job.parseStatus,
      parseCompletedAt: job.parseCompletedAt,
      parseError: job.parseError,
      isActive: job.isActive,
      firstSeenAt: job.firstSeenAt,
      createdAt: job.createdAt,
      visaSponsorship: job.visaSponsorship,
      remotePolicy: job.remotePolicy,
      roleType: job.roleType,
      season: job.season,
      graduationWindow: job.graduationWindow,
      lastMatchedAt: job.lastMatchedAt,
      requirementCount: sql<number>`cast(count(${requirement.id}) as integer)`,
    })
    .from(job)
    .leftJoin(requirement, eq(job.id, requirement.jobId))
    .where(and(...conditions))
    .groupBy(job.id)
    .orderBy(desc(job.sourceUpdatedAt))
    .limit(limit)
    .offset(offset);

  // Map to JobWithCount type
  return jobsWithCounts.map((j) => ({
    id: j.id,
    source: j.source,
    sourceJobId: j.sourceJobId,
    title: j.title,
    company: j.company,
    location: j.location,
    description: j.description,
    url: j.url,
    postedAt: j.postedAt,
    sourceUpdatedAt: j.sourceUpdatedAt,
    metadata: j.metadata,
    parseStatus: j.parseStatus,
    parseCompletedAt: j.parseCompletedAt,
    parseError: j.parseError,
    isActive: j.isActive,
    firstSeenAt: j.firstSeenAt,
    createdAt: j.createdAt,
    visaSponsorship: j.visaSponsorship,
    remotePolicy: j.remotePolicy,
    roleType: j.roleType,
    season: j.season,
    graduationWindow: j.graduationWindow,
    lastMatchedAt: j.lastMatchedAt,
    _count: { requirements: j.requirementCount },
  }));
}

/**
 * Get single job with all requirements
 */
export async function getJobWithRequirements(
  jobId: string
): Promise<JobWithRequirements | undefined> {
  const [jobRecord] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);

  if (!jobRecord) {
    return undefined;
  }

  const requirements = await db
    .select()
    .from(requirement)
    .where(eq(requirement.jobId, jobId))
    .orderBy(
      sql`CASE ${requirement.priority}
        WHEN 'required' THEN 1
        WHEN 'preferred' THEN 2
        WHEN 'unknown' THEN 3
      END`,
      requirement.category
    );

  return {
    ...jobRecord,
    requirements,
  };
}

/**
 * Get jobs awaiting requirement extraction, freshest first.
 * Used by the poller to drain the extraction backlog under a per-run cap
 * (index-backed via job_parse_status_idx).
 */
export async function getPendingParseJobs(
  limit: number
): Promise<Array<{ id: string; description: string }>> {
  return db
    .select({ id: job.id, description: job.description })
    .from(job)
    .where(and(eq(job.parseStatus, 'pending'), eq(job.isActive, true)))
    .orderBy(desc(job.sourceUpdatedAt))
    .limit(limit);
}

/**
 * Update job parse status after extraction
 */
export async function updateJobParseStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string
): Promise<Job> {
  const [updated] = await db
    .update(job)
    .set({
      parseStatus: status,
      parseCompletedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
      parseError: error,
    })
    .where(eq(job.id, jobId))
    .returning();

  return updated;
}

/**
 * Mark jobs not in latest fetch as inactive (per research Pitfall 4)
 *
 * IMPORTANT: Must filter by company to prevent marking jobs from other companies as inactive.
 * When polling multiple companies, each company's poll should only affect that company's jobs.
 */
export async function markJobsInactive(
  source: string,
  company: string,
  activeSourceJobIds: string[]
): Promise<number> {
  const result = await db
    .update(job)
    .set({ isActive: false })
    .where(
      and(
        eq(job.source, source),
        eq(job.company, company),
        notInArray(job.sourceJobId, activeSourceJobIds),
        eq(job.isActive, true)
      )
    );

  return result.rowCount ?? 0;
}
