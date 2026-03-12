import { z } from 'zod';

// ============================================================
// Resume Evidence Schemas (for OpenAI Structured Outputs)
// ============================================================

/**
 * Schema for work experience entries parsed from resumes
 */
export const ExperienceSchema = z.object({
  role: z.string().describe('Job title or role'),
  company: z.string().describe('Company or organization name'),
  startDate: z.string().describe('Start date in YYYY-MM format'),
  endDate: z.string().nullable().describe('End date in YYYY-MM format, null if current'),
  location: z
    .string()
    .nullable()
    .describe('Location of the job (e.g., "San Francisco, CA" or "Remote"), null if not specified'),
  achievements: z
    .array(z.string())
    .describe('List of achievements, responsibilities, or accomplishments'),
  skills: z.array(z.string()).describe('Skills or technologies used in this role'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score from 0.0 to 1.0 for extraction accuracy'),
});

/**
 * Schema for project entries parsed from resumes
 */
export const ProjectSchema = z.object({
  name: z.string().describe('Project name or title'),
  description: z.string().describe('Project description or summary'),
  technologies: z.array(z.string()).describe('Technologies, frameworks, or tools used'),
  url: z
    .string()
    .nullable()
    .describe('Project URL, GitHub link, or demo link, null if not available'),
  achievements: z.array(z.string()).describe('Key achievements, outcomes, or highlights'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score from 0.0 to 1.0 for extraction accuracy'),
});

/**
 * Schema for education entries parsed from resumes
 */
export const EducationSchema = z.object({
  degree: z.string().describe('Degree type (e.g., "Bachelor of Science in Computer Science")'),
  institution: z.string().describe('University or institution name'),
  graduationDate: z
    .string()
    .nullable()
    .describe('Graduation date in YYYY-MM format, null if in progress'),
  location: z.string().nullable().describe('Location of the institution, null if not specified'),
  gpa: z.string().nullable().describe('GPA or academic honors, null if not specified'),
});

/**
 * Complete resume evidence schema - output from OpenAI structured parsing
 */
export const ResumeEvidenceSchema = z.object({
  experiences: z.array(ExperienceSchema).describe('Work experience entries'),
  projects: z.array(ProjectSchema).describe('Project entries'),
  skills: z.array(z.string()).describe('List of skills mentioned in resume'),
  education: z.array(EducationSchema).describe('Education entries'),
});

// ============================================================
// CRUD Validation Schemas (for API routes and forms)
// ============================================================

/**
 * Schema for creating a new evidence item
 */
export const EvidenceItemCreateSchema = z.object({
  itemType: z
    .enum(['experience', 'project', 'skill', 'education'])
    .describe('Type of evidence item'),
  title: z
    .string()
    .min(1, 'Title is required')
    .describe('Role title, project name, skill name, or degree'),
  company: z.string().optional().describe('Company or organization name (for experience items)'),
  startDate: z.string().optional().describe('Start date in YYYY-MM format'),
  endDate: z.string().optional().describe('End date in YYYY-MM format, omit if current'),
  content: z.string().optional().describe('Main description text or details'),
  metadata: z
    .object({
      skills: z.array(z.string()).optional(),
      technologies: z.array(z.string()).optional(),
      achievements: z.array(z.string()).optional(),
      links: z.array(z.object({ type: z.string(), url: z.string() })).optional(),
      location: z.string().optional(),
      gpa: z.string().optional(),
    })
    .optional()
    .describe('Additional structured metadata'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(1.0)
    .describe('Confidence score (0.0-1.0), defaults to 1.0 for manual entries'),
  isManual: z
    .boolean()
    .optional()
    .default(true)
    .describe('True if user-created, false if parsed from source'),
});

/**
 * Schema for updating an existing evidence item (all fields optional for partial updates)
 */
export const EvidenceItemUpdateSchema = z.object({
  itemType: z.enum(['experience', 'project', 'skill', 'education']).optional(),
  title: z.string().min(1).optional(),
  company: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  content: z.string().optional(),
  metadata: z
    .object({
      skills: z.array(z.string()).optional(),
      technologies: z.array(z.string()).optional(),
      achievements: z.array(z.string()).optional(),
      links: z.array(z.object({ type: z.string(), url: z.string() })).optional(),
      location: z.string().optional(),
      gpa: z.string().optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  isManual: z.boolean().optional(),
});

// ============================================================
// TypeScript Type Exports
// ============================================================

export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type ResumeEvidence = z.infer<typeof ResumeEvidenceSchema>;

export type EvidenceItemCreate = z.infer<typeof EvidenceItemCreateSchema>;
export type EvidenceItemUpdate = z.infer<typeof EvidenceItemUpdateSchema>;
