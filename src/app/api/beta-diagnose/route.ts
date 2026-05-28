import { NextRequest, NextResponse } from 'next/server'
import { triggerDiagnose } from '@/lib/n8n'
import { prisma } from '@/lib/prisma'
import { pushLead } from '@/lib/mailingwork'

/**
 * Beta Diagnose — unauthenticated, rate-limited GEO analysis.
 * Free tier: 1 diagnosis per domain, max 3 per email per day.
 */

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count++
  return entry.count > limit
}

function normalizeResult(raw: any) {
  const report = raw?.report
  const scores = report?.scores
  const bd = scores?.breakdown

  return {
    score: scores?.total ?? 0,
    scoreCitation: bd?.citation?.score ?? 0,
    scoreTech: bd?.technical?.score ?? 0,
    scoreSchema: bd?.schema?.score ?? 0,
    scoreContent: bd?.content?.score ?? 0,
    scoreFresh: bd?.freshness?.score ?? 0,
    recommendations: report?.recommendations ?? [],
    citation_engines: report?.citation_engines ?? {},
    google_ai_readiness: report?.google_ai_readiness ?? null,
    google_ai_overview: report?.google_ai_overview ?? null,
    rag_readiness: report?.rag_readiness ?? null,
    reportJson: JSON.stringify(raw),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain: rawDomain, email } = body

    // Validate inputs
    if (!rawDomain || typeof rawDomain !== 'string') {
      return NextResponse.json({ error: 'Domain erforderlich.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich.' }, { status: 400 })
    }

    const domain = rawDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    if (!domain.includes('.')) {
      return NextResponse.json({ error: 'Ungültige Domain.' }, { status: 400 })
    }

    // Rate limiting: 3 analyses per email per day
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(`email:${email}`, 3, 86400_000)) {
      return NextResponse.json({ error: 'Tageslimit erreicht. Bitte versuchen Sie es morgen erneut.' }, { status: 429 })
    }
    if (isRateLimited(`ip:${ip}`, 5, 86400_000)) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }, { status: 429 })
    }

    // Check if this domain was already analyzed in the last 24h (for free tier)
    try {
      const existingProject = await prisma.project.findUnique({ where: { domain } })
      if (existingProject) {
        const recentDiagnosis = await prisma.diagnosis.findFirst({
          where: {
            projectId: existingProject.id,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
        })
        if (recentDiagnosis) {
          // Return cached result instead of re-running
          return NextResponse.json({
            score: recentDiagnosis.score,
            scoreCitation: recentDiagnosis.scoreCitation,
            scoreTech: recentDiagnosis.scoreTech,
            scoreSchema: recentDiagnosis.scoreSchema,
            scoreContent: recentDiagnosis.scoreContent,
            scoreFresh: recentDiagnosis.scoreFresh,
            reportJson: recentDiagnosis.reportJson,
            cached: true,
          })
        }
      }
    } catch {
      // DB check failed — proceed with fresh analysis
    }

    // Save email to waitlist (non-blocking)
    try {
      const existingEntry = await prisma.waitlistEntry.findUnique({ where: { email } })
      if (!existingEntry) {
        await prisma.waitlistEntry.create({
          data: { email, source: 'beta_analysis' },
        })
      }
    } catch {
      // Non-critical — email may already exist
    }

    // Push lead to Mailingwork Liste 25 (non-blocking)
    pushLead({ email, domain }).catch((err) => {
      console.error('[Mailingwork] Lead push failed (non-blocking):', err)
    })

    // Send Slack notification
    const slackWebhookUrl = process.env.SLACK_WAITLIST_WEBHOOK_URL
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔬 *Neue Beta-Analyse gestartet!*\n📧 ${email}\n🌐 ${domain}\n📅 ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
          }),
        })
      } catch {
        // Non-critical
      }
    }

    // Ensure project exists
    const project = await prisma.project.upsert({
      where: { domain },
      update: { updatedAt: new Date() },
      create: { domain, name: domain },
    })

    // Trigger n8n diagnosis
    const raw = await triggerDiagnose(domain, domain, 'B2B', '')
    const result = normalizeResult(raw)

    // Save to DB
    if (result.score > 0) {
      await prisma.diagnosis.create({
        data: {
          projectId: project.id,
          score: result.score,
          scoreCitation: result.scoreCitation,
          scoreTech: result.scoreTech,
          scoreSchema: result.scoreSchema,
          scoreContent: result.scoreContent,
          scoreFresh: result.scoreFresh,
          reportJson: result.reportJson,
        },
      })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Beta diagnose error:', error)
    return NextResponse.json(
      { error: 'Die Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    )
  }
}
