import {
  pgTable,
  text,
  timestamp,
  boolean,
  real,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';

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

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('evidence_item_user_id_idx').on(table.userId),
    index('evidence_item_source_id_idx').on(table.sourceId),
    index('evidence_item_item_type_idx').on(table.itemType),
  ]
);
