import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (user && user.passwordHash) {
      // Only allow reset for credential-based accounts (not Google OAuth)
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } })

      // Create new token
      await prisma.passwordResetToken.create({
        data: { email: normalizedEmail, token, expires },
      })

      // TODO: Send email with reset link
      // const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
      // await sendPasswordResetEmail(normalizedEmail, resetUrl)

      console.log(`[Auth] Password reset token for ${normalizedEmail}: ${token}`)
    }

    // Always return success (privacy)
    return NextResponse.json({
      success: true,
      message: 'Falls ein Konto mit dieser E-Mail existiert, erhalten Sie eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.',
    })
  } catch (error: any) {
    console.error('[Auth] Password reset request error:', error)
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 })
  }
}
