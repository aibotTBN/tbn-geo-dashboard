/**
 * Check MCP Discovery endpoint for a domain.
 * Route: /api/geo/check-mcp?domain=example.de
 *
 * Fetches https://{domain}/.well-known/mcp.json server-side (avoids CORS).
 * Returns { available: boolean, url: string, data?: object }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const domain = request.nextUrl.searchParams.get('domain')
  if (!domain) {
    return NextResponse.json({ error: 'domain parameter required' }, { status: 400 })
  }

  const mcpUrl = `https://${domain}/.well-known/mcp.json`

  try {
    const res = await fetch(mcpUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ available: false, url: mcpUrl })
    }

    // Try parsing as JSON to verify it's valid
    let data: any = null
    try {
      data = await res.json()
    } catch {
      // Response exists but isn't valid JSON
      return NextResponse.json({ available: false, url: mcpUrl })
    }

    return NextResponse.json({ available: true, url: mcpUrl, data })
  } catch {
    // Network error, timeout, DNS failure etc.
    return NextResponse.json({ available: false, url: mcpUrl })
  }
}
