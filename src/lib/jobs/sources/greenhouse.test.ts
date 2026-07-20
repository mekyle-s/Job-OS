import { describe, it, expect } from 'vitest';
import { jobFunctionMatches, GreenhouseAdapter } from './greenhouse';

describe('jobFunctionMatches', () => {
  it('matches when every word of a function appears in the job text', () => {
    expect(jobFunctionMatches('Software Engineer', 'Software Engineer, Backend')).toBe(true);
    expect(jobFunctionMatches('Data Analyst', 'Senior Data Analyst - Growth')).toBe(true);
  });

  it('requires all words of a single function to match', () => {
    expect(jobFunctionMatches('Solutions Engineer', 'Software Engineer')).toBe(false);
  });

  it('passes if ANY comma-separated function matches', () => {
    expect(jobFunctionMatches('AI Engineer, Data Analyst', 'Data Analytics Intern')).toBe(true);
    expect(jobFunctionMatches('AI Engineer; Data Analyst', 'Machine Learning Platform')).toBe(
      false
    );
  });

  it('matches similar stems for words of 4+ characters', () => {
    expect(jobFunctionMatches('Engineer', 'Engineering Intern')).toBe(true);
    expect(jobFunctionMatches('Analyst', 'Analytics Intern')).toBe(true);
    expect(jobFunctionMatches('Consulting', 'Consultant, Strategy')).toBe(true);
  });

  it('does not stem-match short or length-divergent words', () => {
    expect(jobFunctionMatches('AI', 'Air Quality Engineer')).toBe(false);
    expect(jobFunctionMatches('Intern', 'International Sales')).toBe(false);
  });

  it('treats an empty spec as match-all', () => {
    expect(jobFunctionMatches('', 'Anything')).toBe(true);
    expect(jobFunctionMatches(' , ', 'Anything')).toBe(true);
  });
});

describe('GreenhouseAdapter', () => {
  const adapter = new GreenhouseAdapter();

  describe('resolveBoardToken', () => {
    it('lowercases and strips non-alphanumerics', () => {
      expect(adapter.resolveBoardToken('Scale AI')).toBe('scaleai');
      expect(adapter.resolveBoardToken('OpenAI')).toBe('openai');
      expect(adapter.resolveBoardToken("O'Reilly & Sons")).toBe('oreillysons');
    });

    it('is idempotent', () => {
      const once = adapter.resolveBoardToken('Stripe, Inc.');
      expect(adapter.resolveBoardToken(once)).toBe(once);
    });
  });

  describe('getCompanyDisplayName', () => {
    it('keeps proper casing for known discover companies', () => {
      expect(adapter.getCompanyDisplayName('airbnb')).toBe('Airbnb');
    });

    it('title-cases unknown companies deterministically', () => {
      expect(adapter.getCompanyDisplayName('acme rockets')).toBe('Acme Rockets');
      expect(adapter.getCompanyDisplayName('  acme   rockets  ')).toBe('Acme Rockets');
    });
  });
});
