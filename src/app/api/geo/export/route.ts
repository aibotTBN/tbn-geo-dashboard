import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryTable, ENTITY_TYPES, TABLE_IDS } from '@/lib/baserow'

/**
 * Fetch ALL rows for a domain+table, paginating if needed.
 * Only includes Approved entries and deduplicates by name.
 */
async function fetchAllRows(tableId: number, domain: string): Promise<any[]> {
  const allRows: any[] = []
  let page = 1
  while (true) {
    const { rows, totalPages } = await queryTable(tableId, { domain, size: 200, page })
    allRows.push(...rows)
    if (page >= totalPages) break
    page++
  }
  // Filter out rejected
  const filtered = allRows.filter((r) => r.status?.value === 'Approved')
  // Deduplicate by normalized name
  const seen = new Set<string>()
  return filtered.filter((r) => {
    const name = (r.name || r.question || r.title || r.organization_name || r.metric_name || '').trim().toLowerCase()
    if (!name || seen.has(name)) return false
    seen.add(name)
    return true
  })
}

// GET: Generate llms.txt, mcp.json, schema.org, or skills.md for a domain
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const format = searchParams.get('format') || 'llms.txt'

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    if (format === 'schema.org') {
      return await generateSchemaOrg(domain)
    }

    if (format === 'skills.md') {
      return await generateSkillsMd(domain)
    }

    if (format === 'mcp.json') {
      const mcpConfig = {
        schema_version: '1.0',
        server_name: `${domain} Knowledge Server`,
        server_description: `Structured knowledge about ${domain}`,
        url: `https://aibot.tbnpr.net/webhook/geo-knowledge`,
        tools: [
          { name: 'get_company_info', description: `Get company info for ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_services', description: `Get services offered by ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_faq', description: `Get FAQ from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_team', description: `Get team members from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_blog_posts', description: `Get blog posts from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_case_studies', description: `Get case studies from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_statistics', description: `Get statistics from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'get_events', description: `Get events from ${domain}`, parameters: { domain: { type: 'string', default: domain } } },
          { name: 'search_knowledge', description: `Search knowledge base of ${domain}`, parameters: { domain: { type: 'string', default: domain }, query: { type: 'string' } } },
        ],
      }
      return NextResponse.json(mcpConfig)
    }

    // Generate llms.txt — full, deduplicated, no truncation
    const lines: string[] = [
      `# ${domain}`,
      `> Structured knowledge for LLM consumption`,
      ``,
      `## Knowledge API`,
      `Base URL: https://aibot.tbnpr.net/webhook/geo-knowledge`,
      ``,
    ]

    for (const type of ENTITY_TYPES) {
      const rows = await fetchAllRows(type.tableId, domain)
      if (rows.length === 0) continue
      lines.push(`## ${type.label} (${rows.length})`)
      for (const row of rows) {
        const name = row.name || row.question || row.title || row.organization_name || row.metric_name || ''
        if (!name) continue
        // Add description/answer for richer context
        const desc = row.description || row.answer || row.summary || ''
        if (desc) {
          const short = desc.length > 200 ? desc.slice(0, 200).trim() + '…' : desc
          lines.push(`- **${name}**: ${short}`)
        } else {
          lines.push(`- ${name}`)
        }
      }
      lines.push('')
    }

    return new NextResponse(lines.join('\n'), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── Schema.org JSON-LD Generator ────────────────────────────────────────────

async function generateSchemaOrg(domain: string) {
  // Fetch all data in parallel — deduplicated, rejected filtered
  const [orgs, services, persons, allFaqs, posts, cases, events, products] =
    await Promise.all([
      fetchAllRows(TABLE_IDS.geo_organizations, domain),
      fetchAllRows(TABLE_IDS.geo_services, domain),
      fetchAllRows(TABLE_IDS.geo_persons, domain),
      fetchAllRows(TABLE_IDS.geo_faq, domain),
      fetchAllRows(TABLE_IDS.geo_blog_posts, domain),
      fetchAllRows(TABLE_IDS.geo_case_studies, domain),
      fetchAllRows(TABLE_IDS.geo_events, domain),
      fetchAllRows(TABLE_IDS.geo_products, domain),
    ])

  const schemas: any[] = []
  const org = orgs[0] // Primary organization

  // ── 1. Organization — consolidated with nested services, employees, products ──
  if (org) {
    const orgSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name || org.Name || domain,
    }
    if (org.legal_name) orgSchema.legalName = org.legal_name
    if (org.description) orgSchema.description = org.description
    if (org.website) orgSchema.url = org.website
    if (org.email) orgSchema.email = org.email
    if (org.phone) orgSchema.telephone = org.phone
    if (org.location) {
      orgSchema.address = { '@type': 'PostalAddress', addressLocality: org.location }
    }
    if (org.founding_year) orgSchema.foundingDate = String(org.founding_year)
    if (org.team_size) orgSchema.numberOfEmployees = { '@type': 'QuantitativeValue', value: org.team_size }
    if (org.awards) {
      orgSchema.award = org.awards.split(/[,;\n]/).map((a: string) => a.trim()).filter(Boolean)
    }

    // Nest services as makesOffer (compact: name + short description)
    if (services.length > 0) {
      orgSchema.makesOffer = services.map((svc) => {
        const offer: any = {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: svc.name || svc.Name,
          },
        }
        if (svc.description) {
          offer.itemOffered.description = svc.description.length > 160
            ? svc.description.slice(0, 160).trim() + '…'
            : svc.description
        }
        if (svc.category) offer.itemOffered.category = svc.category
        return offer
      })
    }

    // Nest persons as employee (compact)
    if (persons.length > 0) {
      orgSchema.employee = persons.map((p) => {
        const person: any = { '@type': 'Person', name: p.name || p.Name }
        if (p.role) person.jobTitle = p.role
        if (p.expertise) {
          person.knowsAbout = p.expertise.split(/[,;\n]/).map((e: string) => e.trim()).filter(Boolean)
        }
        return person
      })
    }

    // Nest products (compact)
    if (products.length > 0) {
      orgSchema.owns = products.map((prod) => {
        const p: any = { '@type': 'Product', name: prod.name || prod.Name }
        if (prod.description) {
          p.description = prod.description.length > 160
            ? prod.description.slice(0, 160).trim() + '…'
            : prod.description
        }
        return p
      })
    }

    // Nest events (compact)
    if (events.length > 0) {
      orgSchema.event = events.map((evt) => {
        const e: any = { '@type': 'Event', name: evt.name || evt.Name }
        if (evt.event_date) e.startDate = evt.event_date
        if (evt.location) e.location = { '@type': 'Place', name: evt.location }
        return e
      })
    }

    schemas.push(orgSchema)
  }

  // ── 2. FAQPage — kept separate (Google requires standalone FAQPage schema) ──
  const approvedFaqs = allFaqs.filter((f: any) => f.question && f.answer)
  if (approvedFaqs.length > 0) {
    // Limit to 25 most important FAQs to keep size reasonable
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: approvedFaqs.slice(0, 25).map((faq: any) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }

  // ── 3. Articles — top 10 blog posts + top 5 case studies (compact) ──
  for (const post of posts.slice(0, 10)) {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title || post.Name,
    }
    if (post.summary) schema.description = post.summary
    if (post.publish_date) schema.datePublished = post.publish_date
    if (post.author) schema.author = { '@type': 'Person', name: post.author }
    if (post.keywords) {
      schema.keywords = post.keywords.split(/[,;\n]/).map((k: string) => k.trim()).filter(Boolean)
    }
    if (post.source_url) schema.url = post.source_url
    // Omit articleBody to keep size small — description is enough for schema
    schemas.push(schema)
  }

  for (const cs of cases.slice(0, 5)) {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@additionalType': 'CaseStudy',
      headline: cs.title || cs.Name,
    }
    const parts: string[] = []
    if (cs.challenge) parts.push(`Challenge: ${cs.challenge}`)
    if (cs.solution) parts.push(`Solution: ${cs.solution}`)
    if (cs.results) parts.push(`Results: ${cs.results}`)
    if (parts.length > 0) {
      const desc = parts.join(' | ')
      schema.description = desc.length > 300 ? desc.slice(0, 300).trim() + '…' : desc
    }
    if (cs.source_url) schema.url = cs.source_url
    schemas.push(schema)
  }

  // Build summary
  const summary: Record<string, number> = {}
  for (const s of schemas) {
    const type = s['@type']
    summary[type] = (summary[type] || 0) + 1
  }

  // Generate compact JSON (no pretty-print for embed code — saves ~40% size)
  const compactJson = JSON.stringify(schemas)

  return NextResponse.json({
    domain,
    generated: new Date().toISOString(),
    summary,
    totalSchemas: schemas.length,
    estimatedSize: `${Math.round(compactJson.length / 1024)} KB`,
    schemas,
    // Ready-to-embed: compact JSON, place before </body> (NOT in <head>!)
    embedCode: `<!-- Place before </body>, NOT in <head> -->\n<script type="application/ld+json">${compactJson}</script>`,
    embedCodePretty: `<script type="application/ld+json">\n${JSON.stringify(schemas, null, 2)}\n</script>`,
  })
}

// ─── skills.md Auto-Generator ────────────────────────────────────────────────

async function generateSkillsMd(domain: string) {
  // Fetch all entity types in parallel — deduplicated, rejected filtered
  const [orgs, services, persons, faqs, posts, cases, events, products, stats] =
    await Promise.all([
      fetchAllRows(TABLE_IDS.geo_organizations, domain),
      fetchAllRows(TABLE_IDS.geo_services, domain),
      fetchAllRows(TABLE_IDS.geo_persons, domain),
      fetchAllRows(TABLE_IDS.geo_faq, domain),
      fetchAllRows(TABLE_IDS.geo_blog_posts, domain),
      fetchAllRows(TABLE_IDS.geo_case_studies, domain),
      fetchAllRows(TABLE_IDS.geo_events, domain),
      fetchAllRows(TABLE_IDS.geo_products, domain),
      fetchAllRows(TABLE_IDS.geo_statistics, domain),
    ])

  const lines: string[] = []
  const org = orgs[0] // Primary organization

  // Header
  lines.push(`# ${org?.name || domain}`)
  lines.push('')
  if (org?.description) {
    lines.push(`> ${org.description.split('\n')[0]}`)
    lines.push('')
  }

  // Organization info
  if (org) {
    lines.push('## About')
    lines.push('')
    if (org.description) lines.push(org.description)
    lines.push('')
    if (org.location) lines.push(`- **Location:** ${org.location}`)
    if (org.founding_year) lines.push(`- **Founded:** ${org.founding_year}`)
    if (org.team_size) lines.push(`- **Team size:** ${org.team_size}`)
    if (org.website) lines.push(`- **Website:** ${org.website}`)
    if (org.email) lines.push(`- **Contact:** ${org.email}`)
    if (org.phone) lines.push(`- **Phone:** ${org.phone}`)
    lines.push('')
    if (org.usps) {
      lines.push('### Unique Selling Points')
      lines.push('')
      lines.push(org.usps)
      lines.push('')
    }
    if (org.target_audience) {
      lines.push(`**Target Audience:** ${org.target_audience}`)
      lines.push('')
    }
    if (org.certifications) {
      lines.push(`**Certifications:** ${org.certifications}`)
      lines.push('')
    }
    if (org.awards) {
      lines.push(`**Awards:** ${org.awards}`)
      lines.push('')
    }
  }

  // Services
  if (services.length > 0) {
    lines.push('## Services')
    lines.push('')
    lines.push(`${org?.name || domain} offers the following services:`)
    lines.push('')
    for (const svc of services) {
      lines.push(`### ${svc.name || svc.Name}`)
      if (svc.description) lines.push(svc.description)
      if (svc.benefits) lines.push(`\n**Benefits:** ${svc.benefits}`)
      if (svc.target_audience) lines.push(`**For:** ${svc.target_audience}`)
      if (svc.delivery_format) lines.push(`**Delivery:** ${svc.delivery_format}`)
      lines.push('')
    }
  }

  // Products
  if (products.length > 0) {
    lines.push('## Products')
    lines.push('')
    for (const prod of products) {
      lines.push(`### ${prod.name || prod.Name}`)
      if (prod.description) lines.push(prod.description)
      if (prod.features) lines.push(`\n**Features:** ${prod.features}`)
      if (prod.pricing) lines.push(`**Pricing:** ${prod.pricing}`)
      lines.push('')
    }
  }

  // Team
  if (persons.length > 0) {
    lines.push('## Team')
    lines.push('')
    for (const person of persons) {
      const name = person.name || person.Name
      const role = person.role ? ` — ${person.role}` : ''
      lines.push(`### ${name}${role}`)
      if (person.bio) lines.push(person.bio)
      if (person.expertise) lines.push(`\n**Expertise:** ${person.expertise}`)
      if (person.speaking_topics) lines.push(`**Speaking Topics:** ${person.speaking_topics}`)
      lines.push('')
    }
  }

  // FAQ
  if (faqs.length > 0) {
    lines.push('## Frequently Asked Questions')
    lines.push('')
    for (const faq of faqs) {
      if (faq.question && faq.answer) {
        lines.push(`**Q: ${faq.question}**`)
        lines.push(`A: ${faq.answer}`)
        lines.push('')
      }
    }
  }

  // Case Studies
  if (cases.length > 0) {
    lines.push('## Case Studies')
    lines.push('')
    for (const cs of cases) {
      lines.push(`### ${cs.title || cs.Name}`)
      if (cs.client_name) lines.push(`**Client:** ${cs.client_name} (${cs.client_industry || 'various'})`)
      if (cs.challenge) lines.push(`**Challenge:** ${cs.challenge}`)
      if (cs.solution) lines.push(`**Solution:** ${cs.solution}`)
      if (cs.results) lines.push(`**Results:** ${cs.results}`)
      if (cs.metrics) lines.push(`**Key Metrics:** ${cs.metrics}`)
      lines.push('')
    }
  }

  // Statistics
  if (stats.length > 0) {
    lines.push('## Key Facts & Figures')
    lines.push('')
    for (const stat of stats) {
      const unit = stat.unit ? ` ${stat.unit}` : ''
      lines.push(`- **${stat.metric_name}:** ${stat.value}${unit}`)
      if (stat.context) lines.push(`  ${stat.context}`)
    }
    lines.push('')
  }

  // Blog / Content
  if (posts.length > 0) {
    lines.push('## Recent Content')
    lines.push('')
    for (const post of posts.slice(0, 20)) {
      const date = post.publish_date ? ` (${post.publish_date})` : ''
      lines.push(`### ${post.title || post.Name}${date}`)
      if (post.summary) lines.push(post.summary)
      if (post.source_url) lines.push(`[Read more](${post.source_url})`)
      lines.push('')
    }
  }

  // Events
  if (events.length > 0) {
    lines.push('## Events')
    lines.push('')
    for (const evt of events) {
      const date = evt.event_date ? ` — ${evt.event_date}` : ''
      lines.push(`### ${evt.name || evt.Name}${date}`)
      if (evt.description) lines.push(evt.description)
      if (evt.location) lines.push(`**Location:** ${evt.location}`)
      lines.push('')
    }
  }

  // Footer
  lines.push('---')
  lines.push(`*Generated by LLM Radar for ${domain} — ${new Date().toISOString().split('T')[0]}*`)
  lines.push(`*For machine-readable data, see /.well-known/mcp.json*`)

  const content = lines.join('\n')
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
