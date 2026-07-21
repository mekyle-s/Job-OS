import { describe, expect, it } from 'vitest';
import { rankJobRows, calculateFreshnessScore, type RankableJobRow } from './ranker';

let seq = 0;
function makeRow(overrides: Partial<RankableJobRow> = {}): RankableJobRow {
  seq++;
  return {
    jobId: `job-${seq}`,
    title: 'AI Engineer',
    company: 'Acme',
    location: 'Remote',
    url: `https://example.com/${seq}`,
    sourceUpdatedAt: new Date('2026-07-20T00:00:00Z'),
    totalRequirements: 10,
    mappedRequirements: 0,
    daysOld: 1,
    departmentName: null,
    ...overrides,
  };
}

describe('rankJobRows', () => {
  it('filters out jobs that do not match the job function', () => {
    const rows = [
      makeRow({ jobId: 'ai', title: 'AI Engineer Intern' }),
      makeRow({ jobId: 'flexible', title: 'Engineer, AI Platform' }),
      makeRow({ jobId: 'sales', title: 'Account Executive' }),
      makeRow({ jobId: 'design', title: 'Product Designer' }),
    ];
    const ranked = rankJobRows(rows, { jobFunction: 'AI Engineer' });
    expect(ranked.map((j) => j.jobId).sort()).toEqual(['ai', 'flexible']);
  });

  it('matches the job function against the department name too', () => {
    const rows = [
      makeRow({ jobId: 'via-dept', title: 'Software Engineer', departmentName: 'AI' }),
      makeRow({ jobId: 'no-dept', title: 'Software Engineer', departmentName: 'Payments' }),
    ];
    const ranked = rankJobRows(rows, { jobFunction: 'AI Engineer' });
    expect(ranked.map((j) => j.jobId)).toEqual(['via-dept']);
  });

  it('keeps every job when no job function is set', () => {
    const rows = [makeRow({ title: 'Account Executive' }), makeRow({ title: 'Chef' })];
    expect(rankJobRows(rows, {})).toHaveLength(2);
  });

  it('ranks a strong-fit older job above a fresh zero-fit job (70/30 weighting)', () => {
    const rows = [
      makeRow({ jobId: 'fresh-no-fit', mappedRequirements: 0, daysOld: 0 }),
      makeRow({ jobId: 'old-strong-fit', mappedRequirements: 10, daysOld: 30 }),
    ];
    const ranked = rankJobRows(rows, {});
    expect(ranked[0].jobId).toBe('old-strong-fit');
    expect(ranked[0].fitScore).toBe(1);
    expect(ranked[0].compositeScore).toBeGreaterThan(ranked[1].compositeScore);
  });

  it('caps the queue at 50 jobs', () => {
    const rows = Array.from({ length: 60 }, () => makeRow());
    expect(rankJobRows(rows, {})).toHaveLength(50);
  });

  it('applies hard eligibility filters (visa)', () => {
    const rows = [
      makeRow({ jobId: 'sponsors', visaSponsorship: 'yes' }),
      makeRow({ jobId: 'no-sponsor', visaSponsorship: 'no' }),
    ];
    const ranked = rankJobRows(rows, { visaRequired: true });
    expect(ranked.map((j) => j.jobId)).toEqual(['sponsors']);
  });

  it('computes fit from mapped/total requirements', () => {
    const [ranked] = rankJobRows(
      [makeRow({ totalRequirements: 4, mappedRequirements: 3, daysOld: 0 })],
      {}
    );
    expect(ranked.fitScore).toBe(0.75);
    expect(ranked.compositeScore).toBeCloseTo(0.7 * 0.75 + 0.3 * calculateFreshnessScore(0));
  });
});
