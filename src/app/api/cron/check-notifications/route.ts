import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { dispatchNotifications } from '@/lib/jobs/workers/notification-dispatcher';

export const maxDuration = 300;

/**
 * Vercel Cron endpoint for notification checks
 *
 * Secured with CRON_SECRET bearer token. The dispatcher runs after the
 * response via after() — serverless-safe, no background worker process.
 */
export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET from authorization header. Fail closed when the
  // secret is unset — otherwise "Bearer undefined" would authenticate.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Run notification dispatch after the response is sent
  after(async () => {
    await dispatchNotifications();
  });

  // 3. Return response
  return Response.json({
    success: true,
    scheduled: new Date().toISOString(),
  });
}
