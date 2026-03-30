import { z } from 'zod';

// Decision bands per CONTEXT.md locked decision #3
export const LLMValidationSchema = z.object({
  decision: z.enum(['match', 'weak_match', 'no_match']),
  reason: z.string(),
  quotedRequirementText: z.string(),
  quotedEvidenceText: z.string(),
  confidenceBand: z.enum(['high', 'medium', 'low']),
  needsReview: z.boolean(),
});

export type LLMValidation = z.infer<typeof LLMValidationSchema>;

// Create Evidence Mapping Schema (for API input)
export const CreateEvidenceMappingSchema = z.object({
  requirementId: z.string(),
  evidenceItemId: z.string(),
  decision: z.enum(['match', 'weak_match', 'no_match']),
  confidenceBand: z.enum(['high', 'medium', 'low']),
  reason: z.string(),
  needsReview: z.boolean(),
  sourceRequirementText: z.string(),
  sourceEvidenceExcerpt: z.string(),
});

// Update Evidence Mapping Schema (for manual edits per CONTEXT.md locked decision #8)
export const UpdateEvidenceMappingSchema = z.object({
  decision: z.enum(['match', 'weak_match', 'no_match']).optional(),
  confidenceBand: z.enum(['high', 'medium', 'low']).optional(),
  reason: z.string().optional(),
  sourceEvidenceExcerpt: z.string().optional(),
  manualOverrideReason: z.string().optional(),
});

// Fit Band enum and helper (per CONTEXT.md locked decision #4)
export const FitBand = z.enum(['high', 'medium', 'low']);
export type FitBand = z.infer<typeof FitBand>;

// Fit band determination per CONTEXT.md locked decision #4
export function determineFitBand(coveragePercent: number, avgConfidenceBand: string): FitBand {
  if (coveragePercent >= 80 && avgConfidenceBand !== 'low') return 'high';
  if (coveragePercent >= 50) return 'medium';
  return 'low';
}

// Eligibility filter schemas (per CONTEXT.md locked decision #2)
export const EligibilityFiltersSchema = z.object({
  visaSponsorship: z.enum(['yes', 'no', 'unknown']).nullable().optional(),
  remotePolicy: z.enum(['remote', 'hybrid', 'onsite', 'unknown']).nullable().optional(),
  roleType: z.enum(['internship', 'full_time', 'part_time', 'contract', 'unknown']).nullable().optional(),
  season: z.enum(['summer', 'fall', 'winter', 'spring', 'year_round', 'unknown']).nullable().optional(),
  graduationWindow: z.string().nullable().optional(),
});
