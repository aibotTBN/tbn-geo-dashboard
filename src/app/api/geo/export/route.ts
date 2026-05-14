import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryTable, ENTITY_TYPES, TABLE_IDS } from '@/lib/baserow'

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

    // Generate llms.txt
    const lines: string[] = [
      `# ${domain}`,
      `> Structured knowledge for LLM consumption`,
      ``,
      `## Knowledge API`,
      `Base URL: https://aibot.tbnpr.net/webhook/geo-knowledge`,
      ``,
    ]

    for (const type of ENTITY_TYPES) {
      const { rows } = await queryTable(type.tableId, { domain, size: 100 })
      if (rows.length === 0) continue
      lines.push(`## ${type.label} (${rows.length})`)
      for (const row of rows.slice(0, 10)) {
        const name = row.name || row.question || row.title || row.organization_name || ''
        if (name) lines.push(`- ${name}`)
      }
      if (rows.length > 10) lines.push(`- ... und ${rows.length - 10} weitere`)
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
  const schemas: any[] = []

  // 1. Organization (table 910)
  const { rows: orgs } = await queryTable(TABLE_IDS.geo_organizations, { domain, size: 50 })
  for (const org of orgs) {
    if (org.status?.value === 'Rejected') continue
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name || org.Name || domain,
    }
    if (org.legal_name) schema.legalName = org.legal_name
    if (org.description) schema.description = org.description
    if (org.website) schema.url = org.website
    if (org.email) schema.email = org.email
    if (org.phone) schema.telephone = org.phone
    if (org.location) {
      schema.address = { '@type': 'PostalAddress', addressLocality: org.location }
    }
    if (org.founding_year) schema.foundingDate = String(org.founding_year)
    if (org.team_size) schema.numberOfEmployees = { '@type': 'QuantitativeValue', value: org.team_size }
    if (org.awards) {
      schema.award = org.awards.split(/[,;\n]/).map((a: string) => a.trim()).filter(Boolean)
    }
    schemas.push(schema)
  }

  // 2. Services (table 911)
  const { rows: services } = await queryTable(TABLE_IDS.geo_services, { domain, size: 100 })
  for (const svc of services) {
    if (svc.status?.value === 'Rejected') continue
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: svc.name || svc.Name,
    }
    if (svc.description) schema.description = svc.description
    if (svc.category) schema.category = svc.category
    if (svc.target_audience) {
      schema.audience = { '@type': 'Audience', audienceType: svc.target_audience }
    }
    if (svc.source_url) schema.url = svc.source_url
    if (svc.benefits) {
      schema.additionalProperty = {
        '@type': 'PropertyValue',
        name: 'benefits',
        value: svc.benefits,
      }
    }
    // Link to provider org
    if (orgs.length > 0) {
      schema.provider = { '@type': 'Organization', name: orgs[0].name || domain }
    }
    schemas.push(schema)
  }

  // 3. Persons (table 912)
  const { rows: persons } = await queryTable(TABLE_IDS.geo_persons, { domain, size: 100 })
  for (const person of persons) {
    if (person.status?.value === 'Rejected') continue
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: person.name || person.Name,
    }
    if (person.role) schema.jobTitle = person.role
    if (person.bio) schema.description = person.bio
    if (person.email) schema.email = person.email
    if (person.linkedin_url) {
      schema.sameAs = [person.linkedin_url]
    }
    if (person.expertise) {
      schema.knowsAbout = person.expertise.split(/[,;\n]/).map((e: string) => e.trim()).filter(Boolean)
    }
    // Link to employer org
    if (orgs.length > 0) {
      schema.worksFor = { '@type': 'Organization', name: orgs[0].name || domain }
    }
    schemas.push(schema)
  }

  // 4. FAQPage (table 913) - aggregate all FAQs into one FAQPage
  const { rows: faqs } = await queryTable(TABLE_IDS.geo_faq, { domain, size: 200 })
  const approvedFaqs = faqs.filter((f: any) => f.status?.value !== 'Rejected' && f.question && f.answer)
  if (approvedFaqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: approvedFaqs.map((faq: any) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }

  // 5. Blog Posts as Article (table 915)
  const { rows: posts } = await queryTable(TABLE_IDS.geo_blog_posts, { domain, size: 100 })
  for (const post of posts) {
    if (post.status?.value === 'Rejected') continue
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
    if (post.word_count) schema.wordCount = post.word_count
    if (post.key_points) {
      schema.articleBody = post.key_points
    }
    schemas.push(schema)
  }

  // 6. Case Studies as Article (table 914)
  const { rows: cases } = await queryTable(TABLE_IDS.geo_case_studies, { domain, size: 100 })
  for (const cs of cases) {
    if (cs.status?.value === 'Rejected') continue
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@additionalType': 'CaseStudy',
      headline: cs.title || cs.Name,
    }
    // Compose description from challenge + solution + results
    const parts: string[] = []
    if (cs.challenge) parts.push(`Challenge: ${cs.challenge}`)
    if (cs.solution) parts.push(`Solution: ${cs.solution}`)
    if (cs.results) parts.push(`Results: ${cs.results}`)
    if (parts.length > 0) schema.description = parts.join(' | ')
    if (cs.client_name) schema.about = { '@type': 'Organization', name: cs.client_name }
    if (cs.client_industry) schema.genre = cs.client_industry
    if (cs.source_url) schema.url = cs.source_url
    if (cs.testimonial_quote) {
      schema.citation = cs.testimonial_quote
    }
    schemas.push(schema)
  }

  // 7. Events (table 916)
  const { rows: events } = await queryTable(TABLE_IDS.geo_events, { domain, size: 100 })
  for (const evt of events) {
    if (evt.status?.value === 'Rejected') continue
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: evt.name || evt.Name,
    }
    if (evt.description) schema.description = evt.description
    if (evt.event_date) schema.startDate = evt.event_date
    if (evt.location) {
      schema.location = { '@type': 'Place', name: evt.location }
    }
    if (evt.event_type) schema.eventAttendanceMode = evt.event_type
    if (evt.registration_url) schema.url = evt.registration_url
    if (evt.speakers) {
      schema.performer = evt.speakers.split(/[,;\n]/).map((s: string) => ({
        '@type': 'Person',
        name: s.trim(),
      })).filter((p: any) => p.name)
    }
    // Link to organizer
    if (orgs.length > 0) {
      schema.organizer = { '@type': 'Organization', name: orgs[0].name || domain }
    }
    schemas.push(schema)
  }

  // 8. Products (table 917)
  const { rows: products } = await queryTable(TABLE_IDS.geo_products, { domain, size: 100 })
  for (const prod of products) {
    if (prod.status?.value === 'Rejected') continue
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: prod.name || prod.Name,
    }
    if (prod.description) schema.description = prod.description
    if (prod.category) schema.category = prod.category
    if (prod.features) {
      schema.additionalProperty = prod.features.split(/[,;\n]/).map((f: string) => ({
        '@type': 'PropertyValue',
        name: 'feature',
        value: f.trim(),
      })).filter((p: any) => p.value)
    }
    if (prod.pricing) {
      schema.offers = { '@type': 'Offer', price: prod.pricing, priceCurrency: 'EUR' }
    }
    if (prod.source_url) schema.url = prod.source_url
    schemas.push(schema)
  }

  // Build summary
  const summary: Record<string, number> = {}
  for (const s of schemas) {
    const type = s['@type']
    summary[type] = (summary[type] || 0) + 1
  }

  return NextResponse.json({
    domain,
    generated: new Date().toISOString(),
    summary,
    totalSchemas: schemas.length,
    schemas,
    // Ready-to-embed script tags
    embedCode: `<script type="application/ld+json">\n${JSON.stringify(schemas, null, 2)}\n</script>`,
  })
}

// ─── skills.md Auto-Generator ────────────────────────────────────────────────

async function generateSkillsMd(domain: string) {
  // Fetch all entity types in parallel
  const [orgsRes, servicesRes, personsRes, faqsRes, postsRes, casesRes, eventsRes, productsRes, statsRes] =
    await Promise.all([
      queryTable(TABLE_IDS.geo_organizations, { domain, size: 50 }),
      queryTable(TABLE_IDS.geo_services, { domain, size: 100 }),
      queryTable(TABLE_IDS.geo_persons, { domain, size: 100 }),
      queryTable(TABLE_IDS.geo_faq, { domain, size: 200 }),
      queryTable(TABLE_IDS.geo_blog_posts, { domain, size: 100 }),
      queryTable(TABLE_IDS.geo_case_studies, { domain, size: 100 }),
      queryTable(TABLE_IDS.geo_events, { domain, size: 50 }),
      queryTable(TABLE_IDS.geo_products, { domain, size: 100 }),
      queryTable(TABLE_IDS.geo_statistics, { domain, size: 100 }),
    ])

  // Filter out rejected entities
  const filterApproved = (rows: any[]) => rows.filter((r) => r.status?.value !== 'Rejected')
  const orgs = filterApproved(orgsRes.rows)
  const services = filterApproved(servicesRes.rows)
  const persons = filterApproved(personsRes.rows)
  const faqs = filterApproved(faqsRes.rows)
  const posts = filterApproved(postsRes.rows)
  const cases = filterApproved(casesRes.rows)
  const events = filterApproved(eventsRes.rows)
  const products = filterApproved(productsRes.rows)
  const stats = filterApproved(statsRes.rows)

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
