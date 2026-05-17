import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    let userPlan: 'STARTER' | 'PRO' | 'MANAGED' = 'STARTER'
    let planExpiry: Date | null = null
    let usedInviteCode: string | null = null

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
      userPlan = plan as 'STARTER' | 'PRO'
      // Note: For paid plans without invite, Stripe checkout will be required after registration
      // For now, we set the plan — Stripe integration will enforce payment later
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

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
        // emailVerified is null until they click the verification link
      },
    })

    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: verificationToken,
        expires: verificationExpiry,
      },
    })

    // TODO: Send verification email via Resend/Mailgun
    // For now, auto-verify in development or log the token
    if (process.env.NODE_ENV !== 'production' || !process.env.EMAIL_FROM) {
      // Auto-verify in development or when email isn't configured
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      })
      console.log(`[Auth] Auto-verified user ${normalizedEmail} (email system not configured)`)
    } else {
      console.log(`[Auth] Verification token for ${normalizedEmail}: ${verificationToken}`)
      // TODO: sendVerificationEmail(normalizedEmail, verificationToken)
    }

    return NextResponse.json({
      success: true,
      message: 'Konto erstellt. Bitte bestätigen Sie Ihre E-Mail-Adresse.',
      autoVerified: process.env.NODE_ENV !== 'production' || !process.env.EMAIL_FROM,
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
