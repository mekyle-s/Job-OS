import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createEvidenceSource, deleteParsedResumeEvidence } from '@/lib/db/queries/evidence';
import { processResumeSource } from '@/lib/jobs/workers/resume-parser';
import { extractTextFromPDF } from '@/lib/parsers/pdf-extractor';
import { extractTextFromDOCX } from '@/lib/parsers/docx-extractor';

// Parsing continues in after() past the response; allow time for LLM + embeddings
export const maxDuration = 300;

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // 2. Read FormData and get file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Only PDF and DOCX files are supported.' },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: 'File too large. Maximum size is 4MB.' }, { status: 400 });
    }

    // 5. Extract text in-request and store it on the source record.
    // No filesystem writes — serverless filesystems are ephemeral/read-only,
    // and the parser only ever needs the text.
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText =
      file.type === 'application/pdf'
        ? await extractTextFromPDF(buffer)
        : await extractTextFromDOCX(buffer);

    if (!rawText || rawText.trim().length === 0) {
      return Response.json({ error: 'Could not extract any text from the file.' }, { status: 400 });
    }

    // 6. Re-uploads replace prior resume-derived evidence (manual items kept)
    const removed = await deleteParsedResumeEvidence(userId);
    if (removed > 0) {
      console.log(`[Upload] Replaced ${removed} evidence items from previous resume uploads`);
    }

    // 7. Create evidenceSource record with the extracted text
    const source = await createEvidenceSource({
      userId,
      sourceType: 'resume',
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      rawText,
    });

    // 8. Parse after the response is sent (LLM extraction + embeddings).
    // after() keeps the serverless function alive past the response, so this
    // works on Vercel where background queue workers would be frozen.
    after(async () => {
      try {
        await processResumeSource(source.id, userId);
      } catch (error) {
        // processResumeSource already marked the source 'failed'
        console.error(`[Upload] Resume parsing failed for source ${source.id}:`, error);
      }
    });

    // 9. Return success response (client polls /api/evidence/status/[sourceId])
    return Response.json({
      sourceId: source.id,
      status: 'queued',
    });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    return Response.json({ error: message }, { status: 500 });
  }
}
