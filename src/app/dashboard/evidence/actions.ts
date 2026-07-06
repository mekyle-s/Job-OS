'use server';

import { requireUser } from '@/lib/auth/session';
import {
  createEvidenceItem,
  updateEvidenceItem,
  deleteEvidenceItem,
} from '@/lib/db/queries/evidence';
import { EvidenceItemCreateSchema, EvidenceItemUpdateSchema } from '@/lib/schemas/evidence';
import { generateEvidenceEmbedding } from '@/lib/matching/embedder';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Best-effort embedding generation for manual evidence.
 * Items without embeddings are skipped by semantic matching, so we embed at
 * save time — but an embedding failure must never block the save itself.
 */
async function tryGenerateEmbedding(item: {
  title: string;
  content?: string | null;
  company?: string | null;
  metadata?: { skills?: string[]; technologies?: string[]; achievements?: string[] } | null;
}): Promise<number[] | undefined> {
  try {
    return await generateEvidenceEmbedding(item);
  } catch (error) {
    console.error('[Evidence] Embedding generation failed, saving without embedding:', error);
    return undefined;
  }
}

/**
 * Server Action: Create a new evidence item
 */
export async function createEvidenceAction(formData: FormData) {
  const user = await requireUser();

  // Extract form data
  const rawData = {
    itemType: formData.get('itemType') as string,
    title: formData.get('title') as string,
    company: formData.get('company') as string | undefined,
    startDate: formData.get('startDate') as string | undefined,
    endDate: formData.get('endDate') as string | undefined,
    content: formData.get('content') as string | undefined,
    skills: formData.get('skills') as string | undefined,
  };

  // Parse skills/technologies into array
  const metadata = rawData.skills
    ? {
        skills: rawData.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    : undefined;

  // Validate with Zod schema
  const result = EvidenceItemCreateSchema.safeParse({
    itemType: rawData.itemType,
    title: rawData.title,
    company: rawData.company || undefined,
    startDate: rawData.startDate || undefined,
    endDate: rawData.endDate || undefined,
    content: rawData.content || undefined,
    metadata,
    confidence: 1.0,
    isManual: true,
  });

  if (!result.success) {
    return { error: result.error.issues.map((e) => e.message).join(', ') };
  }

  // Create evidence item (embed so it participates in semantic matching)
  const embedding = await tryGenerateEmbedding(result.data);
  await createEvidenceItem({
    userId: user.id,
    ...result.data,
    embedding,
  });

  revalidatePath('/dashboard/evidence');
  redirect('/dashboard/evidence');
}

/**
 * Server Action: Update an existing evidence item
 */
export async function updateEvidenceAction(formData: FormData) {
  const user = await requireUser();

  const id = formData.get('id') as string;

  // Extract form data
  const rawData = {
    itemType: formData.get('itemType') as string,
    title: formData.get('title') as string,
    company: formData.get('company') as string | undefined,
    startDate: formData.get('startDate') as string | undefined,
    endDate: formData.get('endDate') as string | undefined,
    content: formData.get('content') as string | undefined,
    skills: formData.get('skills') as string | undefined,
  };

  // Parse skills/technologies into array
  const metadata = rawData.skills
    ? {
        skills: rawData.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    : undefined;

  // Validate with Zod schema
  const result = EvidenceItemUpdateSchema.safeParse({
    itemType: rawData.itemType || undefined,
    title: rawData.title || undefined,
    company: rawData.company || undefined,
    startDate: rawData.startDate || undefined,
    endDate: rawData.endDate || undefined,
    content: rawData.content || undefined,
    metadata,
  });

  if (!result.success) {
    return { error: result.error.issues.map((e) => e.message).join(', ') };
  }

  // Update evidence item (re-embed when the searchable text changed)
  const embedding =
    result.data.title || result.data.content || result.data.metadata
      ? await tryGenerateEmbedding({
          title: result.data.title ?? rawData.title,
          content: result.data.content,
          company: result.data.company,
          metadata: result.data.metadata,
        })
      : undefined;
  await updateEvidenceItem(id, user.id, { ...result.data, embedding });

  revalidatePath('/dashboard/evidence');
  redirect('/dashboard/evidence');
}

/**
 * Server Action: Delete an evidence item
 */
export async function deleteEvidenceAction(formData: FormData) {
  const user = await requireUser();

  const id = formData.get('id') as string;

  // Delete evidence item
  await deleteEvidenceItem(id, user.id);

  revalidatePath('/dashboard/evidence');
}
