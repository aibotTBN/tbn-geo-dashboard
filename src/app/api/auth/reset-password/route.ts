import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token und Passwort erforderlich' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

    if (!resetToken) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Link' }, { status: 400 })
    }

    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      return NextResponse.json({ error: 'Link ist abgelaufen. Bitte fordern Sie einen neuen an.' }, { status: 400 })
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    })

    // Delete used token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })

    return NextResponse.json({
      success: true,
      message: 'Passwort erfolgreich geändert. Sie können sich jetzt anmelden.',
    })
  } catch (error: any) {
    console.error('[Auth] Password reset error:', error)
    return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 })
  }
}
