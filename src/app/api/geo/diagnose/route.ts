import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { triggerDiagnose } from '@/lib/n8n'
import { prisma } from '@/lib/prisma'

/**
 * Normalize the n8n GEO Diagnose response into the flat format the frontend expects.
 * n8n returns: { report: { meta, scores: { total, breakdown: { citation, technical, schema, content, freshness } }, ... } }
 * Frontend expects: { geo_score, score_citation, score_tech, score_schema, score_content, score_fresh, pages_analyzed, recommendations }
 */
function normalizeResult(raw: any) {
  const report = raw?.report
  const scores = report?.scores
  const bd = scores?.breakdown

  return {
    geo_score: scores?.total ?? 0,
    score_citation: bd?.citation?.score ?? 0,
    score_tech: bd?.technical?.score ?? 0,
    score_schema: bd?.schema?.score ?? 0,
    score_content: bd?.content?.score ?? 0,
    score_fresh: bd?.freshness?.score ?? 0,
    pages_analyzed: report?.analysis?.pages_crawled ?? report?.meta?.pages_analyzed ?? undefined,
    recommendations: report?.recommendations ?? [],
    // Keep the full raw report for the detail view
    _raw: raw,
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { domain, companyName, industry } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // Ensure project exists
    const project = await prisma.project.upsert({
      where: { domain },
      update: { updatedAt: new Date() },
      create: { domain, name: companyName || domain },
    })

    // Trigger n8n diagnosis workflow
    const raw = await triggerDiagnose(domain, companyName, industry)
    const result = normalizeResult(raw)

    // Save to DB
    if (result.geo_score > 0 || raw?.report?.scores) {
      await prisma.diagnosis.create({
        data: {
          projectId: project.id,
          score: result.geo_score,
          scoreCitation: result.score_citation,
          scoreTech: result.score_tech,
          scoreSchema: result.score_schema,
          scoreContent: result.score_content,
          scoreFresh: result.score_fresh,
          reportJson: JSON.stringify(raw),
        },
      })
    }

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Diagnose error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
