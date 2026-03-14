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
export async function extractRequirements(jobDescription: string): Promise<JobRequirements> {
  // Strip HTML tags and normalize whitespace
  const cleanText = jobDescription
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: `You are a conservative job requirement extractor. Extract ONLY explicitly stated requirements from job postings.

CRITICAL RULES:
1. NEVER infer or assume requirements not clearly stated
2. If a requirement is ambiguous, mark priority as "unknown"
3. Preserve verbatim source text exactly as written
4. Categorize accurately: technical_skill, experience, education, soft_skill, other
5. Detect priority from keywords:
   - "required", "must have", "essential", "minimum" → required
   - "preferred", "nice to have", "bonus", "plus", "ideally" → preferred
   - No clear signal → unknown

CATEGORIES:
- technical_skill: Programming languages, frameworks, tools, technologies, platforms
- experience: Years of experience, previous roles, domain knowledge
- education: Degrees, certifications, courses, academic requirements
- soft_skill: Communication, teamwork, leadership, problem-solving, collaboration
- other: Anything else (visa status, availability, travel, clearance, etc.)

CONSERVATIVE EXTRACTION EXAMPLES:
✓ "3+ years of Python experience" → Extract (explicit)
✓ "Bachelor's degree in Computer Science" → Extract (explicit)
✗ "Experience building scalable systems" → Do NOT expand to "distributed systems"
✗ "Strong communicator" → Extract as-is, do NOT expand to "written and verbal communication"

When in doubt, extract less rather than more. Fewer false positives is better than comprehensive coverage.`,
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
