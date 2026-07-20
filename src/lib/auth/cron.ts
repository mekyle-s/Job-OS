/**
 * Shared auth check for cron endpoints. Fails closed: a missing CRON_SECRET
 * rejects every request (never compare against `Bearer undefined`).
 */
export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret) && request.headers.get('authorization') === `Bearer ${cronSecret}`;
}
