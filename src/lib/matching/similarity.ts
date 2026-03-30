import { db } from '@/lib/db';
import { evidenceItem } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { cosineDistance } from 'drizzle-orm';

export interface SimilarEvidenceResult {
  id: string;
  userId: string;
  itemType: string;
  title: string;
  company: string | null;
  content: string | null;
  metadata: {
    skills?: string[];
    technologies?: string[];
    achievements?: string[];
    links?: { type: string; url: string }[];
    location?: string;
    gpa?: string;
  } | null;
  similarity: number;
}

/**
 * Find similar evidence items using cosine similarity search via pgvector HNSW index.
 * Uses drizzle-orm cosineDistance helper for efficient vector search.
 *
 * @param requirementEmbedding - The 1536-dim embedding vector for the requirement
 * @param userId - User ID to scope search to user's evidence only
 * @param topK - Number of top results to return (default 10)
 * @param minSimilarity - Minimum similarity threshold, 0.0-1.0 (default 0.3, low threshold since LLM refines)
 * @returns Array of similar evidence items sorted by similarity descending
 */
export async function findSimilarEvidence(
  requirementEmbedding: number[],
  userId: string,
  topK: number = 10,
  minSimilarity: number = 0.3
): Promise<SimilarEvidenceResult[]> {
  if (requirementEmbedding.length !== 1536) {
    throw new Error(`Expected 1536-dim embedding, got ${requirementEmbedding.length}`);
  }

  // Convert embedding to pgvector format
  const embeddingString = `[${requirementEmbedding.join(',').replace(/\s/g, '')}]`;

  // Query using cosineDistance for vector search
  // Similarity = 1 - cosineDistance (higher is more similar)
  const results = await db
    .select({
      id: evidenceItem.id,
      userId: evidenceItem.userId,
      itemType: evidenceItem.itemType,
      title: evidenceItem.title,
      company: evidenceItem.company,
      content: evidenceItem.content,
      metadata: evidenceItem.metadata,
      distance: sql<number>`${cosineDistance(evidenceItem.embedding, embeddingString)}`,
    })
    .from(evidenceItem)
    .where(
      and(
        eq(evidenceItem.userId, userId),
        isNotNull(evidenceItem.embedding) // Only search items with embeddings
      )
    )
    .orderBy(sql`${cosineDistance(evidenceItem.embedding, embeddingString)}`)
    .limit(topK);

  // Convert distance to similarity and filter by threshold
  const similarItems = results
    .map((item) => ({
      id: item.id,
      userId: item.userId,
      itemType: item.itemType,
      title: item.title,
      company: item.company,
      content: item.content,
      metadata: item.metadata,
      similarity: 1 - item.distance, // cosine similarity = 1 - cosine distance
    }))
    .filter((item) => item.similarity >= minSimilarity);

  return similarItems;
}
