import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Only enforce auth on dashboard paths (e.g. /dashboard, /dashboard/devices, etc.)
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('admin_session')

    if (!sessionCookie) {
      // Redirect to login if session cookie doesn't exist
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 2. Validate token signature and expiration
    const payload = await verifySessionToken(sessionCookie.value)
    if (!payload) {
      // Clear expired or tampered session cookie and redirect to login
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.set({
        name: 'admin_session',
        value: '',
        path: '/',
        maxAge: 0 // instantly expire
      })
      return response
    }
  }

  // 3. Allow access if auth passes, or if route is an API, login page, etc.
  return NextResponse.next()
}

// Optimization: limit middleware to match only dashboard sub-routes
export const config = {
  matcher: ['/dashboard/:path*'],
}
