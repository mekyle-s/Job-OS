import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { getUserCriteria, upsertUserCriteria } from '@/lib/db/queries/user-criteria';
import { z } from 'zod';

// ============================================================
// Validation Schemas
// ============================================================

const CriteriaInputSchema = z.object({
  jobFunction: z.string().nullable().optional(),
  locations: z.array(z.string()).nullable().optional(),
  visaRequired: z.boolean().nullable().optional(),
  targetCompanies: z.array(z.string()).max(15), // empty = all companies (discover mode), max 15
  // Job types to match; null or empty = all types
  jobTypes: z
    .array(z.enum(['full_time', 'part_time', 'internship', 'contract']))
    .nullable()
    .optional(),
});

// ============================================================
// GET /api/criteria - Get user's criteria
// ============================================================

export async function GET() {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get criteria
    const criteria = await getUserCriteria(user.id);

    return Response.json({ criteria: criteria ?? null });
  } catch (error) {
    console.error('Error fetching criteria:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch criteria';
    return Response.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// PUT /api/criteria - Update user's criteria
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    // Authenticate
    const user = await verifySession();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CriteriaInputSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Convert null to undefined per DEV-020 pattern
    const criteriaData = {
      jobFunction: validation.data.jobFunction ?? undefined,
      locations: validation.data.locations ?? undefined,
      visaRequired: validation.data.visaRequired ?? undefined,
      targetCompanies: validation.data.targetCompanies,
      jobTypes: validation.data.jobTypes ?? undefined,
    };

    // Upsert criteria
    const criteria = await upsertUserCriteria(user.id, criteriaData);

    return Response.json({ criteria });
  } catch (error) {
    console.error('Error updating criteria:', error);
    const message = error instanceof Error ? error.message : 'Failed to update criteria';
    return Response.json({ error: message }, { status: 500 });
  }
}
