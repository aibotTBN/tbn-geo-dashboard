import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/geo/projects/[domain]/monitoring
export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params

  const project = await prisma.project.findUnique({
    where: { domain },
    select: {
      monitoringEnabled: true,
      monitoringInterval: true,
      lastDiagnoseAt: true,
      alertThreshold: true,
      alertEmail: true,
      alertSlack: true,
    }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

// PUT /api/geo/projects/[domain]/monitoring
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params
  const body = await request.json()

  const project = await prisma.project.findUnique({ where: { domain } })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const updated = await prisma.project.update({
    where: { domain },
    data: {
      monitoringEnabled: body.monitoringEnabled ?? project.monitoringEnabled,
      monitoringInterval: body.monitoringInterval ?? project.monitoringInterval,
      alertThreshold: body.alertThreshold ?? project.alertThreshold,
      alertEmail: body.alertEmail !== undefined ? body.alertEmail : project.alertEmail,
      alertSlack: body.alertSlack ?? project.alertSlack,
    },
    select: {
      monitoringEnabled: true,
      monitoringInterval: true,
      lastDiagnoseAt: true,
      alertThreshold: true,
      alertEmail: true,
      alertSlack: true,
    }
  })

  return NextResponse.json(updated)
}
