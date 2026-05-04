import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE: Remove a project and all related data (diagnoses cascade)
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // Cascade delete: Diagnosis rows are auto-deleted via onDelete: Cascade
    await prisma.project.delete({ where: { domain } })
    return NextResponse.json({ success: true, message: `Projekt ${domain} vollständig gelöscht` })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: List all projects with latest diagnosis
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
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

  const body = await request.json()
  const { domain, name, description, industry, coreTopics, pagesCrawled } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

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
