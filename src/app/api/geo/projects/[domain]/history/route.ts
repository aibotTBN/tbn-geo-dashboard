import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/geo/projects/[domain]/history?limit=20
export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '20')

  const project = await prisma.project.findUnique({
    where: { domain },
    select: { id: true, domain: true, name: true }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const diagnoses = await prisma.diagnosis.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      score: true,
      scoreCitation: true,
      scoreTech: true,
      scoreSchema: true,
      scoreContent: true,
      scoreFresh: true,
      createdAt: true,
    }
  })

  // Reverse so oldest first (for chart display)
  const history = diagnoses.reverse().map(d => ({
    id: d.id,
    date: d.createdAt.toISOString(),
    score: d.score,
    citation: d.scoreCitation,
    tech: d.scoreTech,
    schema: d.scoreSchema,
    content: d.scoreContent,
    freshness: d.scoreFresh,
  }))

  // Calculate trends (compare latest vs previous)
  let trend = null
  if (history.length >= 2) {
    const latest = history[history.length - 1]
    const previous = history[history.length - 2]
    trend = {
      scoreDelta: latest.score - previous.score,
      citationDelta: latest.citation - previous.citation,
      techDelta: latest.tech - previous.tech,
      schemaDelta: latest.schema - previous.schema,
      contentDelta: latest.content - previous.content,
      freshnessDelta: latest.freshness - previous.freshness,
      daysBetween: Math.round(
        (new Date(latest.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }
  }

  return NextResponse.json({ history, trend, total: diagnoses.length })
}
