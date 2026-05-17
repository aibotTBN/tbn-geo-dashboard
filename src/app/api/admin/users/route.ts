import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper to check admin/TBN_STAFF access
async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const role = (session.user as any)?.role
  if (role !== 'ADMIN' && role !== 'TBN_STAFF') return null
  return session
}

// GET: List all users with their project counts
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      planExpiresAt: true,
      inviteCode: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

// PATCH: Update user role or plan
export async function PATCH(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const body = await request.json()
  const { userId, role, plan, planExpiresAt } = body

  if (!userId) return NextResponse.json({ error: 'userId erforderlich' }, { status: 400 })

  // Only ADMIN can change roles to ADMIN
  const currentRole = (session.user as any)?.role
  if (role === 'ADMIN' && currentRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Nur Admins können Admin-Rolle vergeben' }, { status: 403 })
  }

  const updateData: any = {}
  if (role) updateData.role = role
  if (plan !== undefined) updateData.plan = plan
  if (planExpiresAt !== undefined) {
    updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      planExpiresAt: true,
    },
  })

  return NextResponse.json(user)
}

// DELETE: Remove a user and their data
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId erforderlich' }, { status: 400 })

  // Prevent self-deletion
  if (userId === (session.user as any)?.id) {
    return NextResponse.json({ error: 'Eigenen Account nicht löschbar' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ success: true, message: 'Benutzer gelöscht' })
}
