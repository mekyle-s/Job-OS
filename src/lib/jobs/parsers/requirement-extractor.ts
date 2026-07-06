import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { JobRequirementsSchema, type JobRequirements } from '@/lib/schemas/requirements';

/**
 * Conservative requirement extractor
 *
 * Extracts only explicitly stated requirements from job postings.
 * Uses OpenAI Structured Outputs with conservative prompting to avoid inference.
 */

// Lazy-initialize OpenAI client to avoid build-time errors when API key is missing (per DEV-014)
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI(); // Uses OPENAI_API_KEY env var automatically
  }
  return client;
}

/**
 * Extract requirements from job description
 *
 * @param jobDescription - Full job posting content (HTML will be stripped)
 * @returns Extracted requirements with conservative extraction
 */
// Cap input tokens: requirements live in the first part of a posting; very long
// descriptions (benefits, legal boilerplate) mostly add cost, not signal.
const MAX_DESCRIPTION_CHARS = 16000;

export async function extractRequirements(jobDescription: string): Promise<JobRequirements> {
  // Strip HTML tags and normalize whitespace
  const cleanText = jobDescription
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION_CHARS);

  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.parse({
    // gpt-4o-mini: high-volume background extraction task; the conservative,
    // verbatim-extraction prompt does not need a frontier model
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a conservative job requirement extractor. Extract ONLY explicitly stated requirements from the job posting.

RULES:
1. NEVER infer or expand requirements ("Strong communicator" stays as-is; "scalable systems" does not become "distributed systems").
2. Preserve verbatim source text exactly as written.
3. category: technical_skill (languages/frameworks/tools) | experience (years/roles/domain) | education (degrees/certifications) | soft_skill (communication/teamwork/leadership) | other (visa/availability/travel/clearance).
4. priority: "required"/"must have"/"essential"/"minimum" → required; "preferred"/"nice to have"/"bonus"/"plus"/"ideally" → preferred; no clear signal → unknown.
5. When in doubt, extract less rather than more — fewer false positives beats comprehensive coverage.`,
      },
      {
        role: 'user',
        content: cleanText,
      },
    ],
    response_format: zodResponseFormat(JobRequirementsSchema, 'job_requirements'),
    temperature: 0.1, // Low temperature for consistent extraction
  });

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new Error(`OpenAI refused to extract requirements: ${message.refusal}`);
  }

  if (!message?.parsed) {
    throw new Error('Failed to extract requirements: no structured output returned');
  }

  return message.parsed;
}
