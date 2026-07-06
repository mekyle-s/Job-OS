import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ResumeEvidenceSchema, type ResumeEvidence } from '@/lib/schemas/evidence';

// Lazy-initialize OpenAI client to avoid build-time errors when API key is missing
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI(); // Uses OPENAI_API_KEY env var automatically
  }
  return client;
}

// Resumes are short documents; cap input to guard against pathological
// extractions (e.g., PDF-to-text blowups) driving up token costs.
const MAX_RESUME_CHARS = 15000;

export async function parseResumeText(resumeText: string): Promise<ResumeEvidence> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.parse({
    // gpt-4o-mini: structured resume extraction is a high-volume task that
    // does not need a frontier model — ~15-30x cheaper than gpt-4o
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a resume parser. Extract structured evidence from the resume text.

Rules:
- Extract ALL experiences, projects, and education entries.
- skills: a deduplicated list of every technical and professional skill mentioned anywhere in the resume.
- Dates: YYYY-MM format ("2020-01"). Year only → YYYY-01. Current position → endDate null.
- confidence (0.0-1.0): 1.0 explicit and unambiguous; 0.7-0.9 clearly implied; 0.4-0.6 inferred from context; below 0.4 uncertain. Be conservative — when in doubt, score lower.`,
      },
      { role: 'user', content: resumeText.slice(0, MAX_RESUME_CHARS) },
    ],
    response_format: zodResponseFormat(ResumeEvidenceSchema, 'resume_evidence'),
    temperature: 0.1, // Low temperature for consistent extraction
  });

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new Error(`OpenAI refused to parse: ${message.refusal}`);
  }

  if (!message?.parsed) {
    throw new Error('Failed to parse resume: no structured output returned');
  }

  return message.parsed;
}
