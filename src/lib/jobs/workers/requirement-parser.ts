import type { Job } from 'pg-boss';
import { extractRequirements } from '../parsers/requirement-extractor';
import { updateJobParseStatus } from '@/lib/db/queries/jobs';
import { createRequirements } from '@/lib/db/queries/requirements';

export const REQUIREMENT_PARSER_QUEUE = 'extract-requirements';

interface ExtractRequirementsPayload {
  jobId: string;
  description: string;
}

/**
 * Requirement parser worker
 *
 * Extracts requirements from a job description using LLM and stores them with proper parse status updates.
 */
export async function requirementParserHandler(jobs: Job<ExtractRequirementsPayload>[]) {
  const job = jobs[0];
  const { jobId, description } = job.data;

  try {
    // 1. Update job parse status to 'processing'
    await updateJobParseStatus(jobId, 'processing');

    // 2. Call requirement extractor
    const extracted = await extractRequirements(description);

    // 3. Store extracted requirements
    const requirements = await createRequirements(jobId, extracted.requirements);

    // 4. Update job parse status to 'completed'
    await updateJobParseStatus(jobId, 'completed');

    return {
      jobId,
      requirementsExtracted: requirements.length,
      extractionNotes: extracted.extractionNotes,
    };
  } catch (error) {
    // On failure, update job parse status to 'failed' with error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
    await updateJobParseStatus(jobId, 'failed', errorMessage);

    // Re-throw error so pg-boss marks the job as failed (enables retry)
    throw error;
  }
}
