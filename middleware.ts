import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow static files, api routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check if site is unlocked via cookie
  const siteUnlockedCookie = request.cookies.get('vr_site_unlocked');
  const isUnlocked = siteUnlockedCookie && siteUnlockedCookie.value === 'true';

  // Check if user session cookie exists
  const sessionCookie = request.cookies.get('vr_session');

  // If visiting /login and already unlocked & logged in, allow
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // If site is NOT unlocked or session missing, force server-side redirect to /login
  if (!isUnlocked) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
