/**
 * Hard eligibility filters applied BEFORE semantic matching.
 * Per CONTEXT.md locked decision #2: Exclude clearly ineligible jobs.
 *
 * Filter order:
 * 1. Visa/Work Authorization
 * 2. Location/Remote
 * 3. Job Type (full-time / part-time / internship / contract)
 * 4. Season/Term
 * 5. Graduation Window
 *
 * Conservative approach: Unknown values pass through (don't exclude what we can't confirm).
 */

export interface UserCriteriaFilters {
  visaRequired?: boolean;
  locations?: string[];
  acceptRemote?: boolean;
  targetSeason?: string;
  graduationYear?: string;
  /** Job types the user wants: 'internship' | 'full_time' | 'part_time' | 'contract'. Empty/undefined = all */
  jobTypes?: string[];
}

export interface JobWithFilters {
  id: string;
  title: string;
  company: string;
  visaSponsorship?: string | null; // 'yes' | 'no' | 'unknown'
  remotePolicy?: string | null; // 'remote' | 'hybrid' | 'onsite' | 'unknown'
  roleType?: string | null; // 'internship' | 'full_time' | 'part_time' | 'contract' | 'unknown'
  season?: string | null; // 'summer' | 'fall' | 'winter' | 'spring' | 'year_round' | 'unknown'
  graduationWindow?: string | null; // free text like "2025-2027"
  location: string;
  [key: string]: unknown;
}

/**
 * Apply all eligibility filters to a list of jobs.
 * Jobs that fail ANY filter are excluded.
 * Unknown values pass through (conservative: don't exclude what we can't confirm).
 */
export function filterEligibleJobs(
  jobs: JobWithFilters[],
  userCriteria: UserCriteriaFilters
): JobWithFilters[] {
  return jobs.filter((job) => {
    // Filter 1: Visa/Work Authorization
    if (userCriteria.visaRequired === true && job.visaSponsorship === 'no') {
      return false; // User requires visa, job doesn't sponsor
    }

    // Filter 2: Location/Remote
    if (job.remotePolicy === 'onsite') {
      // Job is on-site only, check if user location matches
      const userLocations = userCriteria.locations || [];
      const hasLocationMatch =
        userLocations.length === 0 || // User accepts any location
        userLocations.some((loc) => job.location.toLowerCase().includes(loc.toLowerCase()));

      if (!hasLocationMatch) {
        return false; // Job is on-site and location doesn't match
      }
    }

    // Filter 3: Job Type
    // Exclude only explicit mismatches; unknown role types pass through
    if (
      userCriteria.jobTypes &&
      userCriteria.jobTypes.length > 0 &&
      job.roleType &&
      job.roleType !== 'unknown' &&
      !userCriteria.jobTypes.includes(job.roleType)
    ) {
      return false; // Job type doesn't match user's selected types
    }

    // Filter 4: Season/Term
    if (
      userCriteria.targetSeason &&
      job.season &&
      job.season !== 'unknown' &&
      job.season !== 'year_round' &&
      userCriteria.targetSeason !== job.season
    ) {
      return false; // Season mismatch
    }

    // Filter 5: Graduation Window
    // Simple heuristic: if both are known and don't overlap, exclude
    if (userCriteria.graduationYear && job.graduationWindow) {
      const userYear = parseInt(userCriteria.graduationYear, 10);
      if (!isNaN(userYear) && !job.graduationWindow.includes(userCriteria.graduationYear)) {
        // Check if user's grad year falls within job's window
        // Parse window like "2025-2027" or "2025"
        const windowMatch = job.graduationWindow.match(/(\d{4})/g);
        if (windowMatch && windowMatch.length > 0) {
          const windowYears = windowMatch.map((y) => parseInt(y, 10));
          const minYear = Math.min(...windowYears);
          const maxYear = Math.max(...windowYears);

          if (userYear < minYear || userYear > maxYear) {
            return false; // Graduation year outside window
          }
        }
      }
    }

    // Passed all filters
    return true;
  });
}
