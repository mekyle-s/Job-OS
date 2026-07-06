/**
 * Source adapter interface and types
 *
 * This abstraction enables adding new job sources (Lever, etc.) without refactoring.
 * Each source adapter normalizes to the canonical job model.
 */

export interface UserCriteriaInput {
  userId: string;
  jobFunction?: string | null;
  locations?: string[] | null;
  visaRequired?: boolean | null;
  targetCompanies: string[];
}

export interface RawJobData {
  sourceId: string; // ID from the source API
  sourceName: string; // 'greenhouse' | 'lever'
  rawData: unknown; // Complete source response preserved
}

export interface CanonicalJob {
  sourceId: string;
  sourceName: string;
  title: string;
  company: string; // Company name (not board token)
  location: string;
  description: string; // Full HTML/markdown content
  url: string; // Application URL
  postedAt: string | null; // ISO timestamp
  updatedAt: string; // ISO timestamp from source
  metadata: {
    departmentName?: string;
    officeLocation?: string;
    employmentType?: string; // 'full-time' | 'part-time' | 'internship'
    remote?: boolean;
    [key: string]: unknown;
  };
}

export interface JobSource {
  name: string;

  /** All company names this source can poll (used for "All companies" discover mode) */
  getMonitoredCompanies(): string[];

  /** Fetch jobs matching user criteria from this source */
  fetchJobs(criteria: UserCriteriaInput): Promise<RawJobData[]>;

  /** Normalize raw source job to canonical model */
  normalizeJob(rawJob: RawJobData): CanonicalJob;

  /** Get all active source job IDs for a company (for inactive detection) */
  getActiveJobIds(boardToken: string): Promise<string[]>;
}
