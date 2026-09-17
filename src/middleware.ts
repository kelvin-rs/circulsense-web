import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'circulsense_auth_token';

// Protected routes requiring user login
const PROTECTED_ROUTES = [
  '/beranda',
  '/riwayat',
  '/laporan',
  '/profil'
];

// Auth routes for unauthenticated users
const AUTH_ROUTES = [
  '/masuk',
  '/daftar'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if session token exists in cookies
  const authToken =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get('sb-access-token')?.value ||
    Array.from(request.cookies.getAll()).find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))?.value;

  const isAuthenticated = !!authToken;

  // 1. Root path '/'
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/beranda', request.url));
    } else {
      return NextResponse.redirect(new URL('/masuk', request.url));
    }
  }

  // 2. Protected routes: redirect unauthenticated user to /masuk
  const isProtected = PROTECTED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  if (isProtected && !isAuthenticated) {
    const redirectUrl = new URL('/masuk', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Auth routes: redirect already authenticated user to /beranda
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/beranda', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images / public static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
