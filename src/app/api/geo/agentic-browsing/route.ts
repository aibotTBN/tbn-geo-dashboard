import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Agentic Browsing Audit API — maps to the 6 real Chrome Lighthouse
 * "Agentic Browsing" audits (Lighthouse ≥ 13.3, May 2026).
 *
 * Spec: https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring
 *
 * GET /api/geo/agentic-browsing?domain=example.com          — run fresh audit & save
 * GET /api/geo/agentic-browsing?domain=example.com&load=1   — load last saved result
 *
 * The 6 real Lighthouse Agentic Browsing audits:
 *   1. llms-txt           — Machine-readable summary at domain root
 *   2. webmcp-registered  — Registered WebMCP tools (declarative or imperative)
 *   3. webmcp-forms       — Forms should have declarative WebMCP annotations
 *   4. webmcp-schema      — WebMCP schema validity
 *   5. agent-a11y         — Accessibility tree for machine interaction
 *   6. layout-stability   — CLS for reliable agent interaction
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

async function safeFetchHtml(domain: string): Promise<string> {
  const resp = await safeFetch(`https://${domain}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  })
  if (!resp?.ok) return ''
  return await resp.text().catch(() => '')
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

/* ═══════════════════════════════════════════════════════════════
   Audit 1: llms.txt — Machine-readable summary
   Real Lighthouse audit: "llms.txt"
   Spec: https://llmstxt.org/
   ═══════════════════════════════════════════════════════════════ */

async function auditLlmsTxt(domain: string): Promise<AuditResult> {
  const url = `https://${domain}/llms.txt`
  const { ok, status, text } = await safeFetchText(url)

  if (!ok || !text.trim()) {
    return {
      id: 'llms-txt',
      title: 'llms.txt vorhanden',
      description:
        'Prüft, ob unter /{domain}/llms.txt eine maschinenlesbare Beschreibung existiert. ' +
        'Lighthouse erwartet eine Markdown-Datei mit mindestens einem # Titel und beschreibendem Inhalt.',
      passed: false,
      details: status > 0
        ? `HTTP ${status} — llms.txt nicht erreichbar`
        : 'Verbindung fehlgeschlagen — llms.txt nicht gefunden',
      learnMoreUrl: 'https://llmstxt.org/',
    }
  }

  // Validate structure per llmstxt.org spec
  const lines = text.split('\n')
  const firstContentLine = lines.find((l) => l.trim().length > 0)
  const hasTitle = firstContentLine?.startsWith('# ') ?? false
  const h2Count = lines.filter((l) => /^## /.test(l)).length
  const hasBlockquote = lines.some((l) => l.trim().startsWith('>'))
  const linkCount = (text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length

  const issues: string[] = []
  if (!hasTitle) issues.push('Keine # Überschrift am Anfang')
  if (h2Count === 0) issues.push('Keine ## Abschnitte gefunden')
  if (text.trim().length < 100) issues.push(`Sehr kurz (${text.trim().length} Zeichen)`)

  const passed = hasTitle && h2Count > 0 && text.trim().length >= 100

  let details = passed
    ? `llms.txt vorhanden (${text.length} Zeichen, ${h2Count} Abschnitte`
    : `llms.txt gefunden, aber nicht spec-konform: ${issues.join('; ')}`

  if (linkCount > 0) details += `, ${linkCount} Links`
  if (hasBlockquote) details += ', Beschreibung vorhanden'
  if (passed) details += ')'

  return {
    id: 'llms-txt',
    title: 'llms.txt vorhanden',
    description:
      'Prüft, ob unter /{domain}/llms.txt eine maschinenlesbare Beschreibung existiert. ' +
      'Lighthouse erwartet eine Markdown-Datei mit mindestens einem # Titel und beschreibendem Inhalt.',
    passed,
    details,
    learnMoreUrl: 'https://llmstxt.org/',
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 2: Registered WebMCP tools
   Real Lighthouse audit: "Registered WebMCP tools"
   Checks for declarative (<template data-webmcp-tool>) or
   imperative (navigator.ai.registerTool) WebMCP registrations.
   ═══════════════════════════════════════════════════════════════ */

function auditWebMcpRegistered(html: string): AuditResult {
  if (!html) {
    return {
      id: 'webmcp-registered',
      title: 'Registrierte WebMCP-Tools',
      description:
        'Prüft, ob die Website WebMCP-Tools registriert hat — entweder deklarativ via ' +
        '<template data-webmcp-tool> oder imperativ via navigator.ai.registerTool().',
      passed: false,
      details: 'Website nicht erreichbar — konnte nicht auf WebMCP-Tools prüfen',
      learnMoreUrl: 'https://AminFazl.github.io/WebMCP/',
    }
  }

  // Check for declarative WebMCP: <template data-webmcp-tool="...">
  const declarativePattern = /data-webmcp-tool/gi
  const declarativeMatches = html.match(declarativePattern) || []

  // Check for imperative WebMCP: navigator.ai.registerTool
  const imperativePattern = /navigator\.ai\.registerTool/gi
  const imperativeMatches = html.match(imperativePattern) || []

  // Also check for WebMCP meta tags or link references
  const webmcpMeta = /webmcp/gi
  const webmcpRefs = html.match(webmcpMeta) || []

  const declarativeCount = declarativeMatches.length
  const imperativeCount = imperativeMatches.length
  const totalTools = declarativeCount + imperativeCount

  const passed = totalTools > 0

  let details: string
  if (passed) {
    const parts: string[] = []
    if (declarativeCount > 0) parts.push(`${declarativeCount} deklarativ (data-webmcp-tool)`)
    if (imperativeCount > 0) parts.push(`${imperativeCount} imperativ (navigator.ai.registerTool)`)
    details = `${totalTools} WebMCP-Tool(s) registriert: ${parts.join(', ')}`
  } else {
    details = webmcpRefs.length > 0
      ? 'WebMCP-Referenzen im HTML gefunden, aber keine Tool-Registrierungen. Nutzen Sie <template data-webmcp-tool="name"> für deklarative Tools.'
      : 'Keine WebMCP-Tool-Registrierungen gefunden. Lighthouse erwartet mindestens ein Tool via <template data-webmcp-tool> oder navigator.ai.registerTool().'
  }

  return {
    id: 'webmcp-registered',
    title: 'Registrierte WebMCP-Tools',
    description:
      'Prüft, ob die Website WebMCP-Tools registriert hat — entweder deklarativ via ' +
      '<template data-webmcp-tool> oder imperativ via navigator.ai.registerTool().',
    passed,
    details,
    learnMoreUrl: 'https://AminFazl.github.io/WebMCP/',
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 3: Forms missing declarative WebMCP
   Real Lighthouse audit: "Forms missing declarative WebMCP"
   Checks if <form> elements have WebMCP annotations.
   ═══════════════════════════════════════════════════════════════ */

function auditWebMcpForms(html: string): AuditResult {
  if (!html) {
    return {
      id: 'webmcp-forms',
      title: 'Formulare mit WebMCP-Annotationen',
      description:
        'Prüft, ob alle <form>-Elemente auf der Seite deklarative WebMCP-Annotationen haben, ' +
        'damit KI-Agenten Formulare verstehen und ausfüllen können.',
      passed: null,
      details: 'Website nicht erreichbar — konnte nicht auf Formulare prüfen',
    }
  }

  // Count forms
  const formPattern = /<form[\s>]/gi
  const forms = html.match(formPattern) || []
  const formCount = forms.length

  if (formCount === 0) {
    return {
      id: 'webmcp-forms',
      title: 'Formulare mit WebMCP-Annotationen',
      description:
        'Prüft, ob alle <form>-Elemente auf der Seite deklarative WebMCP-Annotationen haben, ' +
        'damit KI-Agenten Formulare verstehen und ausfüllen können.',
      passed: null, // No forms = N/A
      details: 'Keine Formulare auf der Seite gefunden — Audit nicht anwendbar.',
    }
  }

  // Check if forms have WebMCP annotations nearby
  // Look for data-webmcp-tool attributes near/inside form elements
  const formWebMcpPattern = /<form[^>]*data-webmcp|data-webmcp-tool[^>]*>[\s\S]*?<form|<template[^>]*data-webmcp-tool[\s\S]*?<\/template>[\s]*<form/gi
  const annotatedForms = html.match(formWebMcpPattern) || []

  // Simpler check: count templates with data-webmcp-tool that seem form-related
  const webmcpTemplates = (html.match(/<template[^>]*data-webmcp-tool/gi) || []).length

  // If we have at least as many WebMCP templates as forms, likely covered
  const passed = webmcpTemplates >= formCount || annotatedForms.length > 0

  return {
    id: 'webmcp-forms',
    title: 'Formulare mit WebMCP-Annotationen',
    description:
      'Prüft, ob alle <form>-Elemente auf der Seite deklarative WebMCP-Annotationen haben, ' +
      'damit KI-Agenten Formulare verstehen und ausfüllen können.',
    passed,
    details: passed
      ? `${formCount} Formular(e) gefunden, WebMCP-Annotationen vorhanden.`
      : `${formCount} Formular(e) gefunden, aber keine deklarativen WebMCP-Annotationen (<template data-webmcp-tool>). ` +
        `Agenten können diese Formulare nicht automatisch ausfüllen.`,
    learnMoreUrl: 'https://AminFazl.github.io/WebMCP/',
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 4: WebMCP schema validity
   Real Lighthouse audit: "WebMCP schema validity"
   Validates the structure of WebMCP tool declarations.
   ═══════════════════════════════════════════════════════════════ */

function auditWebMcpSchema(html: string): AuditResult {
  if (!html) {
    return {
      id: 'webmcp-schema',
      title: 'WebMCP-Schema gültig',
      description:
        'Prüft, ob die deklarierten WebMCP-Tools eine gültige Schema-Struktur haben ' +
        '(korrekte Attribute, Typ-Annotationen, beschreibende Inhalte).',
      passed: null,
      details: 'Website nicht erreichbar',
    }
  }

  // Extract all WebMCP template declarations
  const templatePattern = /<template[^>]*data-webmcp-tool[^>]*>[\s\S]*?<\/template>/gi
  const templates = html.match(templatePattern) || []

  if (templates.length === 0) {
    // Check if imperative tools exist (we can't validate schema for those from HTML alone)
    const hasImperative = /navigator\.ai\.registerTool/i.test(html)
    if (hasImperative) {
      return {
        id: 'webmcp-schema',
        title: 'WebMCP-Schema gültig',
        description:
          'Prüft, ob die deklarierten WebMCP-Tools eine gültige Schema-Struktur haben ' +
          '(korrekte Attribute, Typ-Annotationen, beschreibende Inhalte).',
        passed: null,
        details: 'Nur imperative WebMCP-Tools gefunden — Schema-Validierung erfordert deklarative Templates.',
      }
    }

    return {
      id: 'webmcp-schema',
      title: 'WebMCP-Schema gültig',
      description:
        'Prüft, ob die deklarierten WebMCP-Tools eine gültige Schema-Struktur haben ' +
        '(korrekte Attribute, Typ-Annotationen, beschreibende Inhalte).',
      passed: null,
      details: 'Keine WebMCP-Tool-Deklarationen gefunden — Audit nicht anwendbar.',
    }
  }

  // Validate each template
  const issues: string[] = []
  let validCount = 0

  for (const tpl of templates) {
    // Check required attribute: data-webmcp-tool="name"
    const nameMatch = tpl.match(/data-webmcp-tool=["']([^"']+)["']/i)
    if (!nameMatch || !nameMatch[1].trim()) {
      issues.push('Tool ohne Namen (data-webmcp-tool ist leer)')
      continue
    }

    const toolName = nameMatch[1]

    // Check for description attribute
    const hasDescription = /data-webmcp-description/i.test(tpl)
    if (!hasDescription) {
      issues.push(`"${toolName}": Keine Beschreibung (data-webmcp-description fehlt)`)
    }

    // Check for input/param definitions (should have data-webmcp-param or similar)
    const hasParams = /data-webmcp-param|data-webmcp-input|<input|<select|<textarea/i.test(tpl)

    if (hasDescription || hasParams) {
      validCount++
    }
  }

  const passed = issues.length === 0 && validCount === templates.length

  return {
    id: 'webmcp-schema',
    title: 'WebMCP-Schema gültig',
    description:
      'Prüft, ob die deklarierten WebMCP-Tools eine gültige Schema-Struktur haben ' +
      '(korrekte Attribute, Typ-Annotationen, beschreibende Inhalte).',
    passed,
    details: passed
      ? `${templates.length} WebMCP-Template(s) mit gültigem Schema.`
      : issues.length > 0
        ? `Schema-Probleme: ${issues.join('; ')}`
        : `${validCount}/${templates.length} Templates validiert.`,
    learnMoreUrl: 'https://AminFazl.github.io/WebMCP/',
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 5: Accessibility for agents
   Real Lighthouse audit: "Accessibility for agents"
   Checks for a usable accessibility tree (ARIA roles, labels,
   semantic HTML) that enables machine interaction.
   ═══════════════════════════════════════════════════════════════ */

function auditAgentAccessibility(html: string): AuditResult {
  if (!html) {
    return {
      id: 'agent-a11y',
      title: 'Barrierefreiheit für Agenten',
      description:
        'Prüft, ob die Seite einen nutzbaren Accessibility-Tree bereitstellt: ARIA-Rollen, ' +
        'Labels, semantisches HTML. Agenten navigieren Websites über den A11y-Tree, nicht visuell.',
      passed: false,
      details: 'Website nicht erreichbar',
      learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring',
    }
  }

  // Score based on accessibility best practices relevant to agents
  let score = 0
  const maxScore = 10
  const findings: string[] = []
  const issues: string[] = []

  // 1. Semantic landmarks (nav, main, header, footer, aside, section)
  const landmarks = ['<nav', '<main', '<header', '<footer', '<aside', '<section']
  const foundLandmarks = landmarks.filter((l) => html.toLowerCase().includes(l))
  if (foundLandmarks.length >= 3) {
    score += 2
    findings.push(`${foundLandmarks.length} semantische Landmarks`)
  } else {
    issues.push(`Nur ${foundLandmarks.length} Landmarks (mind. 3 empfohlen: nav, main, header/footer)`)
  }

  // 2. ARIA roles
  const ariaRoles = (html.match(/role=["'][^"']+["']/gi) || []).length
  if (ariaRoles >= 3) {
    score += 2
    findings.push(`${ariaRoles} ARIA-Roles`)
  } else if (ariaRoles > 0) {
    score += 1
    issues.push(`Nur ${ariaRoles} ARIA-Roles (mind. 3 empfohlen)`)
  } else {
    issues.push('Keine ARIA-Roles gefunden')
  }

  // 3. ARIA labels (aria-label, aria-labelledby, aria-describedby)
  const ariaLabels = (html.match(/aria-label(?:ledby|edby)?=["'][^"']+["']/gi) || []).length
  if (ariaLabels >= 5) {
    score += 2
    findings.push(`${ariaLabels} ARIA-Labels`)
  } else if (ariaLabels > 0) {
    score += 1
    issues.push(`Nur ${ariaLabels} ARIA-Labels (mind. 5 empfohlen)`)
  } else {
    issues.push('Keine ARIA-Labels gefunden')
  }

  // 4. Heading hierarchy (h1, h2, h3)
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length
  const h3Count = (html.match(/<h3[\s>]/gi) || []).length
  if (h1Count >= 1 && h2Count >= 1) {
    score += 2
    findings.push(`Heading-Hierarchie: ${h1Count}×h1, ${h2Count}×h2, ${h3Count}×h3`)
  } else {
    issues.push('Unvollständige Heading-Hierarchie')
  }

  // 5. Form labels — buttons/inputs with labels or aria-label
  const inputs = (html.match(/<input[\s>]/gi) || []).length
  const buttons = (html.match(/<button[\s>]/gi) || []).length
  const labels = (html.match(/<label[\s>]/gi) || []).length
  if (inputs + buttons > 0) {
    if (labels >= inputs || ariaLabels > inputs) {
      score += 2
      findings.push(`${inputs} Inputs, ${labels} Labels, ${buttons} Buttons — gut beschriftet`)
    } else {
      score += 1
      issues.push(`${inputs} Inputs, aber nur ${labels} Labels — einige nicht beschriftet`)
    }
  } else {
    score += 2 // No interactive elements = no issue
    findings.push('Keine unbeschrifteten interaktiven Elemente')
  }

  // Threshold: 7/10 = pass
  const passed = score >= 7

  const detailParts: string[] = []
  if (findings.length > 0) detailParts.push(findings.join(' · '))
  if (issues.length > 0) detailParts.push(`Verbesserungsbedarf: ${issues.join('; ')}`)
  detailParts.push(`Score: ${score}/${maxScore}`)

  return {
    id: 'agent-a11y',
    title: 'Barrierefreiheit für Agenten',
    description:
      'Prüft, ob die Seite einen nutzbaren Accessibility-Tree bereitstellt: ARIA-Rollen, ' +
      'Labels, semantisches HTML. Agenten navigieren Websites über den A11y-Tree, nicht visuell.',
    passed,
    details: detailParts.join(' — '),
    learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring',
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 6: Layout stability (CLS)
   Real Lighthouse audit: "Layout stability"
   Checks for layout shift indicators in the HTML — inline sizes,
   aspect ratios, font-display, no layout-shifting patterns.
   ═══════════════════════════════════════════════════════════════ */

function auditLayoutStability(html: string): AuditResult {
  if (!html) {
    return {
      id: 'layout-stability',
      title: 'Layout-Stabilität (CLS)',
      description:
        'Prüft Indikatoren für stabile Layouts: Bilder mit width/height, font-display:swap, ' +
        'keine bekannten CLS-verursachenden Patterns. Agenten brauchen stabile Layouts für zuverlässige Interaktion.',
      passed: false,
      details: 'Website nicht erreichbar',
      learnMoreUrl: 'https://web.dev/articles/cls',
    }
  }

  let score = 0
  const maxScore = 8
  const findings: string[] = []
  const issues: string[] = []

  // 1. Images with explicit width/height attributes (prevents CLS)
  const imgTags = html.match(/<img[^>]*>/gi) || []
  const imgCount = imgTags.length
  if (imgCount > 0) {
    const imgWithDimensions = imgTags.filter(
      (img) => /width\s*=/.test(img) && /height\s*=/.test(img)
    ).length
    const ratio = imgCount > 0 ? imgWithDimensions / imgCount : 1
    if (ratio >= 0.8) {
      score += 3
      findings.push(`${imgWithDimensions}/${imgCount} Bilder mit Dimensionen`)
    } else if (ratio >= 0.5) {
      score += 1
      issues.push(`Nur ${imgWithDimensions}/${imgCount} Bilder mit width/height`)
    } else {
      issues.push(`${imgCount - imgWithDimensions}/${imgCount} Bilder ohne Dimensionen — CLS-Risiko`)
    }
  } else {
    score += 3 // No images = no CLS from images
    findings.push('Keine Bilder ohne Dimensionen')
  }

  // 2. font-display: swap or optional (prevents FOIT/CLS)
  const hasFontDisplay = /font-display\s*:\s*(swap|optional|fallback)/i.test(html)
  const usesGoogleFonts = /fonts\.googleapis\.com/i.test(html)
  const fontDisplayInLink = /&display=(swap|optional|fallback)/i.test(html)

  if (hasFontDisplay || fontDisplayInLink) {
    score += 2
    findings.push('font-display korrekt gesetzt')
  } else if (usesGoogleFonts) {
    issues.push('Google Fonts ohne display=swap — FOIT-Risiko')
  } else {
    score += 2 // No custom fonts = no issue
    findings.push('Keine Webfonts ohne font-display')
  }

  // 3. Viewport meta tag (basic but important)
  const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html)
  if (hasViewport) {
    score += 1
    findings.push('Viewport-Meta vorhanden')
  } else {
    issues.push('Kein Viewport-Meta-Tag')
  }

  // 4. No document.write or blocking patterns
  const hasDocWrite = /document\.write\s*\(/i.test(html)
  if (!hasDocWrite) {
    score += 2
    findings.push('Kein document.write()')
  } else {
    issues.push('document.write() gefunden — blockiert Rendering und verursacht Layout-Shifts')
  }

  // Threshold: 6/8 = pass
  const passed = score >= 6

  const detailParts: string[] = []
  if (findings.length > 0) detailParts.push(findings.join(' · '))
  if (issues.length > 0) detailParts.push(`Verbesserungsbedarf: ${issues.join('; ')}`)
  detailParts.push(`Score: ${score}/${maxScore}`)

  return {
    id: 'layout-stability',
    title: 'Layout-Stabilität (CLS)',
    description:
      'Prüft Indikatoren für stabile Layouts: Bilder mit width/height, font-display:swap, ' +
      'keine bekannten CLS-verursachenden Patterns. Agenten brauchen stabile Layouts für zuverlässige Interaktion.',
    passed,
    details: detailParts.join(' — '),
    learnMoreUrl: 'https://web.dev/articles/cls',
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
  // Fetch HTML once, then reuse for multiple audits
  const [llmsTxtAudit, html] = await Promise.all([
    auditLlmsTxt(domain),
    safeFetchHtml(domain),
  ])

  // HTML-based audits (no additional fetches needed)
  const webMcpRegisteredAudit = auditWebMcpRegistered(html)
  const webMcpFormsAudit = auditWebMcpForms(html)
  const webMcpSchemaAudit = auditWebMcpSchema(html)
  const a11yAudit = auditAgentAccessibility(html)
  const layoutAudit = auditLayoutStability(html)

  const audits: AuditResult[] = [
    llmsTxtAudit,
    webMcpRegisteredAudit,
    webMcpFormsAudit,
    webMcpSchemaAudit,
    a11yAudit,
    layoutAudit,
  ]

  // Calculate pass ratio (excluding skipped/null audits)
  const gradedAudits = audits.filter((a) => a.passed !== null)
  const passedCount = audits.filter((a) => a.passed === true).length
  const skippedCount = audits.filter((a) => a.passed === null).length

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
