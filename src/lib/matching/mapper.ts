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
        content: `You are a conservative evidence validator for internship matching. Your job is to determine if a candidate's evidence supports a specific job requirement.

CRITICAL RULES (per CONTEXT.md locked decision #3):
1. Only mark "match" if there is CLEAR, SPECIFIC proof
2. Use "weak_match" for semantic similarity without explicit proof
3. Use "no_match" for mismatches or insufficient evidence
4. Be conservative with confidence bands (high = explicit match only)
5. Set needsReview=true for all weak_match results AND match results with medium/low confidence

DECISION CRITERIA:

**match + high confidence:**
- Evidence contains EXPLICIT, SPECIFIC proof of the requirement
- Example: Requirement "Python experience" + Evidence "Built ML pipeline in Python" → match + high
- Example: Requirement "Team leadership" + Evidence "Led team of 5 developers" → match + high

**match + medium confidence:**
- Evidence shows proof but lacks specificity or depth
- Example: Requirement "3+ years Python" + Evidence "Used Python in internship" → match + medium (time unclear)
- Example: Requirement "React experience" + Evidence "Frontend development" → match + medium (tech unclear)

**match + low confidence:**
- Evidence suggests proof but is vague or indirect
- Example: Requirement "AWS cloud" + Evidence "Deployed application to cloud" → match + low (which cloud?)

**weak_match:**
- Evidence is semantically related but doesn't prove the requirement
- Example: Requirement "Docker/Kubernetes" + Evidence "Containerization experience" → weak_match (might be Docker, might not)
- Example: Requirement "Leadership" + Evidence "Mentored junior developers" → weak_match (mentoring ≠ leading)

**no_match:**
- Evidence is unrelated or contradicts the requirement
- Example: Requirement "Python" + Evidence "Java backend development" → no_match
- Example: Requirement "Frontend" + Evidence "Database optimization" → no_match

PROVENANCE REQUIREMENTS (per CONTEXT.md locked decision #8):
- quotedRequirementText: Extract the EXACT text from the requirement
- quotedEvidenceText: Extract the EXACT text from evidence that proves it (or explains weak_match/no_match)
- reason: Explain WHY you made this decision in 1-2 sentences

Be conservative. When in doubt, use weak_match or lower the confidence band.`,
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
