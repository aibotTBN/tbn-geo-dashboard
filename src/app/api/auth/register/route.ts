import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email'
import { isStripeConfigured } from '@/lib/stripe'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, plan, inviteCode } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort erforderlich' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Block @tbnpr.de emails from registering (they should use Google OAuth)
    if (normalizedEmail.endsWith('@tbnpr.de')) {
      return NextResponse.json(
        { error: 'TBN-Mitarbeiter melden sich bitte über Google an.' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ein Konto mit dieser E-Mail existiert bereits' },
        { status: 409 }
      )
    }

    // Determine plan
    let userPlan: 'STARTER' | 'PRO' | 'MANAGED' | null = null
    let planExpiry: Date | null = null
    let usedInviteCode: string | null = null
    let requiresStripeCheckout = false

    if (inviteCode) {
      // Validate invite code
      const invite = await prisma.inviteLink.findUnique({ where: { code: inviteCode } })

      if (!invite || !invite.active) {
        return NextResponse.json({ error: 'Ungültiger Einladungscode' }, { status: 400 })
      }
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Einladungscode ist abgelaufen' }, { status: 400 })
      }
      if (invite.usedCount >= invite.maxUses) {
        return NextResponse.json(
          { error: 'Einladungscode wurde bereits verwendet' },
          { status: 400 }
        )
      }

      userPlan = invite.plan
      usedInviteCode = invite.code

      // Increment usage count
      await prisma.inviteLink.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      })
    } else if (plan && ['STARTER', 'PRO'].includes(plan)) {
      // For paid plans without invite: plan is NOT activated yet.
      // User must complete Stripe Checkout first.
      // We store the plan as null until payment is confirmed via webhook.
      if (isStripeConfigured()) {
        requiresStripeCheckout = true
        userPlan = null // Will be set by Stripe webhook after payment
      } else {
        // Stripe not configured — activate plan directly (dev/test mode)
        userPlan = plan as 'STARTER' | 'PRO'
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: normalizedEmail,
        passwordHash,
        role: 'USER',
        plan: userPlan,
        planExpiresAt: planExpiry,
        inviteCode: usedInviteCode,
      },
    })

    // Email verification flow
    const hasEmailSystem = !!process.env.RESEND_API_KEY
    let autoVerified = false

    if (hasEmailSystem) {
      // Send verification email
      const verificationToken = crypto.randomBytes(32).toString('hex')
      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: verificationToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      })
      await sendVerificationEmail(normalizedEmail, verificationToken)
    } else {
      // Auto-verify when email system is not configured
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
      autoVerified = true
      console.log(`[Auth] Auto-verified ${normalizedEmail} (RESEND_API_KEY not set)`)
    }

    // Send welcome email (best-effort, don't fail registration)
    if (hasEmailSystem && userPlan) {
      await sendWelcomeEmail(normalizedEmail, name, userPlan).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      requiresStripeCheckout,
      selectedPlan: plan || null,
      message: requiresStripeCheckout
        ? 'Konto erstellt. Bitte schließen Sie die Zahlung ab.'
        : autoVerified
          ? 'Konto erstellt. Sie können sich jetzt anmelden.'
          : 'Konto erstellt. Bitte bestätigen Sie Ihre E-Mail-Adresse.',
      autoVerified,
    })
  } catch (error: any) {
    console.error('[Auth] Registration error:', error)
    return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 500 })
  }
}

// GET: Validate an invite code (used by invite page)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const inviteCode = searchParams.get('inviteCode')

  if (!inviteCode) {
    return NextResponse.json({ valid: false, error: 'Kein Code angegeben' })
  }

  const invite = await prisma.inviteLink.findUnique({ where: { code: inviteCode } })

  if (!invite || !invite.active) {
    return NextResponse.json({ valid: false, plan: '', planName: '', error: 'Einladungscode ungültig' })
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, plan: '', planName: '', error: 'Einladungscode ist abgelaufen' })
  }
  if (invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ valid: false, plan: '', planName: '', error: 'Einladungscode wurde bereits verwendet' })
  }

  const planNames: Record<string, string> = { STARTER: 'Starter', PRO: 'Pro', MANAGED: 'Managed' }

  return NextResponse.json({
    valid: true,
    plan: invite.plan,
    planName: planNames[invite.plan] || invite.plan,
  })
}
