import { z } from 'zod';

// ============================================================
// Requirement Enum Schemas
// ============================================================

/**
 * Requirement category enum
 */
export const RequirementCategorySchema = z.enum([
  'technical_skill',
  'experience',
  'education',
  'soft_skill',
  'other',
]);

/**
 * Requirement priority enum
 */
export const RequirementPrioritySchema = z.enum(['required', 'preferred', 'unknown']);

/**
 * Requirement review status enum
 */
export const RequirementReviewStatusSchema = z.enum([
  'parsed',
  'needs_review',
  'unparsed',
  'rejected', // soft-deleted: excluded from display/matching, reversible
]);

// ============================================================
// Extracted Requirement Schemas (for LLM output)
// ============================================================

/**
 * Single requirement extracted from job posting by LLM
 */
export const ExtractedRequirementSchema = z.object({
  category: RequirementCategorySchema,
  priority: RequirementPrioritySchema,
  normalized_text: z.string().describe('Clean, standardized requirement phrasing'),
  source_text: z.string().describe('Verbatim text from job posting'),
  source_span: z.string().nullable().describe('Context or section header from posting'),
});

/**
 * Complete LLM extraction output for a job posting
 */
export const JobRequirementsSchema = z.object({
  requirements: z.array(ExtractedRequirementSchema).describe('Extracted requirements list'),
  extractionNotes: z
    .string()
    .nullable()
    .describe('Optional notes about extraction quality or issues'),
});

// ============================================================
// CRUD Schemas (for API and manual operations)
// ============================================================

/**
 * Schema for updating a requirement (user edits)
 */
export const UpdateRequirementSchema = z.object({
  category: RequirementCategorySchema.optional(),
  priority: RequirementPrioritySchema.optional(),
  normalizedText: z.string().min(1).optional(),
  sourceText: z.string().min(1).optional(),
  sourceSpan: z.string().nullable().optional(),
  reviewStatus: RequirementReviewStatusSchema.optional(),
});

/**
 * Schema for creating a manual requirement
 */
export const CreateRequirementSchema = z.object({
  jobId: z.string(),
  category: RequirementCategorySchema,
  priority: RequirementPrioritySchema,
  normalizedText: z.string().min(1),
  sourceText: z.string().min(1),
  sourceSpan: z.string().nullable().optional(),
  reviewStatus: RequirementReviewStatusSchema.optional().default('parsed'),
});

// ============================================================
// TypeScript Type Exports
// ============================================================

export type RequirementCategory = z.infer<typeof RequirementCategorySchema>;
export type RequirementPriority = z.infer<typeof RequirementPrioritySchema>;
export type RequirementReviewStatus = z.infer<typeof RequirementReviewStatusSchema>;

export type ExtractedRequirement = z.infer<typeof ExtractedRequirementSchema>;
export type JobRequirements = z.infer<typeof JobRequirementsSchema>;

export type UpdateRequirement = z.infer<typeof UpdateRequirementSchema>;
export type CreateRequirement = z.infer<typeof CreateRequirementSchema>;
