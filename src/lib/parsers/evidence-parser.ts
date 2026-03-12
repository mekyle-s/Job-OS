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

export async function parseResumeText(resumeText: string): Promise<ResumeEvidence> {
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content: `You are a resume parser. Extract structured evidence from the resume text below.

For each item, assess your confidence (0.0 to 1.0) in the extraction accuracy:
- 1.0: Explicitly stated, unambiguous (e.g., "Software Engineer at Google, 2020-2023")
- 0.7-0.9: Clearly implied but not fully explicit
- 0.4-0.6: Inferred from context
- 0.0-0.3: Very uncertain or guessing

Be conservative with confidence scores. When in doubt, use lower confidence.

For dates, use YYYY-MM format (e.g., "2020-01"). If only year is given, use YYYY-01.
If a position is current, set endDate to null.

Extract ALL experiences, projects, and education entries. For skills, extract a deduplicated list of all technical and professional skills mentioned.`,
      },
      { role: 'user', content: resumeText },
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
