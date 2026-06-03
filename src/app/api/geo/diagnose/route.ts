import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { triggerDiagnose } from '@/lib/n8n'
import { prisma } from '@/lib/prisma'
import { computeTechScore, computeSchemaScore } from '@/lib/local-scoring'

/**
 * Compute the citation dimension score (0-30) from per-engine data.
 * Returns null if no usable engine data exists.
 */
function computeCitationFromEngines(citationEngines: Record<string, any>): number | null {
  const activeEngines = Object.entries(citationEngines).filter(
    ([, data]) => data && data.status === 'ok' && typeof data.score === 'number'
  )
  if (activeEngines.length === 0) return null
  return Math.round(
    activeEngines.reduce((sum, [, data]) => sum + (data.score ?? 0), 0) / activeEngines.length
  )
}

/**
 * Normalize the n8n GEO Diagnose response into the flat format the frontend expects.
 * v2: Now includes per-engine citation data and Google AI Readiness.
 * v3: Recomputes score_citation from per-engine data when available so the
 *     top-level dimension always matches the engine breakdown average.
 */
function normalizeResult(raw: any) {
  const report = raw?.report
  const scores = report?.scores
  const bd = scores?.breakdown
  const citationEngines = report?.citation_engines ?? {}

  // Prefer engine-derived citation score for consistency with the breakdown card
  const rawCitation = bd?.citation?.score ?? 0
  const engineCitation = computeCitationFromEngines(citationEngines)
  const score_citation = engineCitation !== null ? engineCitation : rawCitation

  // Recalculate total if citation was adjusted
  const rawTotal = scores?.total ?? 0
  const geo_score = rawTotal - rawCitation + score_citation

  return {
    geo_score,
    score_citation,
    score_tech: bd?.technical?.score ?? 0,
    score_schema: bd?.schema?.score ?? 0,
    score_content: bd?.content?.score ?? 0,
    score_fresh: bd?.freshness?.score ?? 0,
    pages_analyzed: report?.analysis?.pages_crawled ?? report?.meta?.pages_analyzed ?? undefined,
    recommendations: report?.recommendations ?? [],
    // Multi-engine citation data
    citation_engines: citationEngines,
    engines_active: bd?.citation?.engines_active ?? 1,
    // Google AI Readiness
    google_ai_readiness: report?.google_ai_readiness ?? null,
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
    // Ensure project exists and get its settings
    const project = await prisma.project.upsert({
      where: { domain },
      update: { updatedAt: new Date() },
      create: { domain, name: companyName || domain },
    })

    // Use project-level industry & coreTopics, with request overrides
    const effectiveIndustry = industry || project.industry || 'B2B'
    const effectiveCoreTopics = project.coreTopics || ''
    const effectiveName = companyName || project.name || domain

    // Run n8n diagnosis + local checks in parallel
    const [raw, localTech, localSchema] = await Promise.all([
      triggerDiagnose(domain, effectiveName, effectiveIndustry, effectiveCoreTopics),
      computeTechScore(domain).catch(() => ({ score: 0, checks: {} })),
      computeSchemaScore(domain).catch(() => ({ score: 0, count: 0, types: [], errors: [] })),
    ])
    const result = normalizeResult(raw)

    // Use the higher of n8n vs local scores for Tech & Schema.
    // n8n sometimes returns 0 for these dimensions due to timeouts or parsing issues,
    // while the local checks directly verify the files exist.
    const n8nTech = result.score_tech
    const n8nSchema = result.score_schema
    if (localTech.score > result.score_tech) {
      result.score_tech = localTech.score
    }
    if (localSchema.score > result.score_schema) {
      result.score_schema = localSchema.score
    }
    // Recalculate total score if local scores were used
    const techDelta = result.score_tech - n8nTech
    const schemaDelta = result.score_schema - n8nSchema
    if (techDelta > 0 || schemaDelta > 0) {
      result.geo_score += techDelta + schemaDelta
    }

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
