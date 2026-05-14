import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get competitor list for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain: rawDomain } = await params
  const domain = decodeURIComponent(rawDomain)
  const project = await prisma.project.findUnique({ where: { domain } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  let competitors: string[] = []
  if (project.competitors) {
    try {
      competitors = JSON.parse(project.competitors)
    } catch {
      competitors = []
    }
  }

  return NextResponse.json({ domain, competitors })
}

// PUT: Update competitor list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain: rawDomain } = await params
  const domain = decodeURIComponent(rawDomain)
  const body = await request.json()
  const { competitors } = body

  if (!Array.isArray(competitors)) {
    return NextResponse.json({ error: 'competitors must be an array' }, { status: 400 })
  }

  // Validate and clean competitor domains
  const cleaned = competitors
    .map((c: string) => c.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))
    .filter((c: string) => c.length > 0 && c !== domain)

  const project = await prisma.project.update({
    where: { domain },
    data: { competitors: JSON.stringify(cleaned) },
  })

  return NextResponse.json({ domain, competitors: cleaned })
}
