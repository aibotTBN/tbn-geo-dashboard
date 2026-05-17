import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteAllByDomain } from '@/lib/baserow'
import { canCreateProject } from '@/lib/plan-limits'

// Helper: Get user's plan and role from session
function getUserInfo(session: any) {
  return {
    id: session.user?.id as string,
    role: session.user?.role as string,
    plan: session.user?.plan as string | null,
  }
}

// DELETE: Remove a project and all related data (diagnoses + knowledge base)
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = getUserInfo(session)
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // Verify ownership (TBN_STAFF/ADMIN can delete any project)
    if (user.role !== 'TBN_STAFF' && user.role !== 'ADMIN') {
      const project = await prisma.project.findUnique({ where: { domain } })
      if (project?.userId && project.userId !== user.id) {
        return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
      }
    }

    // 1. Cascade delete all Baserow knowledge base entries for this domain
    const baserowResult = await deleteAllByDomain(domain)

    // 2. Delete Prisma project (diagnoses auto-cascade via onDelete: Cascade)
    await prisma.project.delete({ where: { domain } })

    return NextResponse.json({
      success: true,
      message: `Projekt ${domain} vollständig gelöscht`,
      knowledgeRowsDeleted: baserowResult.deleted,
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: List projects (filtered by user ownership, TBN/Admin see all)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = getUserInfo(session)

  // TBN staff and admins see all projects
  const where = user.role === 'TBN_STAFF' || user.role === 'ADMIN'
    ? {}
    : { userId: user.id }

  const projects = await prisma.project.findMany({
    where,
    include: {
      diagnoses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(projects)
}

// POST: Create new project
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = getUserInfo(session)

  // Check plan limits for project creation
  if (user.role !== 'TBN_STAFF' && user.role !== 'ADMIN') {
    const projectCount = await prisma.project.count({ where: { userId: user.id } })
    if (!canCreateProject(user.plan as any, user.role, projectCount)) {
      return NextResponse.json(
        { error: 'Projekt-Limit erreicht. Bitte upgraden Sie Ihren Plan.' },
        { status: 403 }
      )
    }
  }

  const body = await request.json()
  const { domain, name, description, industry, coreTopics } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    const project = await prisma.project.create({
      data: {
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        name: name || domain,
        description,
        industry: industry || undefined,
        coreTopics: coreTopics || undefined,
        userId: user.id, // Link project to user
      },
    })
    return NextResponse.json(project)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Domain existiert bereits' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Update project fields (industry, coreTopics, name, etc.)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = getUserInfo(session)
  const body = await request.json()
  const { domain, name, description, industry, coreTopics, pagesCrawled } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  // Verify ownership
  if (user.role !== 'TBN_STAFF' && user.role !== 'ADMIN') {
    const project = await prisma.project.findUnique({ where: { domain } })
    if (project?.userId && project.userId !== user.id) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }
  }

  try {
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (industry !== undefined) updateData.industry = industry
    if (coreTopics !== undefined) updateData.coreTopics = coreTopics
    if (pagesCrawled !== undefined) updateData.pagesCrawled = pagesCrawled

    const project = await prisma.project.update({
      where: { domain },
      data: updateData,
    })
    return NextResponse.json(project)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
