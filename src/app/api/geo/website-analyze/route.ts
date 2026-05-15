import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Website Analyze API — crawls a domain and extracts structured suggestions
 * for project creation (name, industry, core topics, description, competitors).
 *
 * GET /api/geo/website-analyze?domain=example.com
 */

interface AnalysisResult {
  domain: string
  name: string
  description: string
  industry: string
  coreTopics: string[]
  schemaTypes: string[]
  schemaOrg: Record<string, any> | null
  internalLinks: { href: string; text: string }[]
  headings: string[]
  metaKeywords: string[]
  suggestedCompetitors: string[]
  signals: string[]
  analyzedAt: string
}

/** Fetch HTML with timeout and follow redirects */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LLMRadar/1.0; +https://llmradar.de)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) return null
    return resp.text()
  } catch {
    return null
  }
}

/** Extract text content between tags, stripping nested HTML */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Extract meta tag content */
function extractMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

/** Extract all headings */
function extractHeadings(html: string): string[] {
  const headings: string[] = []
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1]).substring(0, 200)
    if (text.length > 2 && !headings.includes(text)) headings.push(text)
    if (headings.length >= 30) break
  }
  return headings
}

/** Extract JSON-LD schemas */
function extractJsonLd(html: string): any[] {
  const schemas: any[] = []
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        schemas.push(...parsed['@graph'])
      } else if (Array.isArray(parsed)) {
        schemas.push(...parsed)
      } else {
        schemas.push(parsed)
      }
    } catch { /* skip invalid */ }
  }
  return schemas
}

/** Extract internal links */
function extractInternalLinks(html: string, domain: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = []
  const seen = new Set<string>()
  const re = /<a[^>]*href=["'](\/[^"'#]*|https?:\/\/[^"'#]*?)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    let href = m[1]
    const text = stripHtml(m[2]).substring(0, 100)
    // Only internal links
    if (href.startsWith('/')) {
      href = `https://${domain}${href}`
    } else if (!href.includes(domain)) {
      continue
    }
    if (text.length < 2 || seen.has(href)) continue
    seen.add(href)
    links.push({ href, text })
    if (links.length >= 50) break
  }
  return links
}

/** Guess industry from content signals */
function guessIndustry(
  title: string, description: string, headings: string[], schemas: any[], keywords: string[]
): string {
  const allText = [title, description, ...headings, ...keywords].join(' ').toLowerCase()

  const industrySignals: Record<string, string[]> = {
    'B2B PR & Marketing': ['public relations', 'pr-agentur', 'pressearbeit', 'medienarbeit', 'kommunikation'],
    'SaaS / Software': ['saas', 'software', 'plattform', 'cloud', 'api', 'app'],
    'E-Commerce': ['shop', 'online-shop', 'e-commerce', 'produkte kaufen', 'warenkorb'],
    'MedTech / Healthcare': ['medizin', 'healthcare', 'medtech', 'klinik', 'pharma', 'gesundheit'],
    'Maschinenbau / Industrie': ['maschinenbau', 'industrie', 'fertigung', 'automation', 'produktion', 'engineering'],
    'IT & Technology': ['it-', 'technologie', 'technology', 'digital', 'cyber', 'security'],
    'Consulting / Beratung': ['beratung', 'consulting', 'berater', 'strategie', 'management'],
    'Finance / Fintech': ['finanz', 'finance', 'banking', 'versicherung', 'fintech'],
    'Immobilien': ['immobilie', 'real estate', 'wohnung', 'gewerbe', 'makler'],
    'Bildung / Education': ['bildung', 'education', 'training', 'schulung', 'weiterbildung'],
    'Energie / Cleantech': ['energie', 'energy', 'solar', 'nachhaltig', 'cleantech', 'umwelt'],
    'Logistik / Transport': ['logistik', 'transport', 'spedition', 'lieferkette', 'supply chain'],
    'Kälte & Klima (HVAC/R)': ['kälte', 'klima', 'hvac', 'refrigeration', 'cooling', 'wärmepumpe'],
  }

  let bestMatch = 'B2B'
  let bestScore = 0
  for (const [industry, keywords] of Object.entries(industrySignals)) {
    const score = keywords.filter(kw => allText.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = industry
    }
  }
  return bestMatch
}

/** Extract core topics from headings, meta, and content */
function extractCoreTopics(
  headings: string[], description: string, keywords: string[], schemas: any[]
): string[] {
  const topics = new Set<string>()

  // From keywords
  keywords.forEach(kw => {
    if (kw.length >= 3 && kw.length <= 60) topics.add(kw)
  })

  // From headings - take significant ones
  headings.slice(0, 15).forEach(h => {
    // Clean up heading for topic extraction
    const cleaned = h.replace(/[|–—:]/g, '').trim()
    if (cleaned.length >= 4 && cleaned.length <= 80 && !cleaned.includes('Navigation') && !cleaned.includes('Menu')) {
      topics.add(cleaned)
    }
  })

  // From Schema.org service/product names
  for (const schema of schemas) {
    if (schema['@type'] === 'Service' || schema['@type'] === 'Product') {
      if (schema.name) topics.add(schema.name)
    }
  }

  // Limit to 10 most relevant
  return Array.from(topics).slice(0, 10)
}

/** Try to find competitor mentions or partner logos etc. */
function suggestCompetitors(html: string, schemas: any[], headings: string[]): string[] {
  const competitors: string[] = []

  // Look for competitor sections
  const competitorPatterns = [
    /(?:wettbewerb|konkurrenz|alternatives?|vergleich|vs\.?\s)/i,
  ]

  // Look at headings for competitor-related sections
  for (const h of headings) {
    if (competitorPatterns.some(p => p.test(h))) {
      // Found a competitor-related heading — note it but can't extract names without more context
    }
  }

  return competitors
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rawDomain = searchParams.get('domain')
  if (!rawDomain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  // Clean domain
  const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

  // Fetch homepage
  const html = await fetchHtml(`https://${domain}`)
  if (!html) {
    // Try with www
    const htmlWww = await fetchHtml(`https://www.${domain}`)
    if (!htmlWww) {
      return NextResponse.json({ error: `Website https://${domain} nicht erreichbar` }, { status: 422 })
    }
  }
  const pageHtml = html || (await fetchHtml(`https://www.${domain}`))!

  // Extract all data
  const title = (pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
  const metaDesc = extractMeta(pageHtml, 'description')
  const metaKeywordsRaw = extractMeta(pageHtml, 'keywords')
  const ogTitle = extractMeta(pageHtml, 'og:title')
  const ogDesc = extractMeta(pageHtml, 'og:description')
  const headings = extractHeadings(pageHtml)
  const schemas = extractJsonLd(pageHtml)
  const internalLinks = extractInternalLinks(pageHtml, domain)
  const metaKeywords = metaKeywordsRaw ? metaKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean) : []

  // Try to get company name from Schema.org
  let schemaName = ''
  let schemaDesc = ''
  let schemaOrgData: Record<string, any> | null = null
  const schemaTypes: string[] = []
  for (const s of schemas) {
    const types = Array.isArray(s['@type']) ? s['@type'] : [s['@type']].filter(Boolean)
    types.forEach((t: string) => { if (!schemaTypes.includes(t)) schemaTypes.push(t) })

    if (types.includes('Organization') || types.includes('LocalBusiness')) {
      schemaName = s.name || schemaName
      schemaDesc = s.description || schemaDesc
      schemaOrgData = s
    }
  }

  // Determine best company name
  const name = schemaName || ogTitle || title.split(/[|–—\-]/)[0].trim() || domain

  // Best description
  const description = schemaDesc || ogDesc || metaDesc || ''

  // Guess industry
  const industry = guessIndustry(title, description, headings, schemas, metaKeywords)

  // Extract core topics
  const coreTopics = extractCoreTopics(headings, description, metaKeywords, schemas)

  // Suggest competitors (limited without AI)
  const suggestedCompetitors = suggestCompetitors(pageHtml, schemas, headings)

  // Collect signals (what was found)
  const signals: string[] = []
  if (schemaName) signals.push('Schema.org Organization gefunden')
  if (schemas.length > 0) signals.push(`${schemas.length} JSON-LD Schema${schemas.length > 1 ? 's' : ''} erkannt`)
  if (metaDesc) signals.push('Meta Description vorhanden')
  if (metaKeywords.length > 0) signals.push(`${metaKeywords.length} Meta Keywords`)
  if (headings.length > 0) signals.push(`${headings.length} Überschriften analysiert`)
  if (!metaDesc) signals.push('⚠️ Keine Meta Description')
  if (schemas.length === 0) signals.push('⚠️ Kein Schema.org Markup')

  // Also try fetching /about or /ueber-uns for more context
  const aboutPaths = ['/about', '/ueber-uns', '/unternehmen', '/about-us', '/company']
  let aboutText = ''
  for (const path of aboutPaths) {
    const aboutHtml = await fetchHtml(`https://${domain}${path}`)
    if (aboutHtml) {
      const aboutHeadings = extractHeadings(aboutHtml)
      const aboutMeta = extractMeta(aboutHtml, 'description')
      if (aboutMeta) aboutText = aboutMeta
      // Add unique headings from about page as potential topics
      for (const h of aboutHeadings.slice(0, 5)) {
        if (!coreTopics.includes(h) && h.length <= 80) {
          coreTopics.push(h)
        }
      }
      signals.push(`About-Seite gefunden (${path})`)
      break
    }
  }

  // Try services/leistungen page
  const servicePaths = ['/services', '/leistungen', '/angebot', '/produkte', '/products']
  for (const path of servicePaths) {
    const svcHtml = await fetchHtml(`https://${domain}${path}`)
    if (svcHtml) {
      const svcHeadings = extractHeadings(svcHtml)
      for (const h of svcHeadings.slice(0, 5)) {
        if (!coreTopics.includes(h) && h.length <= 80) {
          coreTopics.push(h)
        }
      }
      signals.push(`Leistungen-Seite gefunden (${path})`)
      break
    }
  }

  const result: AnalysisResult = {
    domain,
    name: name.substring(0, 200),
    description: (aboutText || description).substring(0, 500),
    industry,
    coreTopics: coreTopics.slice(0, 12),
    schemaTypes,
    schemaOrg: schemaOrgData,
    internalLinks: internalLinks.slice(0, 20),
    headings: headings.slice(0, 20),
    metaKeywords,
    suggestedCompetitors,
    signals,
    analyzedAt: new Date().toISOString(),
  }

  return NextResponse.json(result)
}
