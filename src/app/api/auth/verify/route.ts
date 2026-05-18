import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function redirectUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL || 'https://llmradar.de'
  return `${base}${path}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(redirectUrl('/login?error=invalid-verification'))
  }

  try {
    const verification = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    })

    if (!verification) {
      return NextResponse.redirect(redirectUrl('/login?error=invalid-verification'))
    }

    if (verification.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } },
      })
      return NextResponse.redirect(redirectUrl('/login?error=verification-expired'))
    }

    // Verify the user
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    })

    // Clean up token
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    })

    console.log(`[Auth] Email verified: ${email}`)

    // Redirect to login with success
    return NextResponse.redirect(redirectUrl('/login?verified=true'))
  } catch (error) {
    console.error('[Auth] Verification error:', error)
    return NextResponse.redirect(redirectUrl('/login?error=verification-failed'))
  }
}
