/**
 * Local scoring for Tech GEO-Dateien and Schema Markup dimensions.
 *
 * These run independently of the n8n workflow to ensure accurate scores
 * even when the external workflow has timeouts or parsing issues.
 */

const FETCH_OPTS: RequestInit = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; LLMRadar/1.0; +https://llmradar.de)',
    Accept: 'text/html, application/json, text/plain, */*',
  },
  redirect: 'follow',
  // @ts-ignore - Node 18+ supports AbortSignal.timeout
  signal: AbortSignal.timeout(10000),
}

/** Check if a URL returns a 200 response */
async function urlExists(url: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { ...FETCH_OPTS, method: 'HEAD' })
    if (resp.ok) return true
    // Some servers don't support HEAD, try GET
    const resp2 = await fetch(url, FETCH_OPTS)
    return resp2.ok
  } catch {
    return false
  }
}

/** Fetch text content of a URL, return null if failed */
async function fetchText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, FETCH_OPTS)
    if (!resp.ok) return null
    return resp.text()
  } catch {
    return null
  }
}

/* ═══════════════════════════════════════════════════════════
   Tech GEO-Dateien Score (0–20)

   Checks 7 items, each worth up to 3 points (max capped at 20):
   1. robots.txt present                        (2 pts)
   2. sitemap.xml present (or in robots.txt)    (2 pts)
   3. SSL / HTTPS redirect                      (2 pts)
   4. llms.txt present + non-empty              (4 pts)
   5. mcp.json present + valid JSON             (4 pts)
   6. agent.json / .well-known/agent.json       (3 pts)
   7. GEO meta tags (description, og:, etc.)    (3 pts)
   ═══════════════════════════════════════════════════════════ */

export interface TechCheckResult {
  score: number
  checks: Record<string, { found: boolean; points: number; detail?: string }>
}

export async function computeTechScore(domain: string): Promise<TechCheckResult> {
  const base = `https://${domain}`
  const checks: TechCheckResult['checks'] = {}
  let score = 0

  // Run all checks in parallel.
  // Many WordPress / CDN setups redirect /file to www.domain/file (301) where
  // the file doesn't exist, but serve it correctly under /.well-known/file.
  // We therefore check BOTH paths for every KI-specific file.
  const [
    robotsTxt,
    sitemapExists,
    sitemapWww,
    llmsTxt,
    llmsTxtWK,
    mcpJson,
    mcpJsonWK,
    agentJson,
    agentCardJson,
    wellKnownAgent,
    wellKnownAgentCard,
    homepage,
  ] = await Promise.all([
    fetchText(`${base}/robots.txt`),
    urlExists(`${base}/sitemap.xml`),
    urlExists(`${base}/sitemap_index.xml`),    // WordPress / Yoast
    fetchText(`${base}/llms.txt`),
    fetchText(`${base}/.well-known/llms.txt`),
    fetchText(`${base}/mcp.json`),
    fetchText(`${base}/.well-known/mcp.json`), // WordPress .well-known path
    fetchText(`${base}/agent.json`),
    fetchText(`${base}/agent-card.json`),       // methodology uses this name
    fetchText(`${base}/.well-known/agent.json`),
    fetchText(`${base}/.well-known/agent-card.json`),
    fetchText(base),
  ])

  // Helper: try to parse JSON, return true if valid
  function isValidJson(text: string | null): boolean {
    if (!text) return false
    try { JSON.parse(text); return true } catch { return false }
  }

  // 1. robots.txt (2 pts)
  const hasRobots = !!robotsTxt && robotsTxt.length > 10
  checks['robots.txt'] = { found: hasRobots, points: hasRobots ? 2 : 0 }
  if (hasRobots) score += 2

  // 2. sitemap.xml (2 pts) — direct URL, _index.xml, or referenced in robots.txt
  const hasSitemap = sitemapExists || sitemapWww || (!!robotsTxt && /sitemap/i.test(robotsTxt))
  checks['sitemap.xml'] = { found: hasSitemap, points: hasSitemap ? 2 : 0 }
  if (hasSitemap) score += 2

  // 3. SSL (2 pts) — if we got any response from https://, it works
  const hasSSL = homepage !== null
  checks['SSL/HTTPS'] = { found: hasSSL, points: hasSSL ? 2 : 0 }
  if (hasSSL) score += 2

  // 4. llms.txt (4 pts) — check root and .well-known
  const llmsContent = (llmsTxt && llmsTxt.trim().length > 20) ? llmsTxt : llmsTxtWK
  const hasLlms = !!llmsContent && llmsContent.trim().length > 20
  checks['llms.txt'] = {
    found: hasLlms,
    points: hasLlms ? 4 : 0,
    detail: hasLlms ? `${llmsContent!.trim().length} Zeichen` : undefined,
  }
  if (hasLlms) score += 4

  // 5. mcp.json (4 pts) — check root and .well-known
  const mcpContent = mcpJson || mcpJsonWK
  const hasMcp = isValidJson(mcpContent)
  checks['mcp.json'] = {
    found: hasMcp,
    points: hasMcp ? 4 : 0,
    detail: hasMcp ? (mcpJsonWK && !isValidJson(mcpJson) ? '.well-known/mcp.json' : '/mcp.json') : undefined,
  }
  if (hasMcp) score += 4

  // 6. agent.json / agent-card.json (3 pts)
  // Check all 4 variants: /agent.json, /agent-card.json, .well-known/agent.json, .well-known/agent-card.json
  let hasAgent = false
  let agentLocation = ''
  const agentCandidates: [string | null, string][] = [
    [agentJson, '/agent.json'],
    [agentCardJson, '/agent-card.json'],
    [wellKnownAgent, '/.well-known/agent.json'],
    [wellKnownAgentCard, '/.well-known/agent-card.json'],
  ]
  for (const [content, path] of agentCandidates) {
    if (isValidJson(content)) {
      hasAgent = true
      agentLocation = path
      break
    }
  }
  checks['agent-card.json'] = {
    found: hasAgent,
    points: hasAgent ? 3 : 0,
    detail: hasAgent ? agentLocation : undefined,
  }
  if (hasAgent) score += 3

  // 7. GEO meta tags (3 pts)
  let metaPoints = 0
  if (homepage) {
    const hasDescription = /<meta[^>]+name=["']description["'][^>]*>/i.test(homepage)
    const hasOG = /<meta[^>]+property=["']og:/i.test(homepage)
    const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(homepage)
    if (hasDescription) metaPoints += 1
    if (hasOG) metaPoints += 1
    if (hasCanonical) metaPoints += 1
  }
  checks['meta-tags'] = {
    found: metaPoints > 0,
    points: metaPoints,
    detail: `${metaPoints}/3 (description, og:, canonical)`,
  }
  score += metaPoints

  return { score: Math.min(score, 20), checks }
}

/* ═══════════════════════════════════════════════════════════
   Schema Markup Score (0–20)

   Checks JSON-LD on the homepage and scores:
   - Has any schema at all                      (4 pts)
   - No JSON-LD parse errors                    (2 pts)
   - Important types found (2 pts each, max 10):
     Organization, WebSite, FAQPage, Article/BlogPosting, Service/Product
   - Depth bonus: >5 schemas                    (2 pts)
   - Quality: few warnings                      (2 pts)
   ═══════════════════════════════════════════════════════════ */

export interface SchemaCheckResult {
  score: number
  count: number
  types: string[]
  errors: string[]
}

export async function computeSchemaScore(domain: string): Promise<SchemaCheckResult> {
  const result: SchemaCheckResult = { score: 0, count: 0, types: [], errors: [] }

  try {
    const resp = await fetch(`https://${domain}`, {
      ...FETCH_OPTS,
      headers: {
        ...FETCH_OPTS.headers as Record<string, string>,
        Accept: 'text/html',
      },
    })
    if (!resp.ok) {
      result.errors.push(`HTTP ${resp.status}`)
      return result
    }

    const html = await resp.text()

    // Extract all JSON-LD blocks
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match
    const schemas: any[] = []
    let parseErrors = 0

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim())
        if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          schemas.push(...parsed['@graph'])
        } else if (Array.isArray(parsed)) {
          schemas.push(...parsed)
        } else {
          schemas.push(parsed)
        }
      } catch {
        parseErrors++
        result.errors.push('Ungültiges JSON-LD')
      }
    }

    result.count = schemas.length

    if (schemas.length === 0) return result

    // Has any schema (4 pts)
    let score = 4

    // No parse errors (2 pts)
    if (parseErrors === 0) score += 2

    // Important types (2 pts each, max 10)
    const typesFound = new Set<string>()
    for (const schema of schemas) {
      const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']].filter(Boolean)
      types.forEach((t: string) => typesFound.add(t))
    }
    result.types = Array.from(typesFound)

    const importantGroups = [
      ['Organization', 'LocalBusiness'],
      ['WebSite'],
      ['FAQPage'],
      ['Article', 'BlogPosting', 'NewsArticle'],
      ['Service', 'Product'],
    ]
    let typePoints = 0
    for (const group of importantGroups) {
      if (group.some(t => typesFound.has(t))) typePoints += 2
    }
    score += Math.min(typePoints, 10)

    // Depth bonus: >5 schemas (2 pts)
    if (schemas.length > 5) score += 2

    // Quality bonus: warnings check (2 pts)
    // Simple heuristic: if most schemas have @type and @context, good quality
    const wellFormed = schemas.filter(s => s['@type']).length
    if (wellFormed >= schemas.length * 0.8) score += 2

    result.score = Math.min(score, 20)
  } catch (e) {
    result.errors.push((e as Error).message)
  }

  return result
}
