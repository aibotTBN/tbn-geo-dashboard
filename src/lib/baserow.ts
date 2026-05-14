/**
 * Baserow API client for the GEO Knowledge Database.
 * Tables are in the "GEO Knowledge" database (DB 261) on brain.tbnpr.net.
 */

const BASEROW_URL = process.env.BASEROW_URL || 'https://brain.tbnpr.net'
const BASEROW_EMAIL = process.env.BASEROW_EMAIL || ''
const BASEROW_PASSWORD = process.env.BASEROW_PASSWORD || ''

export const TABLE_IDS = {
  geo_projects: 909,
  geo_organizations: 910,
  geo_services: 911,
  geo_persons: 912,
  geo_faq: 913,
  geo_case_studies: 914,
  geo_blog_posts: 915,
  geo_events: 916,
  geo_products: 917,
  geo_testimonials: 918,
  geo_statistics: 919,
} as const

export const ENTITY_TYPES = [
  { key: 'geo_organizations', label: 'Organisationen', tableId: 910, icon: 'Building2' },
  { key: 'geo_services', label: 'Services', tableId: 911, icon: 'Briefcase' },
  { key: 'geo_faq', label: 'FAQ', tableId: 913, icon: 'HelpCircle' },
  { key: 'geo_persons', label: 'Personen', tableId: 912, icon: 'Users' },
  { key: 'geo_blog_posts', label: 'Blog Posts', tableId: 915, icon: 'FileText' },
  { key: 'geo_case_studies', label: 'Case Studies', tableId: 914, icon: 'Trophy' },
  { key: 'geo_statistics', label: 'Statistiken', tableId: 919, icon: 'BarChart3' },
  { key: 'geo_events', label: 'Events', tableId: 916, icon: 'Calendar' },
] as const

let cachedToken: { token: string; expires: number } | null = null

// Cache field IDs per table to enable server-side filtering
const fieldIdCache: Record<number, Record<string, number>> = {}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token
  }
  const resp = await fetch(`${BASEROW_URL}/api/user/token-auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: BASEROW_EMAIL, password: BASEROW_PASSWORD }),
  })
  if (!resp.ok) throw new Error(`Baserow auth failed: ${resp.status}`)
  const data = await resp.json()
  cachedToken = { token: data.token, expires: Date.now() + 9 * 60 * 1000 } // 9min cache
  return data.token
}

/**
 * Get field IDs for a table (cached). Needed for server-side filtering.
 */
async function getFieldIds(tableId: number): Promise<Record<string, number>> {
  if (fieldIdCache[tableId]) return fieldIdCache[tableId]
  const token = await getToken()
  const resp = await fetch(`${BASEROW_URL}/api/database/fields/table/${tableId}/`, {
    headers: { Authorization: `JWT ${token}` },
  })
  if (!resp.ok) return {}
  const fields = await resp.json()
  const map: Record<string, number> = {}
  for (const f of fields) {
    map[f.name] = f.id
  }
  fieldIdCache[tableId] = map
  return map
}

export async function queryTable(tableId: number, options: {
  domain?: string
  search?: string
  size?: number
  page?: number
} = {}) {
  const token = await getToken()
  const params = new URLSearchParams({
    user_field_names: 'true',
    size: String(options.size || 200),
    page: String(options.page || 1),
  })
  if (options.search) params.set('search', options.search)

  // Use server-side filtering for domain (fixes pagination bug)
  if (options.domain) {
    const fieldIds = await getFieldIds(tableId)
    const pdFieldId = fieldIds['project_domain']
    if (pdFieldId) {
      params.set(`filter__field_${pdFieldId}__equal`, options.domain)
    }
  }

  const resp = await fetch(
    `${BASEROW_URL}/api/database/rows/table/${tableId}/?${params}`,
    { headers: { Authorization: `JWT ${token}` }, cache: 'no-store' }
  )
  if (!resp.ok) throw new Error(`Baserow query failed: ${resp.status}`)
  const data = await resp.json()

  let rows = data.results || []

  // Fallback: if no project_domain field exists, use client-side filter
  if (options.domain) {
    const fieldIds = await getFieldIds(tableId)
    if (!fieldIds['project_domain']) {
      rows = rows.filter((r: any) => (r.project_domain || '').includes(options.domain!))
    }
  }

  return { rows, count: data.count, totalPages: Math.ceil(data.count / (options.size || 200)) }
}

export async function updateRow(tableId: number, rowId: number, fields: Record<string, any>) {
  const token = await getToken()
  const resp = await fetch(
    `${BASEROW_URL}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`,
    {
      method: 'PATCH',
      headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }
  )
  if (!resp.ok) throw new Error(`Baserow update failed: ${resp.status}`)
  return resp.json()
}

export async function createRow(tableId: number, fields: Record<string, any>) {
  const token = await getToken()
  const resp = await fetch(
    `${BASEROW_URL}/api/database/rows/table/${tableId}/?user_field_names=true`,
    {
      method: 'POST',
      headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }
  )
  if (!resp.ok) throw new Error(`Baserow create failed: ${resp.status}`)
  return resp.json()
}

export async function deleteRow(tableId: number, rowId: number) {
  const token = await getToken()
  const resp = await fetch(
    `${BASEROW_URL}/api/database/rows/table/${tableId}/${rowId}/`,
    {
      method: 'DELETE',
      headers: { Authorization: `JWT ${token}` },
    }
  )
  if (!resp.ok) throw new Error(`Baserow delete failed: ${resp.status}`)
  return { success: true }
}

export async function getEntityCounts(domain: string) {
  const counts: Record<string, number> = {}
  for (const type of ENTITY_TYPES) {
    const { count } = await queryTable(type.tableId, { domain, size: 1 })
    counts[type.key] = count
  }
  return counts
}

/**
 * Delete ALL knowledge base rows for a given domain across all entity tables.
 * Used for cascade-deleting when a project is removed.
 */
export async function deleteAllByDomain(domain: string): Promise<{ deleted: number }> {
  const token = await getToken()
  let totalDeleted = 0

  // Get the field ID for 'project_domain' once per table, then batch-delete matching rows
  for (const type of ENTITY_TYPES) {
    const tableId = type.tableId

    // 1. Get field IDs for this table to find the project_domain field
    const fieldsResp = await fetch(
      `${BASEROW_URL}/api/database/fields/table/${tableId}/`,
      { headers: { Authorization: `JWT ${token}` } }
    )
    if (!fieldsResp.ok) continue
    const fields = await fieldsResp.json()
    const pdField = fields.find((f: any) => f.name === 'project_domain')
    if (!pdField) continue

    // 2. Fetch all matching row IDs (paginate if needed)
    const rowIds: number[] = []
    let page = 1
    while (true) {
      const params = new URLSearchParams({
        [`filter__field_${pdField.id}__equal`]: domain,
        size: '200',
        page: String(page),
        include: `field_${pdField.id}`,
      })
      const resp = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${tableId}/?${params}`,
        { headers: { Authorization: `JWT ${token}` } }
      )
      if (!resp.ok) break
      const data = await resp.json()
      for (const row of data.results || []) {
        rowIds.push(row.id)
      }
      if (!data.next) break
      page++
    }

    if (rowIds.length === 0) continue

    // 3. Batch-delete all rows at once
    const delResp = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${tableId}/batch-delete/`,
      {
        method: 'POST',
        headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rowIds }),
      }
    )
    if (delResp.ok) {
      totalDeleted += rowIds.length
    }
  }

  // Also clean up the geo_projects table (909)
  const projFieldsResp = await fetch(
    `${BASEROW_URL}/api/database/fields/table/909/`,
    { headers: { Authorization: `JWT ${token}` } }
  )
  if (projFieldsResp.ok) {
    const projFields = await projFieldsResp.json()
    const domainField = projFields.find((f: any) => f.name === 'domain')
    if (domainField) {
      const params = new URLSearchParams({
        [`filter__field_${domainField.id}__equal`]: domain,
        size: '50',
      })
      const resp = await fetch(
        `${BASEROW_URL}/api/database/rows/table/909/?${params}`,
        { headers: { Authorization: `JWT ${token}` } }
      )
      if (resp.ok) {
        const data = await resp.json()
        const ids = (data.results || []).map((r: any) => r.id)
        if (ids.length > 0) {
          await fetch(`${BASEROW_URL}/api/database/rows/table/909/batch-delete/`, {
            method: 'POST',
            headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: ids }),
          })
          totalDeleted += ids.length
        }
      }
    }
  }

  return { deleted: totalDeleted }
}
