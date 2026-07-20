// Version constants for matching pipeline audit trail
// These are tracked in evidence_mapping table for reproducibility

export const EMBEDDING_MODEL_VERSION = 'text-embedding-3-small-1536';
export const MATCHING_PROMPT_VERSION = 'v2-concise-bands';
// gpt-4o-mini: pairwise evidence validation is the highest-volume LLM call in
// the system (capped by MAX_EVALUATIONS_PER_RUN in pipeline.ts, default 25
// per matching run) — mini cuts cost ~15-30x
export const LLM_MODEL_VERSION = 'gpt-4o-mini';
export const RANKING_VERSION = 'v1-fit70-fresh30';
