import OpenAI from 'openai';
import { EMBEDDING_MODEL_VERSION } from './versions';

// Lazy-init OpenAI client per DEV-014 to avoid build failures when API key missing
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI(); // Uses OPENAI_API_KEY env var automatically
  }
  return client;
}

/**
 * Generate embedding for a single text using text-embedding-3-small.
 * Returns 1536-dimensional vector (native output, no dimension reduction).
 * Per CONTEXT.md locked decision #1.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    const openai = getOpenAIClient();

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      // Do NOT specify dimensions parameter - native 1536 output per CONTEXT.md
    });

    const embedding = response.data[0].embedding;

    if (embedding.length !== 1536) {
      console.warn(
        `Expected 1536 dimensions but got ${embedding.length}. Model: ${EMBEDDING_MODEL_VERSION}`
      );
    }

    return embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch.
 * OpenAI supports up to 2048 texts per batch.
 * Chunks inputs if needed to stay within limits.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const MAX_BATCH_SIZE = 2048;
  const chunks: string[][] = [];

  // Chunk texts into batches
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    chunks.push(texts.slice(i, i + MAX_BATCH_SIZE));
  }

  try {
    const openai = getOpenAIClient();
    const allEmbeddings: number[][] = [];

    for (const chunk of chunks) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });

      // Extract embeddings in order
      const chunkEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      allEmbeddings.push(...chunkEmbeddings);
    }

    return allEmbeddings;
  } catch (error) {
    console.error('Failed to generate batch embeddings:', error);
    throw new Error(
      `Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build the searchable text for an evidence item.
 * Combines title, content, and metadata (skills, technologies, achievements).
 * Shared by single and batch embedding generation.
 */
export function buildEvidenceEmbeddingText(item: {
  title: string;
  content?: string | null;
  company?: string | null;
  metadata?: {
    skills?: string[];
    technologies?: string[];
    achievements?: string[];
    [key: string]: unknown;
  } | null;
}): string {
  const parts: string[] = [item.title];

  if (item.company) {
    parts.push(`at ${item.company}`);
  }

  if (item.content) {
    parts.push(item.content);
  }

  if (item.metadata) {
    if (item.metadata.skills && item.metadata.skills.length > 0) {
      parts.push(`Skills: ${item.metadata.skills.join(', ')}`);
    }
    if (item.metadata.technologies && item.metadata.technologies.length > 0) {
      parts.push(`Technologies: ${item.metadata.technologies.join(', ')}`);
    }
    if (item.metadata.achievements && item.metadata.achievements.length > 0) {
      parts.push(`Achievements: ${item.metadata.achievements.join('. ')}`);
    }
  }

  return parts.join(' | ');
}

/**
 * Generate embedding from an evidence item by constructing text from multiple fields.
 */
export async function generateEvidenceEmbedding(item: {
  title: string;
  content?: string | null;
  company?: string | null;
  metadata?: {
    skills?: string[];
    technologies?: string[];
    achievements?: string[];
    [key: string]: unknown;
  } | null;
}): Promise<number[]> {
  return generateEmbedding(buildEvidenceEmbeddingText(item));
}

/**
 * Generate embedding from a requirement's normalized text.
 * Simple wrapper for consistency with evidence embedding generation.
 */
export async function generateRequirementEmbedding(normalizedText: string): Promise<number[]> {
  return generateEmbedding(normalizedText);
}
