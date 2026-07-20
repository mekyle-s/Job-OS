import { describe, expect, it } from 'vitest';
import { filterEligibleJobs, type JobWithFilters } from './eligibility';

function makeJob(overrides: Partial<JobWithFilters> = {}): JobWithFilters {
  return {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Acme',
    location: 'San Francisco, CA',
    visaSponsorship: null,
    remotePolicy: null,
    roleType: null,
    season: null,
    graduationWindow: null,
    ...overrides,
  };
}

describe('filterEligibleJobs', () => {
  it('passes everything through when no criteria are set', () => {
    const jobs = [makeJob(), makeJob({ id: 'job-2', visaSponsorship: 'no' })];
    expect(filterEligibleJobs(jobs, {})).toHaveLength(2);
  });

  it('excludes non-sponsoring jobs only when the user requires a visa', () => {
    const jobs = [
      makeJob({ id: 'no-sponsor', visaSponsorship: 'no' }),
      makeJob({ id: 'sponsors', visaSponsorship: 'yes' }),
      makeJob({ id: 'unknown', visaSponsorship: 'unknown' }),
    ];
    const filtered = filterEligibleJobs(jobs, { visaRequired: true });
    expect(filtered.map((j) => j.id)).toEqual(['sponsors', 'unknown']);
    expect(filterEligibleJobs(jobs, { visaRequired: false })).toHaveLength(3);
  });

  it('excludes onsite jobs outside the user locations, case-insensitively', () => {
    const jobs = [
      makeJob({ id: 'onsite-nyc', remotePolicy: 'onsite', location: 'New York, NY' }),
      makeJob({ id: 'onsite-sf', remotePolicy: 'onsite', location: 'San Francisco, CA' }),
      makeJob({ id: 'remote-anywhere', remotePolicy: 'remote', location: 'Anywhere' }),
    ];
    const filtered = filterEligibleJobs(jobs, { locations: ['new york'] });
    expect(filtered.map((j) => j.id)).toEqual(['onsite-nyc', 'remote-anywhere']);
  });

  it('keeps onsite jobs when the user has no location preference', () => {
    const jobs = [makeJob({ remotePolicy: 'onsite', location: 'Austin, TX' })];
    expect(filterEligibleJobs(jobs, { locations: [] })).toHaveLength(1);
  });

  it('excludes explicit job-type mismatches but keeps unknown types', () => {
    const jobs = [
      makeJob({ id: 'intern', roleType: 'internship' }),
      makeJob({ id: 'ft', roleType: 'full_time' }),
      makeJob({ id: 'unknown', roleType: 'unknown' }),
      makeJob({ id: 'untyped', roleType: null }),
    ];
    const filtered = filterEligibleJobs(jobs, { jobTypes: ['internship'] });
    expect(filtered.map((j) => j.id)).toEqual(['intern', 'unknown', 'untyped']);
  });

  it('excludes season mismatches but keeps year_round and unknown', () => {
    const jobs = [
      makeJob({ id: 'summer', season: 'summer' }),
      makeJob({ id: 'fall', season: 'fall' }),
      makeJob({ id: 'year-round', season: 'year_round' }),
      makeJob({ id: 'unknown', season: 'unknown' }),
    ];
    const filtered = filterEligibleJobs(jobs, { targetSeason: 'summer' });
    expect(filtered.map((j) => j.id)).toEqual(['summer', 'year-round', 'unknown']);
  });

  it('excludes graduation years outside the job window', () => {
    const jobs = [
      makeJob({ id: 'window', graduationWindow: '2025-2027' }),
      makeJob({ id: 'no-window', graduationWindow: null }),
    ];
    expect(filterEligibleJobs(jobs, { graduationYear: '2026' }).map((j) => j.id)).toEqual([
      'window',
      'no-window',
    ]);
    expect(filterEligibleJobs(jobs, { graduationYear: '2030' }).map((j) => j.id)).toEqual([
      'no-window',
    ]);
  });

  it('preserves the concrete element type (generic passthrough)', () => {
    const jobs = [{ ...makeJob(), fitScore: 0.9 }];
    const filtered = filterEligibleJobs(jobs, {});
    expect(filtered[0].fitScore).toBe(0.9);
  });
});
