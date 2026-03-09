import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard'];
const authRoutes = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

/**
 * Middleware provides optimistic redirects for better UX.
 * This is NOT the authorization boundary - Server Components, Actions, and
 * Route Handlers must verify auth independently using requireUser().
 *
 * Uses simple cookie presence check (Edge-compatible) instead of session validation.
 * Actual auth verification happens server-side in requireUser().
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // Only check session for protected or auth routes
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  // Check for session cookie presence (optimistic check for UX)
  // Better Auth uses 'better-auth.session_token' cookie
  const hasSessionCookie = request.cookies.has('better-auth.session_token');

  // Redirect to sign-in if accessing protected route without session cookie (UX)
  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Redirect to dashboard if accessing auth route with session cookie (UX)
  if (isAuthRoute && hasSessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
