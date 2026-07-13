import type { Job } from 'pg-boss';
import { extractTextFromPDF } from '@/lib/parsers/pdf-extractor';
import { extractTextFromDOCX } from '@/lib/parsers/docx-extractor';
import { parseResumeText } from '@/lib/parsers/evidence-parser';
import {
  getEvidenceSourceById,
  updateEvidenceSourceStatus,
  replaceParsedResumeEvidence,
  type EvidenceItemInput,
} from '@/lib/db/queries/evidence';
import { generateBatchEmbeddings, buildEvidenceEmbeddingText } from '@/lib/matching/embedder';

export const RESUME_PARSE_QUEUE = 'parse-resume';

interface ResumeParsePayload {
  sourceId: string;
  userId: string;
}

/**
 * Parse an uploaded resume source into Evidence Bank items.
 *
 * Text is read from the source's rawText column (stored at upload time —
 * serverless-safe, no filesystem dependency). Falls back to reading the file
 * from disk for legacy sources that only have a fileUrl.
 *
 * Callable directly or via the pg-boss worker wrapper below.
 */
export async function processResumeSource(
  sourceId: string,
  userId: string
): Promise<{ success: boolean; itemCount: number }> {
  // 1. Get the source record
  const source = await getEvidenceSourceById(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  // 2. Update status to processing
  await updateEvidenceSourceStatus(sourceId, 'processing');

  try {
    // 3. Get resume text: prefer rawText stored at upload; fall back to
    // reading the file from local disk (legacy/local-dev sources)
    let text = source.rawText;

    if (!text) {
      const filePath = source.fileUrl;
      if (!filePath) throw new Error('No raw text or file URL for source');

      const fs = await import('fs/promises');
      const buffer = await fs.readFile(filePath);

      if (source.mimeType === 'application/pdf') {
        text = await extractTextFromPDF(buffer);
      } else {
        text = await extractTextFromDOCX(buffer);
      }

      // Store raw text on source
      await updateEvidenceSourceStatus(sourceId, 'processing', undefined, text);
    }

    // 4. Parse with LLM
    const evidence = await parseResumeText(text);

    // 5. Convert parsed evidence to database items
    const items: EvidenceItemInput[] = [];

    for (const exp of evidence.experiences) {
      items.push({
        userId,
        sourceId,
        itemType: 'experience' as const,
        title: exp.role,
        company: exp.company,
        startDate: exp.startDate,
        endDate: exp.endDate ?? undefined,
        content: exp.achievements.join('\n'),
        metadata: {
          skills: exp.skills,
          achievements: exp.achievements,
          location: exp.location ?? undefined,
        },
        confidence: exp.confidence,
        isManual: false,
      });
    }

    for (const proj of evidence.projects) {
      items.push({
        userId,
        sourceId,
        itemType: 'project' as const,
        title: proj.name,
        content: proj.description,
        metadata: {
          technologies: proj.technologies,
          achievements: proj.achievements,
          links: proj.url ? [{ type: 'project', url: proj.url }] : undefined,
        },
        confidence: proj.confidence,
        isManual: false,
      });
    }

    for (const edu of evidence.education) {
      items.push({
        userId,
        sourceId,
        itemType: 'education' as const,
        title: edu.degree,
        company: edu.institution,
        endDate: edu.graduationDate ?? undefined,
        metadata: {
          location: edu.location ?? undefined,
          gpa: edu.gpa ?? undefined,
        },
        confidence: 0.95, // Education is typically high confidence
        isManual: false,
      });
    }

    // Skills: persist the deduplicated top-level skill list as skill items.
    // Previously this list was extracted by the LLM but silently dropped, so
    // skills never reached the Evidence Bank.
    const seenSkills = new Set<string>();
    for (const skill of evidence.skills) {
      const normalized = skill.trim();
      if (!normalized || seenSkills.has(normalized.toLowerCase())) continue;
      seenSkills.add(normalized.toLowerCase());

      items.push({
        userId,
        sourceId,
        itemType: 'skill' as const,
        title: normalized,
        confidence: 0.9,
        isManual: false,
      });
    }

    // 6. Generate embeddings for all items in a single batched API call so
    // they are immediately usable by the semantic matching pipeline.
    // Best-effort: an embedding failure must not lose the parsed evidence.
    if (items.length > 0) {
      try {
        const texts = items.map((item) => buildEvidenceEmbeddingText(item));
        const embeddings = await generateBatchEmbeddings(texts);
        embeddings.forEach((embedding, i) => {
          items[i].embedding = embedding;
        });
      } catch (error) {
        console.error(
          `[ResumeParser] Embedding generation failed for source ${sourceId}, storing items without embeddings:`,
          error
        );
      }

      // Replace prior resume-derived evidence in the same transaction as the
      // insert: re-uploads never duplicate items, and a failure anywhere
      // leaves the previous evidence untouched (no delete-then-crash window).
      const { removed } = await replaceParsedResumeEvidence(userId, items);
      if (removed > 0) {
        console.log(
          `[ResumeParser] Replaced ${removed} evidence items from previous resume uploads`
        );
      }
    }

    // 7. Mark source as completed
    await updateEvidenceSourceStatus(sourceId, 'completed');

    return { success: true, itemCount: items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    await updateEvidenceSourceStatus(sourceId, 'failed', message);
    throw error;
  }
}

/**
 * pg-boss worker wrapper (used when running with a persistent worker process).
 */
export async function resumeParserHandler(jobs: Job<ResumeParsePayload>[]) {
  const job = jobs[0];
  const { sourceId, userId } = job.data;
  return processResumeSource(sourceId, userId);
}
