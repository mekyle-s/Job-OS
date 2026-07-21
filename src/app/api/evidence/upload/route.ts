import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createEvidenceSource } from '@/lib/db/queries/evidence';
import { processResumeSource } from '@/lib/jobs/workers/resume-parser';
import { extractTextFromPDF } from '@/lib/parsers/pdf-extractor';
import { extractTextFromDOCX } from '@/lib/parsers/docx-extractor';
import { autoMatchTopJobs } from '@/lib/matching/auto-match';

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
    // and the parser only ever needs the text. Extraction failures are the
    // user's file being unreadable — report them as 400s with the extractor's
    // message rather than falling through to the generic 500 handler.
    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText: string;
    try {
      rawText =
        file.type === 'application/pdf'
          ? await extractTextFromPDF(buffer)
          : await extractTextFromDOCX(buffer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not extract any text from the file.';
      return Response.json({ error: message }, { status: 400 });
    }

    if (!rawText || rawText.trim().length === 0) {
      return Response.json({ error: 'Could not extract any text from the file.' }, { status: 400 });
    }

    // 6. Create evidenceSource record with the extracted text.
    // Prior resume-derived evidence is replaced transactionally by the parser
    // when the new items are inserted — never deleted up front, so a failed
    // parse can't wipe the user's existing evidence.
    const source = await createEvidenceSource({
      userId,
      sourceType: 'resume',
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      rawText,
    });

    // 7. Parse after the response is sent (LLM extraction + embeddings),
    // then auto-match the top queue roles against the fresh evidence so the
    // user sees fit coverage shortly after uploading — not 0/x everywhere.
    // after() keeps the serverless function alive past the response, so this
    // works on Vercel where background queue workers would be frozen.
    after(async () => {
      try {
        await processResumeSource(source.id, userId);
        await autoMatchTopJobs(userId);
      } catch (error) {
        // processResumeSource already marked the source 'failed'
        console.error(`[Upload] Resume parsing failed for source ${source.id}:`, error);
      }
    });

    // 8. Return success response (client polls /api/evidence/status/[sourceId])
    return Response.json({
      sourceId: source.id,
      status: 'queued',
    });
  } catch (error) {
    // Log the detail server-side; don't echo internal errors to the client
    console.error('Upload error:', error);
    return Response.json({ error: 'Failed to upload file. Please try again.' }, { status: 500 });
  }
}
