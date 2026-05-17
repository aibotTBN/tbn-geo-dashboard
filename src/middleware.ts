import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin routes: only TBN_STAFF and ADMIN
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const role = token?.role as string
      if (role !== 'TBN_STAFF' && role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes that don't require auth
        const publicPaths = [
          '/login',
          '/register',
          '/invite',
          '/forgot-password',
          '/reset-password',
          '/api/auth',
          '/api/geo/check', // Free GEO check
          '/api/mcp',       // MCP server
          '/api/waitlist',
        ]

        if (publicPaths.some(p => pathname.startsWith(p))) {
          return true
        }

        // Landing page
        if (pathname === '/') {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // Match all routes except static files, _next, and public assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
