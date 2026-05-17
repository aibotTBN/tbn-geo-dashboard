import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Google Readiness API — Schema.org validation + optional PageSpeed Insights.
 * Runs independently of the n8n diagnose workflow.
 * 
 * PageSpeed requires GOOGLE_PAGESPEED_API_KEY env var (free, 25k queries/day).
 * Without it, only Schema.org validation runs.
 * 
 * GET /api/geo/google-readiness?domain=example.com
 */

interface SchemaValidation {
  valid: boolean
  types: string[]
  errors: string[]
  warnings: string[]
  count: number
  rawSchemas: any[]
}

interface PageSpeedData {
  seoScore: number
  performanceScore: number
  bestPracticesScore: number
  accessibilityScore: number
  coreWebVitals: {
    lcp: { value: number; unit: string; rating: string }
    fid: { value: number; unit: string; rating: string }
    cls: { value: number; unit: string; rating: string }
    fcp: { value: number; unit: string; rating: string }
    ttfb: { value: number; unit: string; rating: string }
  }
  seoAudits: { title: string; score: number; description: string }[]
  structuredDataAudits: { title: string; score: number; description: string }[]
}

/**
 * Fetch and validate Schema.org markup from a website.
 */
async function validateSchema(domain: string): Promise<SchemaValidation> {
  const result: SchemaValidation = {
    valid: false,
    types: [],
    errors: [],
    warnings: [],
    count: 0,
    rawSchemas: [],
  }

  try {
    const url = `https://${domain}`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LLMRadar/1.0; +https://llmradar.de)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!resp.ok) {
      result.errors.push(`Website nicht erreichbar (HTTP ${resp.status})`)
      return result
    }

    const html = await resp.text()

    // Extract all JSON-LD blocks
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match
    const schemas: any[] = []

    while ((match = jsonLdRegex.exec(html)) !== null) {
      const raw = match[1].trim()
      try {
        const parsed = JSON.parse(raw)
        // Handle @graph arrays
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          for (const item of parsed['@graph']) {
            schemas.push(item)
          }
        } else if (Array.isArray(parsed)) {
          schemas.push(...parsed)
        } else {
          schemas.push(parsed)
        }
      } catch (e) {
        result.errors.push(`Ungültiges JSON-LD gefunden: ${(e as Error).message}`)
      }
    }

    result.count = schemas.length
    result.rawSchemas = schemas

    if (schemas.length === 0) {
      result.errors.push('Kein Schema.org Markup (JSON-LD) gefunden')
      return result
    }

    // Validate each schema
    const typesFound = new Set<string>()
    for (const schema of schemas) {
      // Check @type
      if (!schema['@type']) {
        result.warnings.push('Schema ohne @type gefunden')
        continue
      }
      const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']]
      types.forEach((t: string) => typesFound.add(t))

      // Check @context
      if (!schema['@context'] && !schemas.some(s => s['@context'])) {
        result.warnings.push(`Schema "${types[0]}" ohne @context — sollte "https://schema.org" sein`)
      }

      // Type-specific validation
      for (const type of types) {
        switch (type) {
          case 'Organization':
          case 'LocalBusiness':
            if (!schema.name) result.warnings.push(`${type}: "name" fehlt`)
            if (!schema.url) result.warnings.push(`${type}: "url" fehlt`)
            if (!schema.description) result.warnings.push(`${type}: "description" fehlt — wichtig für KI-Systeme`)
            if (!schema.logo) result.warnings.push(`${type}: "logo" fehlt`)
            if (!schema.contactPoint && !schema.telephone && !schema.email) {
              result.warnings.push(`${type}: Keine Kontaktdaten (contactPoint/telephone/email)`)
            }
            break
          case 'WebSite':
            if (!schema.url) result.warnings.push('WebSite: "url" fehlt')
            if (!schema.name) result.warnings.push('WebSite: "name" fehlt')
            if (schema.potentialAction) {
              // SearchAction is good for SEO
            }
            break
          case 'FAQPage':
            if (!schema.mainEntity || (Array.isArray(schema.mainEntity) && schema.mainEntity.length === 0)) {
              result.warnings.push('FAQPage: "mainEntity" (Fragen) fehlt oder ist leer')
            }
            break
          case 'Article':
          case 'BlogPosting':
          case 'NewsArticle':
            if (!schema.headline) result.warnings.push(`${type}: "headline" fehlt`)
            if (!schema.author) result.warnings.push(`${type}: "author" fehlt — wichtig für E-E-A-T`)
            if (!schema.datePublished) result.warnings.push(`${type}: "datePublished" fehlt`)
            if (!schema.dateModified) result.warnings.push(`${type}: "dateModified" fehlt — wichtig für Freshness`)
            break
          case 'Service':
          case 'Product':
            if (!schema.name) result.warnings.push(`${type}: "name" fehlt`)
            if (!schema.description) result.warnings.push(`${type}: "description" fehlt`)
            if (!schema.provider && type === 'Service') result.warnings.push('Service: "provider" fehlt')
            break
          case 'Person':
            if (!schema.name) result.warnings.push('Person: "name" fehlt')
            if (!schema.jobTitle) result.warnings.push('Person: "jobTitle" fehlt — zeigt Expertise')
            break
          case 'BreadcrumbList':
            // Good to have, no specific warnings
            break
        }
      }
    }

    result.types = Array.from(typesFound)
    result.valid = result.errors.length === 0

    // Add positive signals
    const importantTypes = ['Organization', 'LocalBusiness', 'WebSite', 'FAQPage', 'BreadcrumbList']
    const missingImportant = importantTypes.filter(t => !typesFound.has(t))
    if (missingImportant.length > 0 && !typesFound.has('Organization') && !typesFound.has('LocalBusiness')) {
      result.warnings.push('Empfohlen: Organization-Schema fehlt — das ist die Basis für KI-Sichtbarkeit')
    }
    if (!typesFound.has('FAQPage')) {
      result.warnings.push('Empfohlen: FAQPage-Schema kann die Chancen auf KI-Erwähnungen stark verbessern')
    }

  } catch (error) {
    result.errors.push(`Fehler beim Crawlen: ${(error as Error).message}`)
  }

  return result
}

/**
 * Fetch Google PageSpeed Insights data.
 * Returns null if no API key is configured or if the API fails.
 */
async function fetchPageSpeed(domain: string): Promise<PageSpeedData | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY
  if (!apiKey) {
    // No API key configured — skip PageSpeed silently
    return null
  }

  try {
    const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?` +
      `url=https://${encodeURIComponent(domain)}` +
      `&strategy=mobile` +
      `&category=seo&category=performance&category=best-practices&category=accessibility` +
      `&key=${apiKey}`

    const resp = await fetch(url, {
      signal: AbortSignal.timeout(60000),
    })

    if (!resp.ok) {
      console.error('PageSpeed API error:', resp.status, await resp.text().catch(() => ''))
      return null
    }

    const data = await resp.json()
    const lhr = data.lighthouseResult
    if (!lhr) return null

    const categories = lhr.categories || {}
    const audits = lhr.audits || {}

    // Extract Core Web Vitals
    const cwv = {
      lcp: {
        value: audits['largest-contentful-paint']?.numericValue ?? 0,
        unit: 'ms',
        rating: audits['largest-contentful-paint']?.score >= 0.9 ? 'good' : audits['largest-contentful-paint']?.score >= 0.5 ? 'needs-improvement' : 'poor',
      },
      fid: {
        value: audits['max-potential-fid']?.numericValue ?? 0,
        unit: 'ms',
        rating: audits['max-potential-fid']?.score >= 0.9 ? 'good' : audits['max-potential-fid']?.score >= 0.5 ? 'needs-improvement' : 'poor',
      },
      cls: {
        value: audits['cumulative-layout-shift']?.numericValue ?? 0,
        unit: '',
        rating: audits['cumulative-layout-shift']?.score >= 0.9 ? 'good' : audits['cumulative-layout-shift']?.score >= 0.5 ? 'needs-improvement' : 'poor',
      },
      fcp: {
        value: audits['first-contentful-paint']?.numericValue ?? 0,
        unit: 'ms',
        rating: audits['first-contentful-paint']?.score >= 0.9 ? 'good' : audits['first-contentful-paint']?.score >= 0.5 ? 'needs-improvement' : 'poor',
      },
      ttfb: {
        value: audits['server-response-time']?.numericValue ?? 0,
        unit: 'ms',
        rating: audits['server-response-time']?.score >= 0.9 ? 'good' : audits['server-response-time']?.score >= 0.5 ? 'needs-improvement' : 'poor',
      },
    }

    // Extract relevant SEO audits
    const seoAuditKeys = [
      'document-title', 'meta-description', 'http-status-code',
      'link-text', 'crawlable-anchors', 'is-crawlable',
      'robots-txt', 'hreflang', 'canonical', 'font-size',
      'tap-targets',
    ]
    const seoAudits = seoAuditKeys
      .map(key => audits[key])
      .filter(Boolean)
      .map(a => ({
        title: a.title || '',
        score: a.score ?? 0,
        description: a.description || '',
      }))

    // Structured data related audits
    const sdAuditKeys = ['structured-data', 'valid-source-maps']
    const structuredDataAudits = sdAuditKeys
      .map(key => audits[key])
      .filter(Boolean)
      .map(a => ({
        title: a.title || '',
        score: a.score ?? 0,
        description: a.description || '',
      }))

    return {
      seoScore: Math.round((categories.seo?.score ?? 0) * 100),
      performanceScore: Math.round((categories.performance?.score ?? 0) * 100),
      bestPracticesScore: Math.round((categories['best-practices']?.score ?? 0) * 100),
      accessibilityScore: Math.round((categories.accessibility?.score ?? 0) * 100),
      coreWebVitals: cwv,
      seoAudits,
      structuredDataAudits,
    }
  } catch (error) {
    console.error('PageSpeed fetch error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  // Check if PageSpeed API key is available
  const hasPageSpeedKey = !!process.env.GOOGLE_PAGESPEED_API_KEY

  // Run checks (PageSpeed only if API key is configured)
  const [schemaValidation, pageSpeed] = await Promise.all([
    validateSchema(domain),
    hasPageSpeedKey ? fetchPageSpeed(domain) : Promise.resolve(null),
  ])

  // Calculate combined readiness score (0-100)
  let readinessScore = 0

  if (pageSpeed) {
    // --- Full mode: Schema (40) + PageSpeed SEO (30) + Performance (20) + Accessibility (10) ---

    // Schema.org contribution (max 40 points)
    if (schemaValidation.count > 0) {
      readinessScore += 10
      if (schemaValidation.valid) readinessScore += 5
      const importantTypes = ['Organization', 'LocalBusiness', 'WebSite', 'FAQPage', 'Article', 'BlogPosting', 'Service', 'Product', 'Person', 'BreadcrumbList']
      const foundImportant = schemaValidation.types.filter(t => importantTypes.includes(t))
      readinessScore += Math.min(foundImportant.length * 5, 25)
    }

    // PageSpeed SEO (max 30)
    readinessScore += Math.round(pageSpeed.seoScore * 0.3)

    // Performance (max 20)
    readinessScore += Math.round(pageSpeed.performanceScore * 0.2)

    // Accessibility (max 10)
    readinessScore += Math.round(pageSpeed.accessibilityScore * 0.1)
  } else {
    // --- Schema-only mode: Score out of 100 based purely on Schema.org quality ---

    if (schemaValidation.count > 0) {
      readinessScore += 20 // Has any schema at all
      if (schemaValidation.valid) readinessScore += 10 // No errors

      // Points per important schema type (max 50)
      const importantTypes = ['Organization', 'LocalBusiness', 'WebSite', 'FAQPage', 'Article', 'BlogPosting', 'Service', 'Product', 'Person', 'BreadcrumbList']
      const foundImportant = schemaValidation.types.filter(t => importantTypes.includes(t))
      readinessScore += Math.min(foundImportant.length * 10, 50)

      // Quality bonus: few warnings relative to schema count (max 20)
      const warningRatio = schemaValidation.warnings.length / Math.max(schemaValidation.count, 1)
      if (warningRatio === 0) readinessScore += 20
      else if (warningRatio < 1) readinessScore += 10
      else if (warningRatio < 2) readinessScore += 5
    }
    // If no schemas at all, score stays 0
  }

  return NextResponse.json({
    domain,
    readinessScore: Math.min(readinessScore, 100),
    schema: schemaValidation,
    pageSpeed,
    pageSpeedAvailable: hasPageSpeedKey,
    checkedAt: new Date().toISOString(),
  })
}
