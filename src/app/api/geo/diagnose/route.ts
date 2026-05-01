import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { triggerDiagnose } from '@/lib/n8n'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { domain, companyName, industry } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // Ensure project exists
    const project = await prisma.project.upsert({
      where: { domain },
      update: { updatedAt: new Date() },
      create: { domain, name: companyName || domain },
    })

    // Trigger n8n diagnosis workflow
    const result = await triggerDiagnose(domain, companyName, industry)

    // If result includes a score, save it
    if (result?.geo_score !== undefined) {
      await prisma.diagnosis.create({
        data: {
          projectId: project.id,
          score: result.geo_score || 0,
          scoreCitation: result.score_citation || 0,
          scoreTech: result.score_tech || 0,
          scoreSchema: result.score_schema || 0,
          scoreContent: result.score_content || 0,
          scoreFresh: result.score_fresh || 0,
          reportJson: JSON.stringify(result),
        },
      })
    }

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Diagnose error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
