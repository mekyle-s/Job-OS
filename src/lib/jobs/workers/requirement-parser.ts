import { extractRequirements } from '../parsers/requirement-extractor';
import { updateJobParseStatus } from '@/lib/db/queries/jobs';
import { createRequirements } from '@/lib/db/queries/requirements';

/**
 * Extract requirements for a single job and store them, updating parse status.
 * Serverless-safe: called directly from routes, no queue process required.
 */
export async function extractJobRequirements(
  jobId: string,
  description: string
): Promise<{ jobId: string; requirementsExtracted: number; extractionNotes?: string | null }> {
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
    throw error;
  }
}
