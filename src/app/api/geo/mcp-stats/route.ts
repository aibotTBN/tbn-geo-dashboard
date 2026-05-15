/**
 * MCP Analytics Stats API — returns aggregated MCP request data for the dashboard.
 *
 * Route: /api/geo/mcp-stats?domain=example.de&days=30
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  // Auth check
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const domain = request.nextUrl.searchParams.get('domain')
  if (!domain) {
    return NextResponse.json({ error: 'domain parameter required' }, { status: 400 })
  }

  const days = Math.min(parseInt(request.nextUrl.searchParams.get('days') || '30'), 90)
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    // 1. Total requests in period
    const totalRequests = await prisma.mcpRequest.count({
      where: { domain, createdAt: { gte: since } },
    })

    // 2. Previous period for comparison
    const prevSince = new Date(since)
    prevSince.setDate(prevSince.getDate() - days)
    const prevRequests = await prisma.mcpRequest.count({
      where: { domain, createdAt: { gte: prevSince, lt: since } },
    })

    // 3. Daily breakdown
    const rawDaily = await prisma.mcpRequest.groupBy({
      by: ['createdAt'],
      where: { domain, createdAt: { gte: since } },
      _count: true,
    })

    // Aggregate by date
    const dailyMap = new Map<string, number>()
    for (const row of rawDaily) {
      const date = new Date(row.createdAt).toISOString().slice(0, 10)
      dailyMap.set(date, (dailyMap.get(date) || 0) + row._count)
    }

    // Fill missing days with 0
    const daily: { date: string; count: number }[] = []
    const current = new Date(since)
    const now = new Date()
    while (current <= now) {
      const dateStr = current.toISOString().slice(0, 10)
      daily.push({ date: dateStr, count: dailyMap.get(dateStr) || 0 })
      current.setDate(current.getDate() + 1)
    }

    // 4. Engine breakdown
    const engineGroups = await prisma.mcpRequest.groupBy({
      by: ['engine'],
      where: { domain, createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { engine: 'desc' } },
    })
    const engines = engineGroups.map((g) => ({
      engine: g.engine,
      count: g._count,
    }))

    // 5. Tool breakdown
    const toolGroups = await prisma.mcpRequest.groupBy({
      by: ['tool'],
      where: { domain, createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { tool: 'desc' } },
    })
    const tools = toolGroups.map((g) => ({
      tool: g.tool,
      count: g._count,
    }))

    // 6. Last 10 requests (recent activity)
    const recentRequests = await prisma.mcpRequest.findMany({
      where: { domain },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tool: true,
        engine: true,
        sourceIp: true,
        createdAt: true,
      },
    })

    // 7. Trend calculation
    const trendPercent = prevRequests > 0
      ? Math.round(((totalRequests - prevRequests) / prevRequests) * 100)
      : totalRequests > 0 ? 100 : 0

    return NextResponse.json({
      domain,
      period: { days, since: since.toISOString() },
      totalRequests,
      prevRequests,
      trendPercent,
      daily,
      engines,
      tools,
      recentRequests,
    })
  } catch (err) {
    console.error('[MCP Stats] Error:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
