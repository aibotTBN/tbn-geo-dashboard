import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryTable, updateRow, ENTITY_TYPES, TABLE_IDS } from '@/lib/baserow'

// GET: Query entities by type and domain
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'geo_organizations'
  const domain = searchParams.get('domain')
  const search = searchParams.get('search') || undefined
  const page = parseInt(searchParams.get('page') || '1')

  const entityType = ENTITY_TYPES.find((t) => t.key === type)
  if (!entityType) return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })

  try {
    const result = await queryTable(entityType.tableId, {
      domain: domain || undefined,
      search,
      page,
      size: 50,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Update entity status (approve/reject)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, rowId, status } = body

  if (!type || !rowId || !status) {
    return NextResponse.json({ error: 'Missing type, rowId, or status' }, { status: 400 })
  }

  const entityType = ENTITY_TYPES.find((t) => t.key === type)
  if (!entityType) return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })

  try {
    const result = await updateRow(entityType.tableId, rowId, { status })
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
