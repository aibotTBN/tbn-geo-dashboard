import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { triggerKnowledgeBuilder } from '@/lib/n8n'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { domain, maxPages, offset } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // Get project to read industry/core topics
    const project = await prisma.project.findUnique({ where: { domain } })

    const result = await triggerKnowledgeBuilder(domain, {
      brandName: project?.name || domain,
      industry: project?.industry || 'B2B',
      coreTopics: project?.coreTopics || '',
      maxPages: maxPages || 25,
      offset: offset || project?.pagesCrawled || 0,
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Knowledge Builder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
