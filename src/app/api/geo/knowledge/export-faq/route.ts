import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { queryTable, TABLE_IDS } from '@/lib/baserow'

interface FaqEntry {
  question: string
  answer: string
  category: string
}

/**
 * GET /api/geo/knowledge/export-faq?domain=xxx&status=Approved&lang=de
 *
 * Returns a standalone HTML page containing FAQs with:
 * - Semantic HTML (<details>/<summary> for accordion, H2/H3 headings)
 * - FAQPage JSON-LD structured data (schema.org)
 * - Clean, modern CSS — copy-paste ready for any CMS
 * - Optional: ?format=json returns raw JSON instead of HTML
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const status = searchParams.get('status') || 'Approved'
  const format = searchParams.get('format') || 'html'
  const lang = searchParams.get('lang') || 'de'
  const title = searchParams.get('title') || 'Häufig gestellte Fragen'

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  try {
    // Baserow max page size is 200 — paginate to get all FAQs
    let allRows: any[] = []
    let page = 1
    let hasMore = true
    while (hasMore) {
      const result = await queryTable(TABLE_IDS.geo_faq, { domain, size: 200, page })
      allRows = allRows.concat(result.rows || [])
      hasMore = allRows.length < result.count
      page++
      if (page > 20) break // safety limit
    }
    let faqs = allRows

    // Filter by status
    if (status !== 'all') {
      faqs = faqs.filter((f: any) => {
        const s = f.status?.value || f.status || 'Draft'
        return s === status
      })
    }

    if (faqs.length === 0) {
      return NextResponse.json({
        error: `Keine FAQs mit Status "${status}" gefunden. Bitte FAQs erst freigeben (Approved).`,
        total: result.rows?.length || 0,
      }, { status: 404 })
    }

    // Parse FAQ data
    const parsedFaqs: FaqEntry[] = faqs.map((f: any) => ({
      question: (f.question?.value || f.question || '').trim(),
      answer: (f.answer?.value || f.answer || '').trim(),
      category: (f.category?.value || f.category || '').trim(),
    })).filter((f: FaqEntry) => f.question && f.answer)

    if (format === 'json') {
      return NextResponse.json({ domain, faqs: parsedFaqs, count: parsedFaqs.length })
    }

    // Group by category
    const byCategory: Record<string, FaqEntry[]> = {}
    for (const faq of parsedFaqs) {
      const cat = faq.category || 'Allgemein'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(faq)
    }

    // Build JSON-LD
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': parsedFaqs.map((f: FaqEntry) => ({
        '@type': 'Question',
        'name': f.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': f.answer,
        },
      })),
    }

    // Build HTML
    const categoryBlocks = Object.entries(byCategory).map(([cat, items]) => {
      const faqItems = items.map((f: FaqEntry) => `
      <details class="faq-item">
        <summary class="faq-question">${escapeHtml(f.question)}</summary>
        <div class="faq-answer">
          <p>${escapeHtml(f.answer)}</p>
        </div>
      </details>`).join('\n')

      if (Object.keys(byCategory).length === 1) {
        return faqItems
      }
      return `
    <section class="faq-category">
      <h3 class="faq-category-title">${escapeHtml(cat)}</h3>
      ${faqItems}
    </section>`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} – ${escapeHtml(domain)}</title>
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
  <style>
    /* FAQ Section — copy this CSS into your website stylesheet */
    .faq-section {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
    }

    .faq-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #1a1a2e;
    }

    .faq-subtitle {
      font-size: 0.95rem;
      color: #6b7280;
      margin-bottom: 2rem;
    }

    .faq-category-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: #374151;
      margin: 2rem 0 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .faq-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .faq-item:hover {
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .faq-item[open] {
      border-color: #6366f1;
      box-shadow: 0 1px 4px rgba(99,102,241,0.12);
    }

    .faq-question {
      padding: 1rem 1.25rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #1f2937;
      user-select: none;
    }

    .faq-question::-webkit-details-marker {
      display: none;
    }

    .faq-question::before {
      content: "+";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
      border-radius: 50%;
      background: #f3f4f6;
      color: #6366f1;
      font-weight: 700;
      font-size: 1.1rem;
      transition: all 0.2s;
    }

    .faq-item[open] .faq-question::before {
      content: "−";
      background: #6366f1;
      color: white;
    }

    .faq-answer {
      padding: 0 1.25rem 1rem 3.25rem;
      font-size: 0.9rem;
      color: #4b5563;
    }

    .faq-answer p {
      margin: 0;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .faq-section { color: #e5e7eb; }
      .faq-title { color: #f3f4f6; }
      .faq-subtitle { color: #9ca3af; }
      .faq-category-title { color: #d1d5db; border-bottom-color: #374151; }
      .faq-item { border-color: #374151; background: #1f2937; }
      .faq-question { color: #e5e7eb; }
      .faq-question::before { background: #374151; }
      .faq-item[open] { border-color: #818cf8; }
      .faq-item[open] .faq-question::before { background: #6366f1; }
      .faq-answer { color: #9ca3af; }
    }

    /* Print-friendly */
    @media print {
      .faq-item { border: 1px solid #ccc; break-inside: avoid; }
      .faq-item[open] .faq-answer { display: block !important; }
      details > summary { list-style: none; }
    }
  </style>
</head>
<body>
  <div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
    <h2 class="faq-title">${escapeHtml(title)}</h2>
    <p class="faq-subtitle">${parsedFaqs.length} Fragen und Antworten${Object.keys(byCategory).length > 1 ? ` in ${Object.keys(byCategory).length} Kategorien` : ''}</p>
${categoryBlocks}
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="faq-${domain.replace(/[^a-z0-9]/gi, '-')}.html"`,
      },
    })
  } catch (error: any) {
    console.error('FAQ export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
