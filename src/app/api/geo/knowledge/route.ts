import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryTable, updateRow, createRow, deleteRow, ENTITY_TYPES } from '@/lib/baserow'

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
      size: 200,
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new entity
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, fields } = body

  if (!type || !fields) {
    return NextResponse.json({ error: 'Missing type or fields' }, { status: 400 })
  }

  const entityType = ENTITY_TYPES.find((t) => t.key === type)
  if (!entityType) return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })

  try {
    // Set default status to Draft for new entities
    const fieldsWithDefaults = {
      status: 'Draft',
      ...fields,
    }
    const result = await createRow(entityType.tableId, fieldsWithDefaults)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Update entity fields (status, name, description, etc.)
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, rowId, fields, status } = body

  if (!type || !rowId) {
    return NextResponse.json({ error: 'Missing type or rowId' }, { status: 400 })
  }

  const entityType = ENTITY_TYPES.find((t) => t.key === type)
  if (!entityType) return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })

  // Support both old format (status field) and new format (fields object)
  const updateFields = fields || (status ? { status } : null)
  if (!updateFields) {
    return NextResponse.json({ error: 'Missing fields to update' }, { status: 400 })
  }

  try {
    const result = await updateRow(entityType.tableId, rowId, updateFields)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Delete an entity
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const rowId = searchParams.get('rowId')

  if (!type || !rowId) {
    return NextResponse.json({ error: 'Missing type or rowId' }, { status: 400 })
  }

  const entityType = ENTITY_TYPES.find((t) => t.key === type)
  if (!entityType) return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })

  try {
    await deleteRow(entityType.tableId, parseInt(rowId))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
