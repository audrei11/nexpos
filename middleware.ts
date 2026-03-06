import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * NexPOS — Route protection middleware
 *
 * Reads the `nexpos_auth` cookie (set by auth-context.tsx on login) to
 * determine whether the user is authenticated.
 *
 * Rules:
 *   - /dashboard/** without cookie  → redirect to /login
 *   - /login with valid cookie      → redirect to /dashboard
 *   - Everything else               → pass through
 *
 * Migration path to Supabase:
 *   Replace the cookie check with createServerClient() + getSession() from
 *   @supabase/ssr, following the Supabase Next.js App Router guide.
 */

const AUTH_COOKIE = 'nexpos_auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value)

  // Protect all dashboard routes
  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect already-authenticated users away from the login page
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on every request except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
