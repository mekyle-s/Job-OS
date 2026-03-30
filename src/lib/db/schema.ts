import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core/columns/vector_extension/vector';

// Better Auth expects singular names: user, session, account, verification
export const user = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const session = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)]
);

export const account = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)]
);

export const verification = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)]
);

// Evidence source table - tracks uploaded files and source metadata
export const evidenceSource = pgTable(
  'evidence_source',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(), // 'resume' | 'github' | 'portfolio' | 'manual'
    fileName: text('file_name'),
    fileUrl: text('file_url'),
    fileSize: integer('file_size'),
    mimeType: text('mime_type'),
    parseStatus: text('parse_status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
    parseError: text('parse_error'),
    rawText: text('raw_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_source_user_id_idx').on(table.userId),
    index('evidence_source_parse_status_idx').on(table.parseStatus),
  ]
);

// Evidence item table - individual evidence entries parsed from sources or manually created
export const evidenceItem = pgTable(
  'evidence_item',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sourceId: text('source_id').references(() => evidenceSource.id, { onDelete: 'set null' }),

    itemType: text('item_type').notNull(), // 'experience' | 'project' | 'skill' | 'education'
    title: text('title').notNull(),
    company: text('company'),
    startDate: text('start_date'), // YYYY-MM format
    endDate: text('end_date'), // YYYY-MM format, null if current

    content: text('content'),
    metadata: jsonb('metadata').$type<{
      skills?: string[];
      technologies?: string[];
      achievements?: string[];
      links?: { type: string; url: string }[];
      location?: string;
      gpa?: string;
    }>(),

    confidence: real('confidence').default(1.0), // 0.0-1.0
    isManual: boolean('is_manual').default(false).notNull(),

    // Vector embedding for semantic search (text-embedding-3-small at 1536 dimensions)
    embedding: vector('embedding', { dimensions: 1536 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_item_user_id_idx').on(table.userId),
    index('evidence_item_source_id_idx').on(table.sourceId),
    index('evidence_item_item_type_idx').on(table.itemType),
  ]
);

// ============================================================
// Job Data Pipeline Tables
// ============================================================

// User criteria table - stores user preferences for job search
export const userCriteria = pgTable(
  'user_criteria',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    jobFunction: text('job_function'),
    locations: jsonb('locations').$type<string[]>(),
    visaRequired: boolean('visa_required'),
    targetCompanies: jsonb('target_companies').$type<string[]>().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastPolledAt: timestamp('last_polled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('user_criteria_user_id_idx').on(table.userId),
    index('user_criteria_is_active_idx').on(table.isActive),
  ]
);

// Raw job source table - preserves original API responses
export const rawJobSource = pgTable(
  'raw_job_source',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    sourceJobId: text('source_job_id').notNull(),
    rawData: jsonb('raw_data').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('raw_job_source_lookup_idx').on(table.source, table.sourceJobId),
  ]
);

// Job table - canonical normalized model
export const job = pgTable(
  'job',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    sourceJobId: text('source_job_id').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull(),
    description: text('description').notNull(),
    url: text('url').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }).notNull(),
    metadata: jsonb('metadata').$type<{
      departmentName?: string;
      officeLocation?: string;
      employmentType?: string;
      remote?: boolean;
      visaSponsorship?: boolean;
      [key: string]: unknown;
    }>(),
    parseStatus: text('parse_status').notNull().default('pending'),
    parseCompletedAt: timestamp('parse_completed_at', { withTimezone: true }),
    parseError: text('parse_error'),
    isActive: boolean('is_active').default(true).notNull(),

    // Eligibility filter columns for pre-semantic filtering (per CONTEXT.md locked decision #2)
    visaSponsorship: text('visa_sponsorship'), // 'yes' | 'no' | 'unknown'
    remotePolicy: text('remote_policy'), // 'remote' | 'hybrid' | 'onsite' | 'unknown'
    roleType: text('role_type'), // 'internship' | 'full_time' | 'part_time' | 'contract' | 'unknown'
    season: text('season'), // 'summer' | 'fall' | 'winter' | 'spring' | 'year_round' | 'unknown'
    graduationWindow: text('graduation_window'), // free text like "2025-2027"

    // Stale detection for matching pipeline (per CONTEXT.md locked decision #7)
    lastMatchedAt: timestamp('last_matched_at', { withTimezone: true }),

    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('job_source_lookup_idx').on(table.source, table.sourceJobId),
    index('job_company_idx').on(table.company),
    index('job_source_updated_at_idx').on(table.sourceUpdatedAt),
    index('job_parse_status_idx').on(table.parseStatus),
    index('job_is_active_idx').on(table.isActive),
  ]
);

// Requirement table - extracted requirements from job postings
export const requirement = pgTable(
  'requirement',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    priority: text('priority').notNull(),
    normalizedText: text('normalized_text').notNull(),
    sourceText: text('source_text').notNull(),
    sourceSpan: text('source_span'),
    reviewStatus: text('review_status').notNull().default('parsed'),
    isManuallyEdited: boolean('is_manually_edited').default(false).notNull(),

    // Vector embedding for semantic search (text-embedding-3-small at 1536 dimensions)
    embedding: vector('embedding', { dimensions: 1536 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('requirement_job_id_idx').on(table.jobId),
    index('requirement_category_idx').on(table.category),
    index('requirement_review_status_idx').on(table.reviewStatus),
  ]
);

// Requirement audit table - tracks changes to requirements
export const requirementAudit = pgTable(
  'requirement_audit',
  {
    id: text('id').primaryKey(),
    requirementId: text('requirement_id')
      .notNull()
      .references(() => requirement.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    beforeValue: jsonb('before_value'),
    afterValue: jsonb('after_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('requirement_audit_requirement_id_idx').on(table.requirementId),
    index('requirement_audit_user_id_idx').on(table.userId),
  ]
);

// ============================================================
// Matching Pipeline Tables
// ============================================================

// Evidence mapping table - tracks validated requirement→evidence matches
// Per CONTEXT.md locked decisions #3, #6, #8
export const evidenceMapping = pgTable(
  'evidence_mapping',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requirementId: text('requirement_id')
      .notNull()
      .references(() => requirement.id, { onDelete: 'cascade' }),
    evidenceItemId: text('evidence_item_id')
      .notNull()
      .references(() => evidenceItem.id, { onDelete: 'cascade' }),

    // LLM validation result (per CONTEXT.md locked decision #3)
    decision: text('decision').notNull(), // 'match' | 'weak_match' | 'no_match'
    confidenceBand: text('confidence_band').notNull(), // 'high' | 'medium' | 'low'
    reason: text('reason').notNull(),
    needsReview: boolean('needs_review').default(false).notNull(),

    // Provenance fields (per CONTEXT.md locked decision #8)
    sourceRequirementText: text('source_requirement_text').notNull(),
    sourceEvidenceExcerpt: text('source_evidence_excerpt').notNull(),

    // Version tracking (per CONTEXT.md locked decision #6)
    embeddingModelVersion: text('embedding_model_version').notNull(),
    matchingPromptVersion: text('matching_prompt_version').notNull(),
    llmModelVersion: text('llm_model_version').notNull(),

    // Manual override tracking
    createdBySystem: boolean('created_by_system').default(true).notNull(),
    manualOverrideReason: text('manual_override_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_mapping_user_id_idx').on(table.userId),
    index('evidence_mapping_requirement_id_idx').on(table.requirementId),
    index('evidence_mapping_evidence_item_id_idx').on(table.evidenceItemId),
    index('evidence_mapping_needs_review_idx').on(table.needsReview),
  ]
);

// Evidence mapping audit table - tracks changes to evidence mappings
// Per CONTEXT.md locked decision #8
export const evidenceMappingAudit = pgTable(
  'evidence_mapping_audit',
  {
    id: text('id').primaryKey(),
    mappingId: text('mapping_id')
      .notNull()
      .references(() => evidenceMapping.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'accept' | 'reject'
    beforeValue: jsonb('before_value'),
    afterValue: jsonb('after_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_mapping_audit_mapping_id_idx').on(table.mappingId),
    index('evidence_mapping_audit_user_id_idx').on(table.userId),
  ]
);
