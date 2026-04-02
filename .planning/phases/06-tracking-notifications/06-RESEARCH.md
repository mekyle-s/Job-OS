# Phase 6: Tracking & Notifications - Research

**Researched:** 2026-04-02
**Domain:** Application status tracking, email notifications, audit trails, data export
**Confidence:** HIGH

## Summary

Phase 6 closes the loop on the proof-first internship workflow by enabling users to track application status (Ignore/Save/Apply/Applied), export proof summaries for applications, receive email alerts for high-fit roles, and maintain an audit trail of parser confidence and user corrections. This phase integrates existing infrastructure (pg-boss for background jobs, Resend for email, Drizzle ORM for database) with new components for status management, export generation, and notification scheduling.

The research focused on five key areas: (1) role status tracking using text columns with Zod validation (per DEV-021 pattern), (2) email notifications via Resend with React Email templates, (3) background job scheduling using pg-boss for async processing, (4) export functionality using Playwright for PDF generation (already in stack), and (5) audit trail patterns leveraging PostgreSQL triggers and application-level logging.

**Primary recommendation:** Use pg-boss scheduled jobs to check for new high-fit roles hourly, batch notifications into digests to reduce email fatigue, store role status as text column with Zod validation (not enums), generate PDF exports server-side using Playwright (already in dependencies), and extend existing audit tables to track parser confidence and user corrections.

## Standard Stack

### Core

| Library     | Version | Purpose                                 | Why Standard                                                                                                                                                  |
| ----------- | ------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pg-boss     | 12.14.x | Background job queue for async tasks    | Already in project. Battle-tested Postgres-based queue with 10K+ stars. Handles scheduling, retries, concurrency. Simpler than BullMQ (no Redis dependency).  |
| Resend      | 6.9.x   | Email delivery service                  | Already configured with `onboarding@resend.dev`. Best DX for transactional email. Native React Email integration. Generous free tier (100 emails/day).        |
| React Email | 5.x     | Email template components               | Resend's official template framework. React components compile to HTML emails. Dark mode support. Tailwind compatible.                                        |
| Playwright  | Latest  | PDF generation from HTML                | Already in dependencies (Phase 4 job scraping). Best HTML-to-PDF renderer in 2026. 3ms warm, 42ms cold (vs Puppeteer 48ms/147ms). Supports multiple browsers. |
| Drizzle ORM | 0.45.x  | Database access with text columns + Zod | Already in use. Text columns with runtime Zod validation per DEV-021 (no pgEnum). Type-safe queries.                                                          |
| Zod         | 4.3.x   | Runtime schema validation               | Already in use. Required for validating status text values. 14x faster than v3.                                                                               |

### Supporting

| Library        | Version | Purpose                                         | When to Use                                                                                           |
| -------------- | ------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TanStack Query | 5.95.x  | Client state management with optimistic updates | Already in use. Handles status mutations with cache invalidation. Optimistic UI for instant feedback. |
| date-fns       | 4.1.x   | Date formatting for timestamps                  | Already in use. Format timestamps in email templates and export documents.                            |
| nuqs           | Latest  | Type-safe URL search params                     | Recommended for queue filtering UI. Syncs filter state with URL. Better DX than useSearchParams.      |

### Alternatives Considered

| Instead of         | Could Use               | Tradeoff                                                                                                       |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| pg-boss            | BullMQ + Redis          | BullMQ requires separate Redis instance. More setup, higher cost. Use if need >10K jobs/sec throughput.        |
| Playwright PDF     | Puppeteer               | Puppeteer 4x slower cold start (147ms vs 42ms). Use only if already using Puppeteer elsewhere.                 |
| Playwright PDF     | jsPDF                   | jsPDF can't render complex HTML/CSS. Good for simple programmatic PDFs only. Not suitable for role brief HTML. |
| Text columns + Zod | pgEnum                  | DEV-021 explicitly rejects pgEnum. Text + Zod allows runtime validation without migrations for enum changes.   |
| React Email        | Raw HTML strings        | Raw HTML hard to maintain, no type safety, no component reuse. React Email is industry standard.               |
| Resend             | SendGrid/Postmark       | SendGrid/Postmark require more config, less React Email integration. Use if need SMS or advanced analytics.    |
| Hourly cron        | Real-time notifications | Real-time adds complexity (WebSockets/polling). Hourly batch is sufficient for V1 job alerts.                  |

**Installation:**

```bash
# Already installed (verify in package.json):
npm install pg-boss@^12.14.0 resend@^6.9.3

# New dependencies to add:
npm install @react-email/components react-email
npm install nuqs  # Optional but recommended for URL filter state
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── email/
│   │   ├── index.ts              # Resend client (already exists)
│   │   ├── templates/
│   │   │   ├── high-fit-alert.tsx       # React Email template
│   │   │   └── digest-email.tsx         # Batch digest template
│   │   └── send-alert.ts         # Send notification helper
│   ├── export/
│   │   ├── role-brief-pdf.ts     # Generate proof summary PDF
│   │   └── templates/
│   │       └── proof-summary.html       # HTML template for PDF
│   ├── jobs/
│   │   ├── workers/
│   │   │   ├── notification-dispatcher.ts  # Check for new high-fit roles
│   │   │   └── pdf-generator.ts            # Async PDF generation worker
│   │   └── index.ts              # Already has registerJobWorkers
│   └── db/
│       ├── queries/
│       │   ├── role-status.ts    # CRUD for role status tracking
│       │   └── audit.ts          # Audit trail helpers
│       └── schema.ts             # Extend with roleStatus table
├── app/
│   ├── api/
│   │   ├── roles/
│   │   │   └── [jobId]/
│   │   │       ├── status/route.ts       # PATCH role status
│   │   │       └── export/route.ts       # POST generate PDF export
│   │   └── cron/
│   │       └── check-notifications/route.ts  # Vercel Cron endpoint
│   └── dashboard/
│       └── queue/
│           ├── page.tsx          # Queue with status filters
│           └── filters.tsx       # Status filter UI
└── vercel.json                   # Add notification cron schedule
```

### Pattern 1: Role Status Tracking with Text + Zod Validation

**What:** Store role status as text column, validate at runtime with Zod schema
**When to use:** All status/state fields in project (per DEV-021 decision)
**Example:**

```typescript
// Source: Project DEV-021 pattern + Zod v4 docs
// Schema definition (src/lib/db/schema.ts)
export const roleStatus = pgTable(
  'role_status',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // Validated by Zod, not pgEnum
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('role_status_user_id_idx').on(table.userId),
    index('role_status_job_id_idx').on(table.jobId),
    index('role_status_status_idx').on(table.status),
    uniqueIndex('role_status_user_job_idx').on(table.userId, table.jobId),
  ]
);

// Zod validation schema (src/lib/schemas/role-status.ts)
import { z } from 'zod';

export const RoleStatusEnum = z.enum(['ignore', 'save', 'apply', 'applied']);
export type RoleStatus = z.infer<typeof RoleStatusEnum>;

export const UpdateRoleStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: RoleStatusEnum,
  notes: z.string().max(500).optional(),
});

// API route with validation (src/app/api/roles/[jobId]/status/route.ts)
export async function PATCH(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await verifySession(); // DEV-024 pattern
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const validated = UpdateRoleStatusSchema.parse(body); // Runtime validation

  // Upsert role status
  await db
    .insert(roleStatus)
    .values({
      id: crypto.randomUUID(),
      userId: session.userId,
      jobId: validated.jobId,
      status: validated.status,
      notes: validated.notes,
      statusChangedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [roleStatus.userId, roleStatus.jobId],
      set: {
        status: validated.status,
        notes: validated.notes,
        statusChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  return Response.json({ success: true });
}
```

### Pattern 2: Email Notifications with React Email + Resend

**What:** Send transactional emails using React components compiled to HTML
**When to use:** All email notifications (alerts, digests, confirmations)
**Example:**

```typescript
// Source: Context7 /resend/react-email + /websites/resend
// Email template component (src/lib/email/templates/high-fit-alert.tsx)
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
} from '@react-email/components';

interface HighFitAlertEmailProps {
  userName: string;
  roles: Array<{
    title: string;
    company: string;
    fitBand: string;
    url: string;
  }>;
}

export function HighFitAlertEmail({ userName, roles }: HighFitAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f4f4f4', fontFamily: 'sans-serif' }}>
        <Container style={{ margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}>
          <Heading>New High-Fit Roles for {userName}</Heading>
          <Text>We found {roles.length} new role(s) that match your profile:</Text>
          {roles.map((role, i) => (
            <Section key={i} style={{ marginBottom: '16px' }}>
              <Text style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {role.title} at {role.company}
              </Text>
              <Text style={{ color: '#666', marginBottom: '8px' }}>
                Fit: {role.fitBand}
              </Text>
              <Button
                href={role.url}
                style={{ backgroundColor: '#000', color: '#fff', padding: '12px 20px' }}
              >
                View Role Brief
              </Button>
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  );
}

// Send email helper (src/lib/email/send-alert.ts)
import { Resend } from 'resend';
import { HighFitAlertEmail } from './templates/high-fit-alert';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendHighFitAlert(
  userEmail: string,
  userName: string,
  roles: Array<{ title: string; company: string; fitBand: string; url: string }>
) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping email send.');
    return;
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Internship OS <onboarding@resend.dev>',
    to: userEmail,
    subject: `${roles.length} New High-Fit Role${roles.length > 1 ? 's' : ''} Available`,
    react: <HighFitAlertEmail userName={userName} roles={roles} />,
  });

  if (error) {
    console.error('Failed to send high-fit alert:', error);
    throw error;
  }

  return data;
}
```

### Pattern 3: Background Job Scheduling with pg-boss

**What:** Schedule recurring jobs to check for new high-fit roles and send notifications
**When to use:** Async operations, scheduled tasks, email sending, PDF generation
**Example:**

```typescript
// Source: Context7 /timgit/pg-boss
// Register notification worker (src/lib/jobs/workers/notification-dispatcher.ts)
import { Job } from 'pg-boss';
import { db } from '@/lib/db';
import { sendHighFitAlert } from '@/lib/email/send-alert';

export async function notificationDispatcherHandler(job: Job) {
  console.log('[notification-dispatcher] Checking for new high-fit roles...');

  // Query for users with active criteria and new high-fit roles since last check
  const usersWithNewRoles = await db.query.user.findMany({
    with: {
      criteria: { where: (criteria, { eq }) => eq(criteria.isActive, true) },
    },
  });

  for (const user of usersWithNewRoles) {
    // Find new high-fit roles added since last notification
    const newHighFitRoles = await db.query.job.findMany({
      where: (job, { and, eq, gte, sql }) => and(
        eq(job.isActive, true),
        gte(job.firstSeenAt, user.lastNotifiedAt ?? new Date(0)),
        // Join with evidence_mapping to check fit score
        sql`EXISTS (
          SELECT 1 FROM evidence_mapping em
          WHERE em.job_id = ${job.id}
          GROUP BY em.job_id
          HAVING COUNT(CASE WHEN em.decision = 'match' THEN 1 END)::float / COUNT(*) >= 0.8
        )`
      ),
      limit: 10, // Max 10 roles per email to avoid overwhelm
    });

    if (newHighFitRoles.length > 0) {
      await sendHighFitAlert(
        user.email,
        user.name || 'there',
        newHighFitRoles.map(role => ({
          title: role.title,
          company: role.company,
          fitBand: 'High', // Calculated based on match %
          url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/roles/${role.id}/brief`,
        }))
      );

      // Update last notified timestamp
      await db.update(user).set({ lastNotifiedAt: new Date() });
    }
  }

  console.log('[notification-dispatcher] Notification check complete');
}

// Register worker in job queue initialization (src/lib/jobs/index.ts)
export async function registerJobWorkers(boss: PgBoss): Promise<void> {
  // Existing workers...
  await boss.createQueue('dispatch-notifications');

  if (!registeredWorkers.has('dispatch-notifications')) {
    await boss.work('dispatch-notifications', notificationDispatcherHandler);
    registeredWorkers.add('dispatch-notifications');
    console.log('Registered worker: dispatch-notifications');
  }
}

// Vercel Cron endpoint (src/app/api/cron/check-notifications/route.ts)
import { NextRequest } from 'next/server';
import { getJobQueue, startJobQueue } from '@/lib/jobs';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret (DEV-024: verifySession not needed for cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const boss = await startJobQueue();
  await boss.send('dispatch-notifications');

  return Response.json({ success: true, scheduled: new Date().toISOString() });
}

// Add to vercel.json
{
  "crons": [
    {
      "path": "/api/cron/poll-jobs",
      "schedule": "0 * * * *"  // Existing job poller
    },
    {
      "path": "/api/cron/check-notifications",
      "schedule": "0 */1 * * *"  // Every hour
    }
  ]
}
```

### Pattern 4: PDF Export with Playwright

**What:** Generate proof summary PDF from HTML template using Playwright browser
**When to use:** Export role brief with requirement→evidence mappings
**Example:**

```typescript
// Source: WebSearch HTML-to-PDF benchmark 2026 (Playwright 3ms warm, 13ms complex)
// PDF generator (src/lib/export/role-brief-pdf.ts)
import { chromium } from 'playwright';

interface RoleBriefData {
  jobTitle: string;
  company: string;
  fitBand: string;
  requirements: Array<{
    category: string;
    text: string;
    evidence: Array<{
      title: string;
      excerpt: string;
      confidence: string;
    }>;
  }>;
  gaps: string[];
}

export async function generateRoleBriefPDF(data: RoleBriefData): Promise<Buffer> {
  // Render HTML template with data
  const html = renderProofSummaryHTML(data);

  // Launch browser (reuse browser context for warm starts)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set content and generate PDF
  await page.setContent(html, { waitUntil: 'networkidle' });
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    printBackground: true,
  });

  await browser.close();
  return pdf;
}

function renderProofSummaryHTML(data: RoleBriefData): string {
  // Simple HTML template (can be replaced with React component + renderToString)
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #333; }
          .requirement { margin-bottom: 20px; border-left: 4px solid #000; padding-left: 12px; }
          .evidence { margin-left: 20px; color: #666; }
          .gap { color: red; }
        </style>
      </head>
      <body>
        <h1>${data.jobTitle} at ${data.company}</h1>
        <p><strong>Fit:</strong> ${data.fitBand}</p>
        <h2>Requirements & Evidence</h2>
        ${data.requirements
          .map(
            (req) => `
          <div class="requirement">
            <h3>${req.category}: ${req.text}</h3>
            ${req.evidence
              .map(
                (ev) => `
              <div class="evidence">
                <strong>${ev.title}</strong> (${ev.confidence})<br>
                ${ev.excerpt}
              </div>
            `
              )
              .join('')}
          </div>
        `
          )
          .join('')}
        <h2>Gaps</h2>
        ${data.gaps.map((gap) => `<p class="gap">⚠️ ${gap}</p>`).join('')}
      </body>
    </html>
  `;
}

// API route for export (src/app/api/roles/[jobId]/export/route.ts)
import { generateRoleBriefPDF } from '@/lib/export/role-brief-pdf';
import { verifySession } from '@/lib/auth/dal';

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await verifySession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;

  // Fetch role brief data (from matching engine)
  const briefData = await fetchRoleBriefData(jobId, session.userId);

  // Generate PDF
  const pdf = await generateRoleBriefPDF(briefData);

  // Return as download
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${briefData.company}-${briefData.jobTitle}.pdf"`,
    },
  });
}
```

### Pattern 5: Audit Trail with Application-Level Logging

**What:** Track parser confidence and user corrections in dedicated audit tables
**When to use:** All user edits to parsed data (requirements, evidence, mappings)
**Example:**

```typescript
// Source: WebSearch PostgreSQL audit trail patterns 2026
// Schema extension (src/lib/db/schema.ts)
export const parserAudit = pgTable(
  'parser_audit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // 'requirement' | 'evidence' | 'mapping'
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'accept' | 'reject'
    parserConfidence: real('parser_confidence'), // Original parser confidence (0.0-1.0)
    beforeValue: jsonb('before_value'),
    afterValue: jsonb('after_value'),
    userFeedback: text('user_feedback'), // Optional user note on why they changed it
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('parser_audit_user_id_idx').on(table.userId),
    index('parser_audit_entity_idx').on(table.entityType, table.entityId),
    index('parser_audit_created_at_idx').on(table.createdAt),
  ]
);

// Helper function (src/lib/db/queries/audit.ts)
export async function logParserCorrection(params: {
  userId: string;
  entityType: 'requirement' | 'evidence' | 'mapping';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'accept' | 'reject';
  parserConfidence?: number;
  beforeValue?: unknown;
  afterValue?: unknown;
  userFeedback?: string;
}) {
  await db.insert(parserAudit).values({
    id: crypto.randomUUID(),
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    parserConfidence: params.parserConfidence,
    beforeValue: params.beforeValue,
    afterValue: params.afterValue,
    userFeedback: params.userFeedback,
  });
}

// Usage in requirement edit API (src/app/api/jobs/[id]/requirements/[requirementId]/route.ts)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, requirementId } = await params;
  const body = await request.json();

  // Fetch original requirement
  const original = await db.query.requirement.findFirst({
    where: (req, { eq }) => eq(req.id, requirementId),
  });

  if (!original) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Update requirement
  const updated = await db
    .update(requirement)
    .set({
      normalizedText: body.normalizedText,
      isManuallyEdited: true,
      updatedAt: new Date(),
    })
    .where(eq(requirement.id, requirementId))
    .returning();

  // Log parser correction to audit trail
  await logParserCorrection({
    userId: session.userId,
    entityType: 'requirement',
    entityId: requirementId,
    action: 'update',
    beforeValue: { normalizedText: original.normalizedText },
    afterValue: { normalizedText: body.normalizedText },
    userFeedback: body.feedback, // Optional from UI
  });

  return Response.json(updated[0]);
}
```

### Anti-Patterns to Avoid

- **Sending individual emails for each role:** Leads to notification fatigue. Batch roles into digest emails (hourly/daily).
- **Using pgEnum for status:** Violates DEV-021. Changing enums requires migrations. Use text + Zod validation.
- **Real-time notification WebSockets:** Adds complexity for minimal UX gain. Hourly email digests are sufficient for V1.
- **Client-side PDF generation:** Unreliable, slow, browser-dependent. Use server-side Playwright for consistent output.
- **Synchronous PDF generation in API route:** Blocks request. Use pg-boss background job for async generation, return job ID.
- **Storing full HTML in database:** Wasteful. Store data, render HTML template on-demand for PDF generation.
- **Trigger-based audit logging:** Complex, requires PostgreSQL triggers. Application-level logging gives more control and context.

## Don't Hand-Roll

| Problem                     | Don't Build                                      | Use Instead                                | Why                                                                                                           |
| --------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Email HTML rendering        | Custom HTML string builders, template engines    | React Email + Resend                       | Email client compatibility is complex (Outlook, Gmail, dark mode). React Email handles edge cases.            |
| HTML to PDF conversion      | Canvas-based PDF libraries (jsPDF, pdfmake)      | Playwright browser automation              | Modern CSS/layout requires full browser rendering. Playwright 98%+ accuracy vs 60% for libraries.             |
| Job queue with retries      | Custom retry logic, setTimeout/setInterval       | pg-boss                                    | Job queues need persistence, failure handling, concurrency control. pg-boss has 10+ years of edge case fixes. |
| Email deliverability        | Direct SMTP, custom bounce handling              | Resend managed service                     | Deliverability requires SPF/DKIM/DMARC, IP reputation management, bounce/complaint handling.                  |
| Notification batching logic | Custom timestamp tracking, in-memory aggregation | pg-boss scheduled jobs + database queries  | Race conditions, server restarts, distributed systems. pg-boss handles locking and retries.                   |
| Status state machine        | Custom validation, if/else chains                | Zod enum validation + database constraints | State transitions need validation, audit logging, rollback. Zod provides runtime safety.                      |

**Key insight:** Email, PDF, and async job processing are deceptively complex domains. Email clients have inconsistent rendering, PDFs require full browser layout engines, and job queues need distributed locking. Use battle-tested libraries that handle edge cases.

## Common Pitfalls

### Pitfall 1: Notification Spam and Email Fatigue

**What goes wrong:** Sending individual email for every new high-fit role floods user inboxes. Users mark as spam or unsubscribe.

**Why it happens:** Naive implementation sends email immediately when role matching completes. Doesn't batch or throttle notifications.

**How to avoid:**

- Use digest pattern: batch roles into hourly/daily emails
- Add user preference for notification frequency (hourly/daily/weekly)
- Cap roles per email (max 10 to avoid overwhelm)
- Include "unsubscribe" link in all emails (legal requirement + UX)
- Track user engagement (opens, clicks) to adjust frequency

**Warning signs:** High unsubscribe rate, low email open rate, spam complaints

### Pitfall 2: PDF Generation Timeout in API Routes

**What goes wrong:** Playwright browser launch takes 50-200ms cold start. API route times out or blocks other requests.

**Why it happens:** Synchronous PDF generation in request handler. Browser initialization is expensive.

**How to avoid:**

- Use pg-boss background job for PDF generation
- API route returns job ID, client polls for completion
- Or stream PDF response with chunked transfer encoding
- Reuse browser context across requests (warm starts 3ms vs 42ms cold)
- Cache generated PDFs with job version/timestamp hash

**Warning signs:** 504 Gateway Timeout errors, slow API response times >5s, high server memory usage

### Pitfall 3: Stale Data in Email Links

**What goes wrong:** Email sent at T0, user clicks link at T1 (hours later). Role data has changed (status, fit score). User sees outdated info.

**Why it happens:** Email contains computed values (fit score, status) instead of links to live data.

**How to avoid:**

- Email links point to role brief page, not static data
- Role brief page fetches latest data on-demand
- Show "as of [timestamp]" in emails for transparency
- Include version hash in email data for debugging
- Invalidate cache when role data updates

**Warning signs:** User reports "email says High Fit but page says Medium", support tickets about data mismatches

### Pitfall 4: Missing Audit Trail for System Actions

**What goes wrong:** Audit table only logs user actions. Can't distinguish between user edits and system updates (e.g., auto-matching, batch status changes).

**Why it happens:** Audit logging only in user-facing API routes, not in background jobs or system services.

**How to avoid:**

- Log all changes with `userId` (null for system actions) and `source` field ('user' | 'system' | 'admin')
- Include context: which job, which prompt version, which LLM call
- Track parser confidence even when accepted without changes
- Log system decisions (e.g., "auto-marked as Applied based on webhook")

**Warning signs:** Can't debug why requirement changed, can't measure parser accuracy over time, can't detect drift

### Pitfall 5: Race Condition in Role Status Updates

**What goes wrong:** User clicks "Save" on role card, client sends PATCH. Before response returns, user clicks "Apply". Two requests in flight. Final state is unpredictable.

**Why it happens:** Client doesn't disable UI during mutation, no optimistic locking in database.

**How to avoid:**

- Use TanStack Query mutations with `onMutate` optimistic updates
- Disable status buttons during mutation (loading state)
- Database constraint: unique index on (userId, jobId) for upsert
- Return full updated object in API response, invalidate cache
- Use `updatedAt` timestamp for optimistic concurrency control if needed

**Warning signs:** User reports "status keeps reverting", race condition errors in logs, duplicate requests

### Pitfall 6: Text Column Without Index for Status Filtering

**What goes wrong:** Filtering queue by status (`WHERE status = 'save'`) becomes slow as role_status table grows. Full table scan on every query.

**Why it happens:** Forgot to add index on status column. Text columns aren't automatically indexed like foreign keys.

**How to avoid:**

- Add index on frequently filtered columns: `index('role_status_status_idx').on(table.status)`
- Composite index for common filters: `index('role_status_user_status_idx').on(table.userId, table.status)`
- Monitor slow query log, add indexes as needed
- Use `EXPLAIN ANALYZE` to verify index usage

**Warning signs:** Queue page slow with >1000 roles, database CPU spike during filtering, full table scans in query plan

## Code Examples

Verified patterns from official sources:

### Queue Filtering with URL Search Params

**Source:** [Next.js App Router: Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) + [nuqs library](https://github.com/47ng/nuqs)

```typescript
// Client component with URL state (src/app/dashboard/queue/filters.tsx)
'use client';

import { useQueryState, parseAsStringLiteral } from 'nuqs';

const statusValues = ['all', 'ignore', 'save', 'apply', 'applied'] as const;

export function QueueFilters() {
  const [status, setStatus] = useQueryState(
    'status',
    parseAsStringLiteral(statusValues).withDefault('all')
  );

  return (
    <div className="flex gap-2">
      {statusValues.map(value => (
        <button
          key={value}
          onClick={() => setStatus(value)}
          className={status === value ? 'font-bold' : ''}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </button>
      ))}
    </div>
  );
}

// Server component with searchParams (src/app/dashboard/queue/page.tsx)
import { Suspense } from 'react';
import { QueueFilters } from './filters';
import { getRankedJobs } from '@/lib/matching/ranker';

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  return (
    <div>
      <h1>Fresh Match Queue</h1>
      <QueueFilters />
      <Suspense fallback={<div>Loading...</div>}>
        <QueueList status={status} />
      </Suspense>
    </div>
  );
}

async function QueueList({ status }: { status?: string }) {
  // Fetch jobs filtered by status
  const jobs = await getRankedJobs({ status: status === 'all' ? undefined : status });

  return (
    <div>
      {jobs.map(job => (
        <RoleCard key={job.id} job={job} />
      ))}
    </div>
  );
}
```

### TanStack Query Optimistic Status Update

**Source:** [TanStack Query Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates)

```typescript
// Client component with optimistic update (src/app/dashboard/queue/role-card.tsx)
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function RoleStatusButtons({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/roles/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onMutate: async (newStatus) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['queue'] });

      // Snapshot previous value
      const previousQueue = queryClient.getQueryData(['queue']);

      // Optimistically update cache
      queryClient.setQueryData(['queue'], (old: any) =>
        old?.map((job: any) =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );

      return { previousQueue };
    },
    onError: (err, newStatus, context) => {
      // Rollback on error
      queryClient.setQueryData(['queue'], context?.previousQueue);
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });

  return (
    <div className="flex gap-2">
      {['ignore', 'save', 'apply', 'applied'].map(status => (
        <button
          key={status}
          onClick={() => mutate(status)}
          disabled={isPending || currentStatus === status}
          className={currentStatus === status ? 'font-bold' : ''}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
```

### pg-boss Scheduled Job Registration

**Source:** [Context7 /timgit/pg-boss](https://github.com/timgit/pg-boss)

```typescript
// Register recurring notification check (src/lib/jobs/index.ts)
export async function registerJobWorkers(boss: PgBoss): Promise<void> {
  // ... existing workers

  // Create queue
  await boss.createQueue('dispatch-notifications');

  // Register worker
  if (!registeredWorkers.has('dispatch-notifications')) {
    await boss.work('dispatch-notifications', notificationDispatcherHandler);
    registeredWorkers.add('dispatch-notifications');
  }

  // Schedule recurring job (runs every hour)
  // Note: Vercel Cron calls API endpoint, which sends job to queue
  // This is alternative approach if not using Vercel Cron
  await boss.schedule(
    'dispatch-notifications',
    '0 * * * *', // Cron expression: every hour
    {}, // No data needed
    { tz: 'America/New_York' }
  );
}
```

## State of the Art

| Old Approach                    | Current Approach              | When Changed             | Impact                                                                                                                                                     |
| ------------------------------- | ----------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Individual transactional emails | Batched digest emails         | 2024-2025                | Reduces email fatigue, improves engagement rates. Industry standard per [Postmark 2026](https://postmarkapp.com/guides/transactional-email-best-practices) |
| jsPDF for HTML-to-PDF           | Playwright browser automation | 2023-2026                | 98%+ rendering accuracy vs 60% for canvas-based. Benchmark: [PDF4.dev 2026](https://pdf4.dev/blog/html-to-pdf-benchmark-2026)                              |
| pgEnum for status columns       | Text columns + Zod validation | Project decision DEV-021 | Avoids migrations for enum changes, runtime validation flexibility                                                                                         |
| BullMQ (Redis queue)            | pg-boss (PostgreSQL queue)    | Project decision         | Simpler stack, one less dependency (no Redis), sufficient for V1 throughput                                                                                |
| Puppeteer                       | Playwright                    | 2022-2026                | 4x faster cold start (42ms vs 147ms), multi-browser support, active Microsoft backing                                                                      |
| Raw HTML email templates        | React Email components        | 2023-2026                | Type-safe, component reuse, better dark mode support, industry standard                                                                                    |

**Deprecated/outdated:**

- **SendGrid templates:** Resend + React Email is now standard for developer-focused email (2023+)
- **PhantomJS for PDF:** Deprecated 2018, replaced by headless Chrome/Playwright
- **pg_cron PostgreSQL extension:** Vercel doesn't support extensions, use Vercel Cron + pg-boss instead

## Open Questions

1. **Notification frequency preferences**
   - What we know: Hourly batch is planned for V1
   - What's unclear: Should users configure frequency (hourly/daily/weekly) or is hourly sufficient?
   - Recommendation: Start with hourly only, add preference in V2 based on user feedback. Simpler V1 implementation.

2. **PDF export caching strategy**
   - What we know: PDF generation takes 50-200ms cold, 3-13ms warm
   - What's unclear: Should we cache generated PDFs? If so, invalidation strategy for role data changes?
   - Recommendation: V1 generate on-demand (no cache), monitor performance. Add cache in V2 if >100 exports/day.

3. **Audit trail retention policy**
   - What we know: Audit tables grow unbounded without cleanup
   - What's unclear: How long to retain audit records? Legal requirements?
   - Recommendation: Keep all records for V1 (small dataset). Implement time-based partitioning in V2 if >100K records.

4. **Export format: PDF only or CSV option?**
   - What we know: Requirement says "export proof summary", implies PDF
   - What's unclear: Do users also need CSV/JSON export for their own tracking?
   - Recommendation: V1 PDF only (satisfies requirement). Add CSV in V2 if requested. Simpler initial scope.

5. **Notification preview/testing**
   - What we know: React Email has preview dev server
   - What's unclear: Should admin users be able to preview/test emails in production UI?
   - Recommendation: V1 use React Email dev server locally. Add preview UI in V2 for non-technical users.

## Sources

### Primary (HIGH confidence)

- [Context7 /timgit/pg-boss](https://context7.com/timgit/pg-boss) - Job queue API, scheduling, workers
- [Context7 /websites/resend](https://context7.com/websites/resend) - Email API, templates, error handling
- [Context7 /resend/react-email](https://context7.com/resend/react-email) - Email template components, rendering
- [Next.js Official Docs - useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) - URL state management
- [Next.js Official Docs - Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - Server component filtering
- [TanStack Query Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates) - Mutation patterns

### Secondary (MEDIUM confidence)

- [HTML to PDF Benchmark 2026 (Playwright vs Puppeteer)](https://pdf4.dev/blog/html-to-pdf-benchmark-2026) - Performance comparison, verified by multiple sources
- [Best Node.js HTML to PDF Libraries 2026](https://apitemplate.io/blog/how-to-convert-html-to-pdf-using-node-js/) - Library comparison, use case recommendations
- [PostgreSQL Audit Logging Best Practices](https://oneuptime.com/blog/post/2026-01-21-postgresql-audit-logging/view) - Audit trail patterns, verified with multiple sources
- [PostgreSQL Audit Trails with Triggers](https://oneuptime.com/blog/post/2026-01-25-postgresql-audit-trails-triggers/view) - Trigger-based logging (not recommended for this project)
- [Transactional Email Best Practices 2026](https://postmarkapp.com/guides/transactional-email-best-practices) - Digest patterns, deliverability
- [Email Digest Best Practices](https://stripo.email/blog/design-newsletter-blog/) - Batching strategy, frequency
- [Managing Search Param Filtering in Next.js App Router](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) - nuqs library usage
- [nuqs GitHub](https://github.com/47ng/nuqs) - Type-safe search params for Next.js

### Tertiary (LOW confidence)

- State machine workflow patterns - General research, not library-specific
- React Server Components + TanStack Query 2026 - Blog post, not official docs

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in project or official recommendations from Resend/Next.js
- Architecture: HIGH - Patterns verified via Context7 official docs and Next.js official guides
- Pitfalls: MEDIUM - Based on web search + prior project experience, not all verified with official sources
- Export (PDF): MEDIUM - Playwright already in dependencies, benchmark verified, but export pattern not yet implemented
- Notifications: HIGH - Resend + React Email official docs, pg-boss Context7 docs

**Research date:** 2026-04-02
**Valid until:** ~60 days (stable domain: email, PDF, job queues have slow-changing APIs)
