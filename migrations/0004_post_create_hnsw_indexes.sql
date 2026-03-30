-- Create HNSW indexes for vector similarity search
-- Per CONTEXT.md locked decision #1: m=16, ef_construction=64 for 1536-dim vectors

CREATE INDEX IF NOT EXISTS evidence_item_embedding_hnsw_idx
ON evidence_item USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS requirement_embedding_hnsw_idx
ON requirement USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
