import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Agentic Browsing Audit API — maps to Lighthouse 13.3 "Agentic Browsing" audits.
 * Runs independently (like Google Readiness Check), no n8n dependency.
 *
 * GET /api/geo/agentic-browsing?domain=example.com          — run fresh audit & save
 * GET /api/geo/agentic-browsing?domain=example.com&load=1   — load last saved result
 *
 * Returns pass/fail for each of the 9 Lighthouse Agentic Browsing audits:
 *   1. llms-txt-present
 *   2. llms-txt-well-formed
 *   3. agents-json-present
 *   4. agents-json-actions-typed
 *   5. sitemap-discoverable
 *   6. agent-runbook-present
 *   7. auto-discovery-links
 *   8. schema-org-density
 *   9. webmcp-annotations (placeholder — spec not final)
 */

const USER_AGENT = 'Mozilla/5.0 (compatible; LLMRadar/1.0; +https://llmradar.de)'
const FETCH_TIMEOUT = 15000

/* ─── Helper: fetch with timeout + error handling ─── */

async function safeFetch(url: string, opts?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      ...opts,
    })
  } catch {
    return null
  }
}

async function safeFetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const resp = await safeFetch(url)
  if (!resp) return { ok: false, status: 0, text: '' }
  const text = await resp.text().catch(() => '')
  return { ok: resp.ok, status: resp.status, text }
}

/* ─── Audit result type ─── */

interface AuditResult {
  id: string
  title: string
  description: string
  passed: boolean | null // null = skipped
  details: string
  learnMoreUrl?: string
}

/* ─── Audit 1: llms-txt-present ─── */

async function auditLlmsTxtPresent(domain: string): Promise<{ audit: AuditResult; body: string }> {
  const url = `https://${domain}/llms.txt`
  const { ok, status, text } = await safeFetchText(url)

  return {
    body: ok ? text : '',
    audit: {
      id: 'llms-txt-present',
      title: 'llms.txt vorhanden',
      description: 'Prüft, ob unter /{domain}/llms.txt eine maschinenlesbare Beschreibung für LLMs erreichbar ist.',
      passed: ok && text.trim().length > 0,
      details: ok
        ? `llms.txt gefunden (${text.length} Zeichen)`
        : status > 0
          ? `HTTP ${status} — llms.txt nicht erreichbar`
          : 'Verbindung fehlgeschlagen',
      learnMoreUrl: 'https://llmstxt.org/',
    },
  }
}

/* ─── Audit 2: llms-txt-well-formed ─── */

function auditLlmsTxtWellFormed(body: string, present: boolean): AuditResult {
  if (!present || !body) {
    return {
      id: 'llms-txt-well-formed',
      title: 'llms.txt wohlgeformt',
      description: 'Prüft, ob die llms.txt der Spezifikation (llmstxt.org) entspricht: Markdown-Struktur mit # Titel, ## Abschnitten und optionalen Links.',
      passed: false,
      details: 'Übersprungen — llms.txt nicht vorhanden',
    }
  }

  const issues: string[] = []
  const lines = body.split('\n')

  // Must start with a # heading
  const firstContentLine = lines.find(l => l.trim().length > 0)
  if (!firstContentLine || !firstContentLine.startsWith('# ')) {
    issues.push('Muss mit einer # Überschrift beginnen')
  }

  // Should have at least one ## section
  const h2Count = lines.filter(l => /^## /.test(l)).length
  if (h2Count === 0) {
    issues.push('Mindestens ein ## Abschnitt erwartet')
  }

  // Should have reasonable length (at least 100 chars)
  if (body.trim().length < 100) {
    issues.push(`Sehr kurz (${body.trim().length} Zeichen) — sollte mindestens 100 Zeichen sein`)
  }

  // Check for markdown links (optional but recommended)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  const links = body.match(linkPattern)

  // Check for description after title (spec: "blockquote with short description")
  const hasBlockquote = lines.some(l => l.trim().startsWith('>'))

  const passed = issues.length === 0

  let details = passed
    ? `Wohlgeformt: ${h2Count} Abschnitte`
    : `Probleme: ${issues.join('; ')}`

  if (links) details += ` · ${links.length} Links`
  if (hasBlockquote) details += ' · Beschreibung vorhanden'

  return {
    id: 'llms-txt-well-formed',
    title: 'llms.txt wohlgeformt',
    description: 'Prüft, ob die llms.txt der Spezifikation (llmstxt.org) entspricht: Markdown-Struktur mit # Titel, ## Abschnitten und optionalen Links.',
    passed,
    details,
    learnMoreUrl: 'https://llmstxt.org/',
  }
}

/* ─── Audit 3: agents-json-present ─── */

async function auditAgentsJsonPresent(domain: string): Promise<{ audit: AuditResult; parsed: any | null }> {
  // Try both /.well-known/agents.json and /agents.json
  const urls = [
    `https://${domain}/.well-known/agents.json`,
    `https://${domain}/agents.json`,
  ]

  for (const url of urls) {
    const { ok, text } = await safeFetchText(url)
    if (ok && text.trim()) {
      try {
        const parsed = JSON.parse(text)
        return {
          parsed,
          audit: {
            id: 'agents-json-present',
            title: 'agents.json vorhanden',
            description: 'Prüft, ob eine agents.json-Datei erreichbar ist, die den Agenten Fähigkeiten und Endpunkte der Website beschreibt.',
            passed: true,
            details: `agents.json gefunden unter ${url.replace(`https://${domain}`, '')}`,
            learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring',
          },
        }
      } catch {
        return {
          parsed: null,
          audit: {
            id: 'agents-json-present',
            title: 'agents.json vorhanden',
            description: 'Prüft, ob eine agents.json-Datei erreichbar ist, die den Agenten Fähigkeiten und Endpunkte der Website beschreibt.',
            passed: false,
            details: `agents.json gefunden, aber kein valides JSON`,
          },
        }
      }
    }
  }

  return {
    parsed: null,
    audit: {
      id: 'agents-json-present',
      title: 'agents.json vorhanden',
      description: 'Prüft, ob eine agents.json-Datei erreichbar ist, die den Agenten Fähigkeiten und Endpunkte der Website beschreibt.',
      passed: false,
      details: 'agents.json nicht gefunden (weder unter /.well-known/agents.json noch /agents.json)',
      learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring',
    },
  }
}

/* ─── Audit 4: agents-json-actions-typed ─── */

function auditAgentsJsonActionsTyped(parsed: any | null): AuditResult {
  if (!parsed) {
    return {
      id: 'agents-json-actions-typed',
      title: 'agents.json Actions typisiert',
      description: 'Prüft, ob alle Actions in der agents.json typisierte Parameter mit Typ-Annotationen haben.',
      passed: false,
      details: 'Übersprungen — agents.json nicht vorhanden oder nicht parsbar',
    }
  }

  const actions = parsed.actions || parsed.capabilities?.actions || []
  if (!Array.isArray(actions) || actions.length === 0) {
    return {
      id: 'agents-json-actions-typed',
      title: 'agents.json Actions typisiert',
      description: 'Prüft, ob alle Actions in der agents.json typisierte Parameter mit Typ-Annotationen haben.',
      passed: false,
      details: 'Keine Actions in agents.json definiert',
    }
  }

  let totalParams = 0
  let typedParams = 0
  const untypedActions: string[] = []

  for (const action of actions) {
    const params = action.parameters || action.inputs || action.params || []
    if (Array.isArray(params)) {
      for (const param of params) {
        totalParams++
        if (param.type || param.schema?.type) {
          typedParams++
        }
      }
      const hasUntyped = params.some((p: any) => !p.type && !p.schema?.type)
      if (hasUntyped) {
        untypedActions.push(action.name || action.id || 'unnamed')
      }
    }
    // Also check if action itself has inputSchema (JSON Schema style)
    if (action.inputSchema?.properties) {
      const props = action.inputSchema.properties
      for (const key of Object.keys(props)) {
        totalParams++
        if (props[key].type) typedParams++
      }
    }
  }

  const passed = totalParams > 0 && typedParams === totalParams

  return {
    id: 'agents-json-actions-typed',
    title: 'agents.json Actions typisiert',
    description: 'Prüft, ob alle Actions in der agents.json typisierte Parameter mit Typ-Annotationen haben.',
    passed,
    details: passed
      ? `${actions.length} Actions, alle ${totalParams} Parameter typisiert`
      : totalParams === 0
        ? `${actions.length} Actions gefunden, aber keine typisierten Parameter`
        : `${typedParams}/${totalParams} Parameter typisiert — fehlend bei: ${untypedActions.join(', ')}`,
  }
}

/* ─── Audit 5: sitemap-discoverable ─── */

async function auditSitemapDiscoverable(domain: string): Promise<AuditResult> {
  // Check 1: /sitemap.xml exists
  const sitemapResp = await safeFetch(`https://${domain}/sitemap.xml`)
  const sitemapExists = sitemapResp?.ok ?? false

  // Also try /sitemap_index.xml
  let sitemapIndexExists = false
  if (!sitemapExists) {
    const indexResp = await safeFetch(`https://${domain}/sitemap_index.xml`)
    sitemapIndexExists = indexResp?.ok ?? false
  }

  // Check 2: Sitemap referenced in robots.txt
  const { ok: robotsOk, text: robotsText } = await safeFetchText(`https://${domain}/robots.txt`)
  const sitemapInRobots = robotsOk && /sitemap\s*:/i.test(robotsText)

  const hasSitemap = sitemapExists || sitemapIndexExists
  const passed = hasSitemap && sitemapInRobots

  let details = ''
  if (!hasSitemap) {
    details = 'Sitemap nicht gefunden (/sitemap.xml und /sitemap_index.xml)'
  } else if (!sitemapInRobots) {
    details = `Sitemap vorhanden, aber nicht in robots.txt referenziert (Sitemap: ... fehlt)`
  } else {
    details = 'Sitemap vorhanden und in robots.txt referenziert'
  }

  return {
    id: 'sitemap-discoverable',
    title: 'Sitemap auffindbar',
    description: 'Prüft, ob eine XML-Sitemap existiert UND in der robots.txt via "Sitemap:"-Direktive referenziert wird.',
    passed,
    details,
  }
}

/* ─── Audit 6: agent-runbook-present ─── */

async function auditAgentRunbookPresent(domain: string): Promise<AuditResult> {
  // Check common paths for agent instructions / runbook
  const paths = [
    '/agent-instructions.md',
    '/.well-known/agent-instructions.md',
    '/agent-runbook.md',
    '/.well-known/agent-runbook.md',
  ]

  for (const path of paths) {
    const { ok, text } = await safeFetchText(`https://${domain}${path}`)
    if (ok && text.trim().length > 50) {
      return {
        id: 'agent-runbook-present',
        title: 'Agent-Runbook vorhanden',
        description: 'Prüft, ob eine agent-instructions.md oder agent-runbook.md existiert, die Agenten erklärt, wie sie mit der Website interagieren sollen.',
        passed: true,
        details: `Runbook gefunden unter ${path} (${text.length} Zeichen)`,
        learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring',
      }
    }
  }

  return {
    id: 'agent-runbook-present',
    title: 'Agent-Runbook vorhanden',
    description: 'Prüft, ob eine agent-instructions.md oder agent-runbook.md existiert, die Agenten erklärt, wie sie mit der Website interagieren sollen.',
    passed: false,
    details: 'Kein Agent-Runbook gefunden (agent-instructions.md / agent-runbook.md)',
    learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring',
  }
}

/* ─── Audit 7: auto-discovery-links ─── */

async function auditAutoDiscoveryLinks(domain: string): Promise<AuditResult> {
  const resp = await safeFetch(`https://${domain}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
    },
  })

  if (!resp || !resp.ok) {
    return {
      id: 'auto-discovery-links',
      title: 'Auto-Discovery Links im <head>',
      description: 'Prüft, ob <link>-Tags im HTML <head> auf maschinenlesbare Ressourcen verweisen (llms.txt, agents.json, Sitemap etc.).',
      passed: false,
      details: 'Website nicht erreichbar',
    }
  }

  const html = await resp.text().catch(() => '')

  // Extract <head> section
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  if (!headMatch) {
    return {
      id: 'auto-discovery-links',
      title: 'Auto-Discovery Links im <head>',
      description: 'Prüft, ob <link>-Tags im HTML <head> auf maschinenlesbare Ressourcen verweisen (llms.txt, agents.json, Sitemap etc.).',
      passed: false,
      details: 'Kein <head>-Bereich im HTML gefunden',
    }
  }

  const head = headMatch[1]

  // Look for <link> tags pointing to agent-related resources
  const linkRegex = /<link[^>]*>/gi
  const links = head.match(linkRegex) || []

  const discoveryLinks: string[] = []

  for (const link of links) {
    const href = link.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || ''
    const rel = link.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1] || ''
    const type = link.match(/type\s*=\s*["']([^"']+)["']/i)?.[1] || ''

    // Check for agent/LLM-related discovery links
    if (
      href.includes('llms.txt') ||
      href.includes('agents.json') ||
      href.includes('agent-instructions') ||
      href.includes('agent-runbook') ||
      href.includes('mcp.json') ||
      rel === 'ai-instructions' ||
      rel === 'agent-description' ||
      (rel === 'alternate' && (type.includes('text/markdown') || type.includes('application/json'))) ||
      (rel === 'sitemap' || (rel === 'alternate' && type.includes('sitemap')))
    ) {
      discoveryLinks.push(`${rel}: ${href}`)
    }
  }

  const passed = discoveryLinks.length >= 1

  return {
    id: 'auto-discovery-links',
    title: 'Auto-Discovery Links im <head>',
    description: 'Prüft, ob <link>-Tags im HTML <head> auf maschinenlesbare Ressourcen verweisen (llms.txt, agents.json, Sitemap etc.).',
    passed,
    details: passed
      ? `${discoveryLinks.length} Discovery-Link(s) gefunden: ${discoveryLinks.join(' · ')}`
      : 'Keine Auto-Discovery <link>-Tags für KI-Ressourcen im <head> gefunden. Empfohlen: <link rel="alternate" type="text/markdown" href="/llms.txt">',
  }
}

/* ─── Audit 8: schema-org-density ─── */

async function auditSchemaOrgDensity(domain: string, html?: string): Promise<AuditResult> {
  let pageHtml = html || ''

  if (!pageHtml) {
    const resp = await safeFetch(`https://${domain}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    })
    if (resp?.ok) {
      pageHtml = await resp.text().catch(() => '')
    }
  }

  if (!pageHtml) {
    return {
      id: 'schema-org-density',
      title: 'Schema.org-Dichte',
      description: 'Prüft, ob die Homepage mindestens 2 JSON-LD Schema.org-Blöcke enthält.',
      passed: false,
      details: 'Website nicht erreichbar',
    }
  }

  // Count JSON-LD blocks
  const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi
  const jsonLdBlocks = pageHtml.match(jsonLdRegex) || []
  const count = jsonLdBlocks.length

  // Extract types for detail
  const typeRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const types: string[] = []
  let match
  while ((match = typeRegex.exec(pageHtml)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed['@graph']) {
        for (const item of parsed['@graph']) {
          if (item['@type']) {
            const t = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
            types.push(...t)
          }
        }
      } else {
        const t = parsed['@type']
        if (t) types.push(...(Array.isArray(t) ? t : [t]))
      }
    } catch { /* skip invalid */ }
  }

  // Lighthouse threshold: ≥2 JSON-LD blocks = pass
  const passed = count >= 2

  return {
    id: 'schema-org-density',
    title: 'Schema.org-Dichte',
    description: 'Prüft, ob die Homepage mindestens 2 JSON-LD Schema.org-Blöcke enthält (Schwellwert aus Lighthouse).',
    passed,
    details: count === 0
      ? 'Kein JSON-LD Schema.org Markup auf der Homepage'
      : passed
        ? `${count} JSON-LD-Blöcke gefunden: ${types.join(', ')}`
        : `Nur ${count} JSON-LD-Block gefunden (Mindestens 2 empfohlen). Typen: ${types.join(', ') || 'keine'}`,
  }
}

/* ─── Audit 9: webmcp-annotations (placeholder) ─── */

function auditWebMcpAnnotations(): AuditResult {
  return {
    id: 'webmcp-annotations',
    title: 'WebMCP-Annotationen',
    description: 'Prüft auf WebMCP data-*-Attribute für agentengesteuerte Formularinteraktion. Die Spezifikation ist noch in Entwicklung.',
    passed: null, // skipped
    details: 'Übersprungen — WebMCP-Spezifikation ist noch nicht finalisiert (Draft-Status). Wird in einem zukünftigen Update geprüft.',
    learnMoreUrl: 'https://AminFazl.github.io/WebMCP/',
  }
}

/* ═══════════════════════════════════════════
   Main API Handler
   ═══════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  const loadOnly = searchParams.get('load') === '1'

  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  // ── Load-only mode: return last persisted result ──
  if (loadOnly) {
    try {
      const project = await prisma.project.findUnique({ where: { domain } })
      if (!project) return NextResponse.json({ saved: null })
      const latest = await prisma.diagnosis.findFirst({
        where: { projectId: project.id, agenticBrowsingJson: { not: null } },
        orderBy: { createdAt: 'desc' },
      })
      if (!latest?.agenticBrowsingJson) return NextResponse.json({ saved: null })
      return NextResponse.json({ saved: JSON.parse(latest.agenticBrowsingJson) })
    } catch {
      return NextResponse.json({ saved: null })
    }
  }

  // ── Run fresh audit ──
  // Run all audits (parallelize where possible)
  const [
    { audit: llmsTxtAudit, body: llmsTxtBody },
    { audit: agentsJsonAudit, parsed: agentsJsonParsed },
    sitemapAudit,
    runbookAudit,
    discoveryAudit,
  ] = await Promise.all([
    auditLlmsTxtPresent(domain),
    auditAgentsJsonPresent(domain),
    auditSitemapDiscoverable(domain),
    auditAgentRunbookPresent(domain),
    auditAutoDiscoveryLinks(domain),
  ])

  // Sequential audits that depend on previous results
  const llmsWellFormedAudit = auditLlmsTxtWellFormed(llmsTxtBody, llmsTxtAudit.passed === true)
  const actionsTypedAudit = auditAgentsJsonActionsTyped(agentsJsonParsed)
  const schemaDensityAudit = await auditSchemaOrgDensity(domain)
  const webMcpAudit = auditWebMcpAnnotations()

  const audits: AuditResult[] = [
    llmsTxtAudit,
    llmsWellFormedAudit,
    agentsJsonAudit,
    actionsTypedAudit,
    sitemapAudit,
    runbookAudit,
    discoveryAudit,
    schemaDensityAudit,
    webMcpAudit,
  ]

  // Calculate pass ratio (excluding skipped/null audits)
  const gradedAudits = audits.filter(a => a.passed !== null)
  const passedCount = audits.filter(a => a.passed === true).length
  const skippedCount = audits.filter(a => a.passed === null).length

  const result = {
    domain,
    audits,
    summary: {
      passCount: passedCount,
      totalCount: audits.length,
      gradedCount: gradedAudits.length,
      skippedCount,
      passRatio: `${passedCount}/${gradedAudits.length}`,
      lighthouseLabel: `Agentic Browsing: ${passedCount}/${gradedAudits.length}`,
    },
    checkedAt: new Date().toISOString(),
  }

  // ── Persist to latest Diagnosis (if project exists) ──
  try {
    const project = await prisma.project.findUnique({ where: { domain } })
    if (project) {
      const latestDiagnosis = await prisma.diagnosis.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
      })
      if (latestDiagnosis) {
        await prisma.diagnosis.update({
          where: { id: latestDiagnosis.id },
          data: { agenticBrowsingJson: JSON.stringify(result) },
        })
      }
    }
  } catch {
    // Persistence failure shouldn't break the response
  }

  return NextResponse.json(result)
}
