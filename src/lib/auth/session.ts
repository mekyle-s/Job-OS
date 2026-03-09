import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Verify session and return user or redirect to sign-in.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/sign-in');
  }

  return session.user;
}

/**
 * Verify session and return user or null.
 * Use when you need to handle unauthenticated state without redirect.
 */
export async function verifySession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}
