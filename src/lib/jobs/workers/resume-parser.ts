import type { Job } from 'pg-boss';
import { extractTextFromPDF } from '@/lib/parsers/pdf-extractor';
import { extractTextFromDOCX } from '@/lib/parsers/docx-extractor';
import { parseResumeText } from '@/lib/parsers/evidence-parser';
import {
  getEvidenceSourceById,
  updateEvidenceSourceStatus,
  createManyEvidenceItems,
} from '@/lib/db/queries/evidence';

export const RESUME_PARSE_QUEUE = 'parse-resume';

interface ResumeParsePayload {
  sourceId: string;
  userId: string;
}

export async function resumeParserHandler(jobs: Job<ResumeParsePayload>[]) {
  const job = jobs[0];
  const { sourceId, userId } = job.data;

  // 1. Get the source record
  const source = await getEvidenceSourceById(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);

  // 2. Update status to processing
  await updateEvidenceSourceStatus(sourceId, 'processing');

  try {
    // 3. Read file from disk (MVP: local storage in uploads/ dir)
    const filePath = source.fileUrl;
    if (!filePath) throw new Error('No file URL for source');

    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);

    // 4. Extract text based on mime type
    let text: string;
    if (source.mimeType === 'application/pdf') {
      text = await extractTextFromPDF(buffer);
    } else {
      text = await extractTextFromDOCX(buffer);
    }

    // 5. Store raw text on source
    await updateEvidenceSourceStatus(sourceId, 'processing', undefined, text);

    // 6. Parse with LLM
    const evidence = await parseResumeText(text);

    // 7. Convert parsed evidence to database items
    const items = [];

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
          location: exp.location,
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
          location: edu.location,
          gpa: edu.gpa,
        },
        confidence: 0.95, // Education is typically high confidence
        isManual: false,
      });
    }

    // 8. Batch insert all items
    if (items.length > 0) {
      await createManyEvidenceItems(items);
    }

    // 9. Mark source as completed
    await updateEvidenceSourceStatus(sourceId, 'completed');

    return { success: true, itemCount: items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    await updateEvidenceSourceStatus(sourceId, 'failed', message);
    throw error; // Re-throw so pg-boss can handle retry
  }
}
