import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const role = (session.user as any)?.role
  if (role !== 'ADMIN' && role !== 'TBN_STAFF') return null
  return session
}

// GET: List all invite links
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const invites = await prisma.inviteLink.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(invites)
}

// POST: Create new invite link
export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const body = await request.json()
  const { plan, maxUses, expiresInDays, note, customCode } = body

  if (!plan || !['STARTER', 'PRO', 'MANAGED'].includes(plan)) {
    return NextResponse.json({ error: 'Gültiger Plan erforderlich (STARTER, PRO, MANAGED)' }, { status: 400 })
  }

  // Generate code: custom or auto-generated
  const code = customCode || `${plan}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

  // Check uniqueness
  const existing = await prisma.inviteLink.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: 'Code existiert bereits' }, { status: 409 })
  }

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const invite = await prisma.inviteLink.create({
    data: {
      code,
      plan,
      maxUses: maxUses || 1,
      expiresAt,
      note: note || null,
      createdBy: (session.user as any).id,
    },
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL || 'https://llmradar.de'}/invite/${invite.code}`

  return NextResponse.json({ ...invite, inviteUrl })
}

// PATCH: Toggle active state
export async function PATCH(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const body = await request.json()
  const { id, active } = body

  if (!id) return NextResponse.json({ error: 'Invite-ID erforderlich' }, { status: 400 })

  const invite = await prisma.inviteLink.update({
    where: { id },
    data: { active: active ?? false },
  })

  return NextResponse.json(invite)
}

// DELETE: Remove invite link
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Invite-ID erforderlich' }, { status: 400 })

  await prisma.inviteLink.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
