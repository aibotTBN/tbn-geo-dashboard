import { NextResponse } from 'next/server'

// Simple in-memory rate limiting per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 }) // 1 hour window
    return false
  }
  entry.count++
  return entry.count > 5 // Max 5 submissions per hour per IP
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' }, { status: 400 })
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }, { status: 429 })
    }

    // Send to Slack webhook
    const slackWebhookUrl = process.env.SLACK_WAITLIST_WEBHOOK_URL
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚀 *Neuer LLM Radar Beta-Interessent!*\n📧 ${email}\n📅 ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
          }),
        })
      } catch (slackErr) {
        console.error('Slack webhook error:', slackErr)
        // Don't fail the request if Slack notification fails
      }
    } else {
      // Log to console if no Slack webhook configured
      console.log(`[WAITLIST] New signup: ${email} at ${new Date().toISOString()}`)
    }

    // Also store in database if prisma is available
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      // Check if email already exists
      const existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM "WaitlistEntry" WHERE email = $1 LIMIT 1`,
        email
      ) as any[]

      if (existing && existing.length > 0) {
        await prisma.$disconnect()
        return NextResponse.json({ 
          message: 'Diese E-Mail ist bereits auf der Warteliste. Wir melden uns bald bei Ihnen!' 
        })
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "WaitlistEntry" (id, email, "createdAt", source) VALUES (gen_random_uuid(), $1, NOW(), $2)`,
        email,
        'landing_page'
      )
      await prisma.$disconnect()
    } catch (dbErr) {
      // DB might not have the table yet — that's OK, Slack notification was sent
      console.log('[WAITLIST] DB storage skipped:', (dbErr as Error).message)
    }

    return NextResponse.json({ 
      message: 'Willkommen in der Closed Beta! Wir melden uns in Kürze bei Ihnen.' 
    })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Interner Fehler. Bitte versuchen Sie es erneut.' }, { status: 500 })
  }
}
