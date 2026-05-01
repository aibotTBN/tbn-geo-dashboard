import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { triggerKnowledgeBuilder } from '@/lib/n8n'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { domain } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    const result = await triggerKnowledgeBuilder(domain)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Knowledge Builder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
