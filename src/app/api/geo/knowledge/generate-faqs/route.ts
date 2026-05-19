import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryTable, createRow, TABLE_IDS, ENTITY_TYPES } from '@/lib/baserow'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://aibot.tbnpr.net/webhook'

// POST: Generate new FAQs from existing KB content using AI
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { domain, count = 15, saveToKB = false } = body

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // 1. Gather existing KB content for context
    const [orgsRes, servicesRes, postsRes, casesRes, faqsRes, productsRes, statsRes] =
      await Promise.all([
        queryTable(TABLE_IDS.geo_organizations, { domain, size: 50 }),
        queryTable(TABLE_IDS.geo_services, { domain, size: 100 }),
        queryTable(TABLE_IDS.geo_blog_posts, { domain, size: 100 }),
        queryTable(TABLE_IDS.geo_case_studies, { domain, size: 50 }),
        queryTable(TABLE_IDS.geo_faq, { domain, size: 200 }),
        queryTable(TABLE_IDS.geo_products, { domain, size: 100 }),
        queryTable(TABLE_IDS.geo_statistics, { domain, size: 100 }),
      ])

    // Build context string from KB entities
    const contextParts: string[] = []

    const orgs = orgsRes.rows.filter((r: any) => r.status?.value !== 'Rejected')
    if (orgs.length > 0) {
      const org = orgs[0]
      contextParts.push(`## Organisation\n${org.name}: ${org.description || ''}\nStandort: ${org.location || '?'}\nUSPs: ${org.usps || '?'}\nZielgruppe: ${org.target_audience || '?'}`)
    }

    const services = servicesRes.rows.filter((r: any) => r.status?.value !== 'Rejected')
    if (services.length > 0) {
      contextParts.push(`## Services (${services.length})\n${services.map((s: any) =>
        `- ${s.name}: ${(s.description || '').substring(0, 200)}`
      ).join('\n')}`)
    }

    const products = productsRes.rows.filter((r: any) => r.status?.value !== 'Rejected')
    if (products.length > 0) {
      contextParts.push(`## Produkte (${products.length})\n${products.map((p: any) =>
        `- ${p.name}: ${(p.description || '').substring(0, 200)}`
      ).join('\n')}`)
    }

    const posts = postsRes.rows.filter((r: any) => r.status?.value !== 'Rejected')
    if (posts.length > 0) {
      contextParts.push(`## Blog-Themen (${posts.length})\n${posts.slice(0, 20).map((p: any) =>
        `- ${p.title}: ${(p.summary || '').substring(0, 150)}`
      ).join('\n')}`)
    }

    const cases = casesRes.rows.filter((r: any) => r.status?.value !== 'Rejected')
    if (cases.length > 0) {
      contextParts.push(`## Case Studies (${cases.length})\n${cases.map((c: any) =>
        `- ${c.title} (${c.client_industry || '?'}): ${(c.results || '').substring(0, 150)}`
      ).join('\n')}`)
    }

    const stats = statsRes.rows.filter((r: any) => r.status?.value !== 'Rejected')
    if (stats.length > 0) {
      contextParts.push(`## Kennzahlen\n${stats.map((s: any) =>
        `- ${s.metric_name}: ${s.value} ${s.unit || ''}`
      ).join('\n')}`)
    }

    // Existing FAQs (to avoid duplicates)
    const existingFaqs = faqsRes.rows
      .filter((r: any) => r.status?.value !== 'Rejected')
      .map((f: any) => f.question)
      .filter(Boolean)

    const context = contextParts.join('\n\n')
    const companyName = orgs[0]?.name || domain

    if (context.length < 50) {
      return NextResponse.json({
        error: 'Nicht genug KB-Daten vorhanden. Bitte erst den Knowledge Builder für diese Domain ausführen.',
        kbStats: {
          organizations: orgs.length,
          services: services.length,
          products: products.length,
          blog_posts: posts.length,
          case_studies: cases.length,
        },
      }, { status: 400 })
    }

    // 2. Call n8n FAQ Generator webhook
    const n8nResp = await fetch(`${N8N_WEBHOOK_URL}/geo-generate-faqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120000), // 2 min timeout
      body: JSON.stringify({
        domain,
        company_name: companyName,
        industry: orgs[0]?.target_audience || 'B2B',
        context,
        existing_faqs: existingFaqs.slice(0, 50).join('\n'),
        count,
      }),
    })

    if (!n8nResp.ok) {
      const text = await n8nResp.text()
      throw new Error(`FAQ-Generator fehlgeschlagen: ${n8nResp.status} ${text}`)
    }

    // Parse n8n response safely — handle empty/non-JSON responses
    const responseText = await n8nResp.text()
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Der FAQ-Generator hat keine Antwort geliefert. Bitte erneut versuchen.')
    }

    let result: any
    try {
      result = JSON.parse(responseText)
      // n8n respondToWebhook with allIncomingItems wraps in array
      if (Array.isArray(result)) {
        result = result[0] || {}
      }
    } catch (parseErr) {
      console.error('Failed to parse n8n response:', responseText.substring(0, 500))
      throw new Error('Die Antwort vom FAQ-Generator konnte nicht verarbeitet werden. Bitte erneut versuchen.')
    }

    if (result.error) {
      throw new Error(`FAQ-Generator Fehler: ${result.error}`)
    }

    const faqs = result.faqs || []

    // 3. Optionally save to KB
    let saved = 0
    if (saveToKB && faqs.length > 0) {
      for (const faq of faqs) {
        try {
          await createRow(TABLE_IDS.geo_faq, {
            question: faq.question,
            answer: faq.answer,
            category: faq.category || 'Allgemein',
            language: 'de',
            status: 'Draft',
            project_domain: domain,
            notes: 'Auto-generiert aus KB-Inhalten',
          })
          saved++
        } catch (e: any) {
          console.error(`Failed to save FAQ: ${e.message}`)
        }
      }
    }

    return NextResponse.json({
      domain,
      generated: faqs.length,
      saved,
      faqs,
      existingFaqCount: existingFaqs.length,
      kbContext: {
        organizations: orgs.length,
        services: services.length,
        products: products.length,
        blog_posts: posts.length,
        case_studies: cases.length,
        statistics: stats.length,
      },
    })
  } catch (error: any) {
    console.error('FAQ generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
