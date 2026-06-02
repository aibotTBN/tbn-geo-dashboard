import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { triggerDiagnose } from '@/lib/n8n'
import { sendMonitoringAlertEmail } from '@/lib/email'

/**
 * GET /api/geo/monitoring-cron
 *
 * Cron endpoint that checks all projects with monitoring enabled,
 * runs diagnosis for those that are due, saves results, and sends
 * email alerts when score changes exceed the threshold.
 *
 * Call this via an external cron service (e.g., cron-job.org, Vercel Cron,
 * or a simple curl from a server) once per day.
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 */

const CRON_SECRET = process.env.CRON_SECRET || ''

function isDue(lastDiagnoseAt: Date | null, interval: string): boolean {
  if (!lastDiagnoseAt) return true // Never run before

  const now = new Date()
  const diffMs = now.getTime() - lastDiagnoseAt.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  switch (interval) {
    case 'weekly':
      return diffDays >= 6.5 // ~weekly, with a little buffer
    case 'biweekly':
      return diffDays >= 13.5
    case 'monthly':
      return diffDays >= 29
    default:
      return diffDays >= 6.5
  }
}

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
    recommendations: report?.recommendations ?? [],
  }
}

export async function GET(request: NextRequest) {
  // Auth: require CRON_SECRET header or query param
  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  const secretParam = url.searchParams.get('secret')
  const providedSecret = authHeader?.replace('Bearer ', '') || secretParam

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all projects with monitoring enabled
  const projects = await prisma.project.findMany({
    where: { monitoringEnabled: true },
    include: {
      diagnoses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  const results: { domain: string; status: string; score?: number; error?: string }[] = []

  for (const project of projects) {
    // Check if diagnosis is due based on interval
    if (!isDue(project.lastDiagnoseAt, project.monitoringInterval)) {
      results.push({ domain: project.domain, status: 'skipped (not due)' })
      continue
    }

    try {
      // Run diagnosis via n8n
      const raw = await triggerDiagnose(
        project.domain,
        project.name,
        project.industry || 'B2B',
        project.coreTopics || ''
      )
      const result = normalizeResult(raw)

      if (result.geo_score <= 0 && !raw?.report?.scores) {
        results.push({ domain: project.domain, status: 'skipped (empty result)' })
        continue
      }

      // Save diagnosis
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

      // Update lastDiagnoseAt
      await prisma.project.update({
        where: { id: project.id },
        data: { lastDiagnoseAt: new Date() },
      })

      // Determine score change
      const previousDiagnosis = project.diagnoses[0]
      const oldScore = previousDiagnosis?.score ?? null
      const scoreDelta = oldScore !== null ? result.geo_score - oldScore : null

      // Send email alert (always if email is configured, or if threshold exceeded)
      const shouldAlert =
        scoreDelta === null || // First diagnosis ever
        Math.abs(scoreDelta) >= project.alertThreshold

      if (project.alertEmail && shouldAlert) {
        await sendMonitoringAlertEmail(project.alertEmail, {
          domain: project.domain,
          newScore: result.geo_score,
          oldScore,
          scoreDelta,
          scoreCitation: result.score_citation,
          scoreTech: result.score_tech,
          scoreSchema: result.score_schema,
          scoreContent: result.score_content,
          scoreFresh: result.score_fresh,
          recommendations: result.recommendations,
        })
      }

      results.push({
        domain: project.domain,
        status: shouldAlert && project.alertEmail ? 'diagnosed + emailed' : 'diagnosed',
        score: result.geo_score,
      })
    } catch (error: any) {
      console.error(`[Monitoring] Error for ${project.domain}:`, error)
      results.push({ domain: project.domain, status: 'error', error: error.message })
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    projectsChecked: projects.length,
    results,
  })
}
