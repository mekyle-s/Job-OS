import { z } from 'zod';

// ============================================================
// Job Metadata Schema
// ============================================================

/**
 * Schema for job metadata JSONB field
 */
export const JobMetadataSchema = z.object({
  departmentName: z.string().optional(),
  officeLocation: z.string().optional(),
  employmentType: z.string().optional(),
  remote: z.boolean().optional(),
  visaSponsorship: z.boolean().optional(),
});

// ============================================================
// Canonical Job Schema
// ============================================================

/**
 * Complete canonical job model schema
 */
export const CanonicalJobSchema = z.object({
  id: z.string(),
  source: z.enum(['greenhouse', 'lever']),
  sourceJobId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  url: z.string().url(),
  postedAt: z.string().datetime().nullable(),
  sourceUpdatedAt: z.string().datetime(),
  metadata: JobMetadataSchema.nullable(),
  parseStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
  parseCompletedAt: z.string().datetime().nullable(),
  parseError: z.string().nullable(),
  isActive: z.boolean(),
  firstSeenAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

/**
 * Schema for creating a new job
 */
export const CreateJobSchema = z.object({
  source: z.enum(['greenhouse', 'lever']),
  sourceJobId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  url: z.string().url(),
  postedAt: z.string().datetime().nullable(),
  sourceUpdatedAt: z.string().datetime(),
  metadata: JobMetadataSchema.nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for filtering jobs
 */
export const JobFilterSchema = z.object({
  company: z.string().optional(),
  location: z.string().optional(),
  parseStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

// ============================================================
// TypeScript Type Exports
// ============================================================

export type JobMetadata = z.infer<typeof JobMetadataSchema>;
export type CanonicalJob = z.infer<typeof CanonicalJobSchema>;
export type CreateJob = z.infer<typeof CreateJobSchema>;
export type JobFilter = z.infer<typeof JobFilterSchema>;
