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

export async function queryTable(tableId: number, options: {
  domain?: string
  search?: string
  size?: number
  page?: number
} = {}) {
  const token = await getToken()
  const params = new URLSearchParams({
    user_field_names: 'true',
    size: String(options.size || 100),
    page: String(options.page || 1),
  })
  if (options.search) params.set('search', options.search)

  const resp = await fetch(
    `${BASEROW_URL}/api/database/rows/table/${tableId}/?${params}`,
    { headers: { Authorization: `JWT ${token}` }, next: { revalidate: 60 } }
  )
  if (!resp.ok) throw new Error(`Baserow query failed: ${resp.status}`)
  const data = await resp.json()

  let rows = data.results || []
  if (options.domain) {
    rows = rows.filter((r: any) => (r.project_domain || '').includes(options.domain!))
  }

  return { rows, count: data.count, totalPages: Math.ceil(data.count / (options.size || 100)) }
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

export async function getEntityCounts(domain: string) {
  const counts: Record<string, number> = {}
  for (const type of ENTITY_TYPES) {
    const { rows } = await queryTable(type.tableId, { domain, size: 1 })
    // Use count from filtered results
    const allData = await queryTable(type.tableId, { domain })
    counts[type.key] = allData.rows.length
  }
  return counts
}
