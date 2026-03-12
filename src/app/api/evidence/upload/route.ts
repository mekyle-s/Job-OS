import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createEvidenceSource } from '@/lib/db/queries/evidence';
import { getJobQueue, startJobQueue } from '@/lib/jobs';
import { resumeParserHandler, RESUME_PARSE_QUEUE } from '@/lib/jobs/workers/resume-parser';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

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
      return Response.json(
        { error: 'File too large. Maximum size is 4MB.' },
        { status: 400 }
      );
    }

    // 5. Save file to local uploads/ directory
    const uploadDir = join(process.cwd(), 'uploads', userId);
    await mkdir(uploadDir, { recursive: true });

    const fileExtension = file.name.split('.').pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 6. Create evidenceSource record
    const source = await createEvidenceSource({
      userId,
      sourceType: 'resume',
      fileName: file.name,
      fileUrl: filePath,
      fileSize: file.size,
      mimeType: file.type,
    });

    // 7. Start pg-boss queue, register worker, and send job
    const boss = await startJobQueue();

    // Register worker (idempotent - safe to call multiple times)
    await boss.work(RESUME_PARSE_QUEUE, resumeParserHandler);

    // Queue the parse job
    await boss.send(RESUME_PARSE_QUEUE, {
      sourceId: source.id,
      userId,
    });

    // 8. Return success response
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
