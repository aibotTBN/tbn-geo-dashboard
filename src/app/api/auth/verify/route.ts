import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(new URL('/login?error=invalid-verification', request.url))
  }

  try {
    const verification = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    })

    if (!verification) {
      return NextResponse.redirect(new URL('/login?error=invalid-verification', request.url))
    }

    if (verification.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } },
      })
      return NextResponse.redirect(new URL('/login?error=verification-expired', request.url))
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
    return NextResponse.redirect(new URL('/login?verified=true', request.url))
  } catch (error) {
    console.error('[Auth] Verification error:', error)
    return NextResponse.redirect(new URL('/login?error=verification-failed', request.url))
  }
}
