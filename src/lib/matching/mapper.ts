import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { LLMValidationSchema, type LLMValidation } from '@/lib/schemas/matching';
import { LLM_MODEL_VERSION } from './versions';

/**
 * LLM-based evidence-to-requirement validation.
 * Per CONTEXT.md locked decision #3: Conservative prompting with structured decision bands.
 *
 * Returns match/weak_match/no_match with confidence bands and provenance (quoted texts).
 */

// Lazy-initialize OpenAI client per DEV-014
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI(); // Uses OPENAI_API_KEY env var automatically
  }
  return client;
}

/**
 * Validate whether evidence supports a requirement using LLM.
 *
 * Decision mapping per CONTEXT.md locked decision #3:
 * - match + high confidence → auto-accept, store mapping
 * - match + medium/low confidence → store but needsReview=true
 * - weak_match → store, always needsReview=true
 * - no_match → discard, do not store
 *
 * @param requirementText - The requirement text to validate against
 * @param evidenceContext - The evidence text that may support this requirement
 * @returns LLM validation result with decision, confidence band, reason, and provenance
 */
export async function validateEvidenceMatch(
  requirementText: string,
  evidenceContext: string
): Promise<LLMValidation> {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.parse({
    model: LLM_MODEL_VERSION,
    messages: [
      {
        role: 'system',
        content: `You are a conservative evidence validator for job matching. Decide whether the candidate's evidence supports the given job requirement.

DECISIONS (per CONTEXT.md locked decision #3):
- match + high: EXPLICIT, SPECIFIC proof (e.g., "Python experience" + "Built ML pipeline in Python").
- match + medium: proof lacking specificity or depth (e.g., "3+ years Python" + "Used Python in internship" — duration unclear).
- match + low: vague or indirect proof (e.g., "AWS cloud" + "Deployed to cloud" — which cloud?).
- weak_match: semantically related but not proven (e.g., "Docker/Kubernetes" + "Containerization experience").
- no_match: unrelated or contradictory (e.g., "Python" + "Java backend development").

RULES:
1. "match" requires clear, specific proof; high confidence means explicit proof only.
2. needsReview=true for every weak_match AND every match with medium/low confidence.
3. quotedRequirementText: EXACT text from the requirement. quotedEvidenceText: EXACT text from the evidence that proves it (or explains weak_match/no_match). reason: 1-2 sentences.
4. When in doubt, use weak_match or lower the confidence band.`,
      },
      {
        role: 'user',
        content: `Requirement: ${requirementText}

Evidence: ${evidenceContext}`,
      },
    ],
    response_format: zodResponseFormat(LLMValidationSchema, 'llm_validation'),
    temperature: 0.1, // Low temperature for consistent validation
  });

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new Error(`OpenAI refused to validate match: ${message.refusal}`);
  }

  if (!message?.parsed) {
    throw new Error('Failed to validate match: no structured output returned');
  }

  return message.parsed;
}
