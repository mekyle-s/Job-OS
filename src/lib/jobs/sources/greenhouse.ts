import type { JobSource, UserCriteriaInput, RawJobData, CanonicalJob } from './adapter';

/**
 * Flexible job-function matching against a job's title + department names.
 *
 * The criteria string holds one or more functions separated by commas
 * (also accepts ; ), e.g. "AI Engineer, Solutions Engineer, Data Analyst".
 * A job passes if ANY function matches. A function matches when EVERY one of
 * its words appears as a token in the title/department text.
 *
 * Tokens compare by exact equality, or — for words of 4+ characters with
 * similar lengths — by a shared stem, so "Engineering" ≈ "Engineer",
 * "Analyst" ≈ "Analytics", "Consulting" ≈ "Consultant". Short words like
 * "AI" must match exactly (no "AI" ≈ "Air"), and length-divergent pairs
 * like "Intern" vs "International" do not match.
 */
export function jobFunctionMatches(functionSpec: string, jobText: string): boolean {
  const terms = functionSpec
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => t.split(/[^a-z0-9+#.]+/).filter(Boolean));

  if (terms.length === 0) return true;

  const tokens = jobText
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean);

  const stemMatch = (a: string, b: string): boolean => {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    if (Math.abs(a.length - b.length) > 4) return false;
    const n = Math.min(a.length, b.length);
    let p = 0;
    while (p < n && a[p] === b[p]) p++;
    return p >= Math.max(4, n - 3);
  };

  const wordMatches = (word: string) => tokens.some((token) => stemMatch(word, token));

  return terms.some((words) => words.every(wordMatches));
}

/**
 * Greenhouse job board adapter
 *
 * Fetches jobs from Greenhouse public API and normalizes to canonical model.
 * V1 uses hardcoded board token mapping for well-known companies.
 */
export class GreenhouseAdapter implements JobSource {
  name = 'greenhouse';
  private baseUrl = 'https://boards-api.greenhouse.io/v1/boards';

  // Company name → Greenhouse board token mapping
  // Board tokens are URL slugs from boards.greenhouse.io/{token}
  private boardTokens: Record<string, string> = {
    airbnb: 'airbnb',
    stripe: 'stripe',
    figma: 'figma',
    notion: 'notion',
    twitch: 'twitch',
    cloudflare: 'cloudflare',
    discord: 'discord',
    databricks: 'databricks',
    plaid: 'plaid',
    ramp: 'ramp',
    airtable: 'airtable',
    webflow: 'webflow',
    spotify: 'spotify',
    asana: 'asana',
    duolingo: 'duolingo',
  };

  /**
   * All companies this adapter can poll (discover mode polls every board)
   */
  getMonitoredCompanies(): string[] {
    return Object.keys(this.boardTokens);
  }

  /**
   * Fetch jobs matching user criteria
   *
   * Processes companies sequentially to avoid rate limits (per Pitfall 1)
   */
  async fetchJobs(criteria: UserCriteriaInput): Promise<RawJobData[]> {
    const allJobs: RawJobData[] = [];

    // Process companies sequentially to avoid rate limits
    for (const companyName of criteria.targetCompanies) {
      const boardToken = this.boardTokens[companyName.toLowerCase()];
      if (!boardToken) {
        console.warn(`[Greenhouse] No board token for company: ${companyName}`);
        continue;
      }

      try {
        const jobs = await this.fetchCompanyJobs(boardToken);

        // Filter by user criteria
        const filteredJobs = jobs.filter((job) => {
          // Filter by location if specified
          if (criteria.locations && criteria.locations.length > 0) {
            const locationMatch = criteria.locations.some((loc) =>
              job.location.name.toLowerCase().includes(loc.toLowerCase())
            );
            if (!locationMatch) return false;
          }

          // Filter by job function(s) if specified — flexible matching
          // against title + departments (see jobFunctionMatches)
          if (criteria.jobFunction) {
            const departmentNames =
              job.departments?.map((dept: { name: string }) => dept.name).join(' ') ?? '';
            if (!jobFunctionMatches(criteria.jobFunction, `${job.title} ${departmentNames}`)) {
              return false;
            }
          }

          return true;
        });

        // Convert to RawJobData format
        for (const job of filteredJobs) {
          allJobs.push({
            sourceId: String(job.id),
            sourceName: 'greenhouse',
            rawData: job,
          });
        }
      } catch (error) {
        console.error(`[Greenhouse] Failed to fetch jobs for ${companyName}:`, error);
        // Continue to next company on error
      }
    }

    return allJobs;
  }

  /**
   * Fetch jobs from a specific Greenhouse board
   *
   * Handles rate limits and errors gracefully
   */
  private async fetchCompanyJobs(boardToken: string): Promise<any[]> {
    const url = `${this.baseUrl}/${boardToken}/jobs?content=true`;

    const response = await fetch(url);

    // Handle rate limiting with simple retry
    if (response.status === 429) {
      console.warn(`[Greenhouse] Rate limited for ${boardToken}, retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return this.fetchCompanyJobs(boardToken); // Retry once
    }

    if (!response.ok) {
      throw new Error(`Greenhouse API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.jobs || [];
  }

  /**
   * Normalize Greenhouse job to canonical model
   */
  normalizeJob(rawJob: RawJobData): CanonicalJob {
    const job = rawJob.rawData as any;

    // Reverse lookup company name from board token
    const company = this.getCompanyName(job);

    // Detect employment type from title
    const employmentType = this.detectEmploymentType(job.title);

    // Detect remote from location
    const remote = job.location?.name?.toLowerCase().includes('remote') || false;

    return {
      sourceId: rawJob.sourceId,
      sourceName: 'greenhouse',
      title: job.title || 'Untitled Position',
      company,
      location: job.location?.name || 'Not specified',
      description: job.content || '',
      url: job.absolute_url || '',
      postedAt: job.created_at || null,
      updatedAt: job.updated_at || new Date().toISOString(),
      metadata: {
        departmentName: job.departments?.[0]?.name,
        officeLocation: job.offices?.[0]?.name,
        employmentType,
        remote,
      },
    };
  }

  /**
   * Get all active job IDs for a company board
   *
   * Used for inactive detection - fetches without content for speed
   */
  async getActiveJobIds(boardToken: string): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/${boardToken}/jobs`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[Greenhouse] Failed to fetch active jobs for ${boardToken}`);
        return [];
      }

      const data = await response.json();
      return (data.jobs || []).map((job: any) => String(job.id));
    } catch (error) {
      console.error(`[Greenhouse] Error fetching active job IDs for ${boardToken}:`, error);
      return [];
    }
  }

  /**
   * Reverse lookup company name from job metadata
   *
   * Uses board token mapping or job metadata
   */
  private getCompanyName(job: any): string {
    // Try to find company name from metadata
    if (job.metadata?.company) {
      return job.metadata.company;
    }

    // Reverse lookup from board tokens
    // Note: This is a heuristic - in production we'd pass board token through
    for (const [companyName, token] of Object.entries(this.boardTokens)) {
      // Check if job data hints at the company
      const jobStr = JSON.stringify(job).toLowerCase();
      if (jobStr.includes(companyName)) {
        return companyName.charAt(0).toUpperCase() + companyName.slice(1);
      }
    }

    return 'Unknown Company';
  }

  /**
   * Detect employment type from job title
   */
  private detectEmploymentType(title: string): string {
    const lowerTitle = title.toLowerCase();

    // "intern" as its own word (avoid matching "internal", "international")
    if (
      /\bintern(ship)?s?\b/.test(lowerTitle) ||
      lowerTitle.includes('co-op') ||
      lowerTitle.includes('coop')
    ) {
      return 'internship';
    }
    if (lowerTitle.includes('part-time') || lowerTitle.includes('part time')) {
      return 'part-time';
    }
    if (
      lowerTitle.includes('contract') ||
      lowerTitle.includes('contractor') ||
      lowerTitle.includes('temporary')
    ) {
      return 'contract';
    }
    return 'full-time';
  }
}
