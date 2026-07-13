import { db } from '@/lib/db';
import { evidenceSource, evidenceItem } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================================
// Type Definitions
// ============================================================

export type EvidenceSource = InferSelectModel<typeof evidenceSource>;
export type EvidenceItem = InferSelectModel<typeof evidenceItem>;

export type EvidenceItemInput = {
  userId: string;
  sourceId?: string;
  itemType: string;
  title: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  content?: string;
  metadata?: {
    skills?: string[];
    technologies?: string[];
    achievements?: string[];
    links?: { type: string; url: string }[];
    location?: string;
    gpa?: string;
  };
  confidence?: number;
  isManual?: boolean;
  embedding?: number[];
};

// ============================================================
// Evidence Source CRUD Functions
// ============================================================

/**
 * Create a new evidence source (uploaded file or external source)
 */
export async function createEvidenceSource(data: {
  userId: string;
  sourceType: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  rawText?: string;
}): Promise<EvidenceSource> {
  const id = crypto.randomUUID();

  const [source] = await db
    .insert(evidenceSource)
    .values({
      id,
      userId: data.userId,
      sourceType: data.sourceType,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      rawText: data.rawText,
      parseStatus: 'pending',
    })
    .returning();

  return source;
}

/**
 * Update evidence source parsing status
 */
export async function updateEvidenceSourceStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
  rawText?: string
): Promise<EvidenceSource> {
  const [source] = await db
    .update(evidenceSource)
    .set({
      parseStatus: status,
      parseError: error,
      rawText: rawText,
      updatedAt: new Date(),
    })
    .where(eq(evidenceSource.id, id))
    .returning();

  return source;
}

/**
 * Atomically replace all resume-derived (non-manual) evidence items for a
 * user with a freshly parsed set. Runs delete + insert in one transaction so
 * a failure never leaves the user without evidence: either the old items
 * survive intact or the new items fully replace them. Manual items are
 * preserved; evidence mappings cascade-delete with their items.
 */
export async function replaceParsedResumeEvidence(
  userId: string,
  items: EvidenceItemInput[]
): Promise<{ removed: number; inserted: EvidenceItem[] }> {
  return db.transaction(async (tx) => {
    const resumeSourceIds = tx
      .select({ id: evidenceSource.id })
      .from(evidenceSource)
      .where(and(eq(evidenceSource.userId, userId), eq(evidenceSource.sourceType, 'resume')));

    const result = await tx
      .delete(evidenceItem)
      .where(
        and(
          eq(evidenceItem.userId, userId),
          eq(evidenceItem.isManual, false),
          inArray(evidenceItem.sourceId, resumeSourceIds)
        )
      );

    const inserted =
      items.length > 0
        ? await tx.insert(evidenceItem).values(items.map(withInsertDefaults)).returning()
        : [];

    return { removed: result.rowCount ?? 0, inserted };
  });
}

/**
 * Get all evidence sources for a user
 */
export async function getEvidenceSourcesByUser(userId: string): Promise<EvidenceSource[]> {
  return db
    .select()
    .from(evidenceSource)
    .where(eq(evidenceSource.userId, userId))
    .orderBy(desc(evidenceSource.createdAt));
}

/**
 * Get a single evidence source by ID
 */
export async function getEvidenceSourceById(id: string): Promise<EvidenceSource | undefined> {
  const [source] = await db.select().from(evidenceSource).where(eq(evidenceSource.id, id)).limit(1);

  return source;
}

// ============================================================
// Evidence Item CRUD Functions
// ============================================================

/**
 * Create a new evidence item
 */
export async function createEvidenceItem(data: {
  userId: string;
  sourceId?: string;
  itemType: string;
  title: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  content?: string;
  metadata?: {
    skills?: string[];
    technologies?: string[];
    achievements?: string[];
    links?: { type: string; url: string }[];
    location?: string;
    gpa?: string;
  };
  confidence?: number;
  isManual?: boolean;
  embedding?: number[];
}): Promise<EvidenceItem> {
  const id = crypto.randomUUID();

  const [item] = await db
    .insert(evidenceItem)
    .values({
      id,
      userId: data.userId,
      sourceId: data.sourceId,
      itemType: data.itemType,
      title: data.title,
      company: data.company,
      startDate: data.startDate,
      endDate: data.endDate,
      content: data.content,
      metadata: data.metadata,
      confidence: data.confidence ?? 1.0,
      isManual: data.isManual ?? true,
      embedding: data.embedding,
    })
    .returning();

  return item;
}

/**
 * Assign an id and batch-insert defaults to an evidence item input.
 */
function withInsertDefaults(item: EvidenceItemInput) {
  return {
    id: crypto.randomUUID(),
    userId: item.userId,
    sourceId: item.sourceId,
    itemType: item.itemType,
    title: item.title,
    company: item.company,
    startDate: item.startDate,
    endDate: item.endDate,
    content: item.content,
    metadata: item.metadata,
    confidence: item.confidence ?? 1.0,
    isManual: item.isManual ?? false,
    embedding: item.embedding,
  };
}

/**
 * Batch insert multiple evidence items (for parsed resume data)
 */
export async function createManyEvidenceItems(items: EvidenceItemInput[]): Promise<EvidenceItem[]> {
  const insertedItems = await db
    .insert(evidenceItem)
    .values(items.map(withInsertDefaults))
    .returning();

  return insertedItems;
}

/**
 * Get all evidence items for a user
 */
export async function getEvidenceItemsByUser(userId: string): Promise<EvidenceItem[]> {
  return db
    .select()
    .from(evidenceItem)
    .where(eq(evidenceItem.userId, userId))
    .orderBy(desc(evidenceItem.createdAt));
}

/**
 * Get a single evidence item by ID (with user verification for security)
 */
export async function getEvidenceItemById(
  id: string,
  userId: string
): Promise<EvidenceItem | undefined> {
  const [item] = await db
    .select()
    .from(evidenceItem)
    .where(and(eq(evidenceItem.id, id), eq(evidenceItem.userId, userId)))
    .limit(1);

  return item;
}

/**
 * Update an existing evidence item
 */
export async function updateEvidenceItem(
  id: string,
  userId: string,
  data: {
    itemType?: string;
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    content?: string;
    metadata?: {
      skills?: string[];
      technologies?: string[];
      achievements?: string[];
      links?: { type: string; url: string }[];
      location?: string;
      gpa?: string;
    };
    confidence?: number;
    isManual?: boolean;
    embedding?: number[];
  }
): Promise<EvidenceItem | undefined> {
  const [item] = await db
    .update(evidenceItem)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(evidenceItem.id, id), eq(evidenceItem.userId, userId)))
    .returning();

  return item;
}

/**
 * Delete an evidence item
 */
export async function deleteEvidenceItem(
  id: string,
  userId: string
): Promise<EvidenceItem | undefined> {
  const [item] = await db
    .delete(evidenceItem)
    .where(and(eq(evidenceItem.id, id), eq(evidenceItem.userId, userId)))
    .returning();

  return item;
}
