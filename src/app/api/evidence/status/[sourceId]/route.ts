import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getEvidenceSourceById, getEvidenceItemsByUser } from '@/lib/db/queries/evidence';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  // 1. Authenticate user
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // 2. Get sourceId from params
    const { sourceId } = await params;

    // 3. Query evidenceSource by ID
    const source = await getEvidenceSourceById(sourceId);

    if (!source) {
      return Response.json({ error: 'Source not found' }, { status: 404 });
    }

    // 4. Verify source belongs to authenticated user (security check)
    if (source.userId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Get item count if completed
    let itemCount = 0;
    if (source.parseStatus === 'completed') {
      const allItems = await getEvidenceItemsByUser(userId);
      itemCount = allItems.filter((item) => item.sourceId === sourceId).length;
    }

    // 6. Return status information
    return Response.json({
      status: source.parseStatus,
      error: source.parseError,
      itemCount,
    });
  } catch (error) {
    console.error('Status check error:', error);
    const message = error instanceof Error ? error.message : 'Failed to check status';
    return Response.json({ error: message }, { status: 500 });
  }
}
