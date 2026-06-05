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
   Spec (May 2026): https://developer.chrome.com/docs/lighthouse/agentic-browsing/registered-webmcp-tools
   Checks for:
     - Declarative API: <form toolname="..." tooldescription="...">
     - Imperative API: navigator.modelContext.registerTool(...)
   Legacy: also detects <template data-webmcp-tool> (old spec)
   ═══════════════════════════════════════════════════════════════ */

function auditWebMcpRegistered(html: string): AuditResult {
  const LEARN_MORE = 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/registered-webmcp-tools'
  const BASE_DESC =
    'Prüft, ob die Website WebMCP-Tools registriert hat — deklarativ via ' +
    'toolname/tooldescription auf <form>-Elementen oder imperativ via navigator.modelContext.registerTool().'

  if (!html) {
    return {
      id: 'webmcp-registered',
      title: 'Registrierte WebMCP-Tools',
      description: BASE_DESC,
      passed: false,
      details: 'Website nicht erreichbar — konnte nicht auf WebMCP-Tools prüfen',
      learnMoreUrl: LEARN_MORE,
    }
  }

  // ── Declarative API (current spec): <form toolname="..." tooldescription="...">
  const formToolPattern = /<form[^>]*\btoolname\s*=\s*["']([^"']+)["'][^>]*/gi
  const declarativeForms = html.match(formToolPattern) || []
  const declarativeCount = declarativeForms.length

  // ── Imperative API (current spec): navigator.modelContext.registerTool
  const imperativePattern = /navigator\.modelContext\.registerTool/gi
  const imperativeMatches = html.match(imperativePattern) || []
  const imperativeCount = imperativeMatches.length

  // ── Legacy: <template data-webmcp-tool> (old spec, still counted)
  const legacyPattern = /data-webmcp-tool/gi
  const legacyMatches = html.match(legacyPattern) || []
  const legacyCount = legacyMatches.length

  // ── Legacy: navigator.ai.registerTool (old API name)
  const legacyImperative = /navigator\.ai\.registerTool/gi
  const legacyImpMatches = html.match(legacyImperative) || []
  const legacyImpCount = legacyImpMatches.length

  const totalTools = declarativeCount + imperativeCount + legacyCount + legacyImpCount
  const passed = totalTools > 0

  let details: string
  if (passed) {
    const parts: string[] = []
    if (declarativeCount > 0) parts.push(`${declarativeCount}× deklarativ (toolname auf <form>)`)
    if (imperativeCount > 0) parts.push(`${imperativeCount}× imperativ (navigator.modelContext.registerTool)`)
    if (legacyCount > 0) parts.push(`${legacyCount}× Legacy (data-webmcp-tool — bitte auf toolname migrieren)`)
    if (legacyImpCount > 0) parts.push(`${legacyImpCount}× Legacy (navigator.ai.registerTool)`)
    details = `${totalTools} WebMCP-Tool(s) registriert: ${parts.join(', ')}`
  } else {
    details =
      'Keine WebMCP-Tool-Registrierungen gefunden. ' +
      'Fügen Sie toolname und tooldescription Attribute auf Ihren <form>-Elementen hinzu, ' +
      'oder nutzen Sie navigator.modelContext.registerTool() für die imperative API.'
  }

  return {
    id: 'webmcp-registered',
    title: 'Registrierte WebMCP-Tools',
    description: BASE_DESC,
    passed,
    details,
    learnMoreUrl: LEARN_MORE,
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 3: Forms missing declarative WebMCP
   Real Lighthouse audit: "Forms missing declarative WebMCP"
   Spec: https://developer.chrome.com/docs/lighthouse/agentic-browsing/forms-missing-declarative-webmcp
   Checks if <form> elements have both toolname AND tooldescription.
   ═══════════════════════════════════════════════════════════════ */

function auditWebMcpForms(html: string): AuditResult {
  const LEARN_MORE = 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/forms-missing-declarative-webmcp'
  const BASE_DESC =
    'Prüft, ob alle <form>-Elemente auf der Seite sowohl toolname als auch tooldescription haben, ' +
    'damit KI-Agenten Formulare verstehen und automatisch ausfüllen können.'

  if (!html) {
    return {
      id: 'webmcp-forms',
      title: 'Formulare mit WebMCP-Annotationen',
      description: BASE_DESC,
      passed: null,
      details: 'Website nicht erreichbar — konnte nicht auf Formulare prüfen',
      learnMoreUrl: LEARN_MORE,
    }
  }

  // Extract all <form ...> opening tags
  const formTagPattern = /<form\b[^>]*>/gi
  const formTags = html.match(formTagPattern) || []
  const formCount = formTags.length

  if (formCount === 0) {
    return {
      id: 'webmcp-forms',
      title: 'Formulare mit WebMCP-Annotationen',
      description: BASE_DESC,
      passed: null,
      details: 'Keine Formulare auf der Seite gefunden — Audit nicht anwendbar.',
      learnMoreUrl: LEARN_MORE,
    }
  }

  // Check each form for toolname + tooldescription
  let annotatedCount = 0
  let partialCount = 0 // has one but not both

  for (const tag of formTags) {
    const hasToolname = /\btoolname\s*=/i.test(tag)
    const hasTooldescription = /\btooldescription\s*=/i.test(tag)
    // Also accept legacy data-webmcp-tool as partial credit
    const hasLegacy = /data-webmcp-tool/i.test(tag)

    if (hasToolname && hasTooldescription) {
      annotatedCount++
    } else if (hasToolname || hasTooldescription || hasLegacy) {
      partialCount++
    }
  }

  const passed = annotatedCount === formCount

  let details: string
  if (passed) {
    details = `${formCount} Formular(e) gefunden — alle mit toolname + tooldescription annotiert.`
  } else if (annotatedCount > 0 || partialCount > 0) {
    const parts: string[] = []
    if (annotatedCount > 0) parts.push(`${annotatedCount} vollständig annotiert`)
    if (partialCount > 0) parts.push(`${partialCount} unvollständig (toolname oder tooldescription fehlt)`)
    parts.push(`${formCount - annotatedCount - partialCount} ohne Annotationen`)
    details = `${formCount} Formular(e) gefunden: ${parts.join(', ')}. ` +
      'Jedes <form> braucht sowohl toolname als auch tooldescription.'
  } else {
    details = `${formCount} Formular(e) gefunden, aber keines mit WebMCP-Annotationen. ` +
      'Fügen Sie toolname="..." und tooldescription="..." auf Ihren <form>-Elementen hinzu.'
  }

  return {
    id: 'webmcp-forms',
    title: 'Formulare mit WebMCP-Annotationen',
    description: BASE_DESC,
    passed,
    details,
    learnMoreUrl: LEARN_MORE,
  }
}

/* ═══════════════════════════════════════════════════════════════
   Audit 4: WebMCP schema validity
   Real Lighthouse audit: "WebMCP schema validity"
   Spec: https://developer.chrome.com/docs/lighthouse/agentic-browsing/webmcp-schema-validity
   Checks:
     - Every form with toolname also has tooldescription (and vice versa)
     - Required fields have a name attribute
     - Inputs have toolparamdescription or an associated <label>
   ═══════════════════════════════════════════════════════════════ */

function auditWebMcpSchema(html: string): AuditResult {
  const LEARN_MORE = 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/webmcp-schema-validity'
  const BASE_DESC =
    'Prüft, ob die deklarierten WebMCP-Formulare eine gültige Schema-Struktur haben: ' +
    'toolname + tooldescription auf <form>, name auf allen Inputs, toolparamdescription für Parameterhinweise.'

  if (!html) {
    return {
      id: 'webmcp-schema',
      title: 'WebMCP-Schema gültig',
      description: BASE_DESC,
      passed: null,
      details: 'Website nicht erreichbar',
      learnMoreUrl: LEARN_MORE,
    }
  }

  // Extract form blocks: <form ...>...</form>
  // Use a simpler approach: find forms with toolname or tooldescription
  const formTagPattern = /<form\b[^>]*>/gi
  const formTags = html.match(formTagPattern) || []

  // Filter to forms that have at least one WebMCP attribute
  const webmcpForms = formTags.filter(
    (tag) => /\btoolname\s*=/i.test(tag) || /\btooldescription\s*=/i.test(tag)
  )

  if (webmcpForms.length === 0) {
    // Check for imperative or legacy
    const hasImperative = /navigator\.modelContext\.registerTool|navigator\.ai\.registerTool/i.test(html)
    if (hasImperative) {
      return {
        id: 'webmcp-schema',
        title: 'WebMCP-Schema gültig',
        description: BASE_DESC,
        passed: null,
        details: 'Nur imperative WebMCP-Tools gefunden — Schema-Validierung gilt nur für deklarative Formulare.',
        learnMoreUrl: LEARN_MORE,
      }
    }

    return {
      id: 'webmcp-schema',
      title: 'WebMCP-Schema gültig',
      description: BASE_DESC,
      passed: null,
      details: 'Keine WebMCP-annotierten Formulare gefunden — Audit nicht anwendbar.',
      learnMoreUrl: LEARN_MORE,
    }
  }

  // Validate each annotated form tag
  const issues: string[] = []
  let validCount = 0

  for (const tag of webmcpForms) {
    const hasToolname = /\btoolname\s*=\s*["']([^"']+)["']/i.test(tag)
    const hasTooldescription = /\btooldescription\s*=/i.test(tag)
    const toolnameMatch = tag.match(/\btoolname\s*=\s*["']([^"']+)["']/i)
    const toolName = toolnameMatch?.[1] || '(unbenannt)'

    if (hasToolname && !hasTooldescription) {
      issues.push(`"${toolName}": toolname vorhanden, aber tooldescription fehlt`)
    } else if (!hasToolname && hasTooldescription) {
      issues.push('Formular mit tooldescription, aber ohne toolname')
    } else {
      validCount++
    }
  }

  // Also check inputs within annotated forms for name + toolparamdescription
  // Extract form blocks that contain toolname
  const formBlockPattern = /<form\b[^>]*\btoolname\s*=[^>]*>[\s\S]*?<\/form>/gi
  const formBlocks = html.match(formBlockPattern) || []

  let inputsMissingName = 0
  let inputsWithoutParamDesc = 0
  let totalInputs = 0

  for (const block of formBlocks) {
    // Find all inputs, selects, textareas
    const inputPattern = /<(?:input|select|textarea)\b[^>]*>/gi
    const inputs = block.match(inputPattern) || []

    for (const inp of inputs) {
      // Skip hidden, submit, button types
      if (/type\s*=\s*["'](?:hidden|submit|button|reset|image)["']/i.test(inp)) continue
      totalInputs++

      const hasName = /\bname\s*=/i.test(inp)
      if (!hasName) inputsMissingName++

      const hasParamDesc = /\btoolparamdescription\s*=/i.test(inp)
      if (!hasParamDesc) inputsWithoutParamDesc++
    }
  }

  if (inputsMissingName > 0) {
    issues.push(`${inputsMissingName} Input(s) ohne name-Attribut — Pflichtfeld für WebMCP`)
  }

  const passed = issues.length === 0 && validCount === webmcpForms.length

  const detailParts: string[] = []
  if (validCount > 0) detailParts.push(`${validCount}/${webmcpForms.length} Formular(e) korrekt annotiert`)
  if (totalInputs > 0) {
    const described = totalInputs - inputsWithoutParamDesc
    detailParts.push(`${described}/${totalInputs} Input(s) mit toolparamdescription`)
  }
  if (issues.length > 0) detailParts.push(`Probleme: ${issues.join('; ')}`)
  if (inputsWithoutParamDesc > 0 && inputsMissingName === 0) {
    detailParts.push(`Hinweis: ${inputsWithoutParamDesc} Input(s) ohne toolparamdescription — empfohlen für bessere Agent-Interaktion`)
  }

  return {
    id: 'webmcp-schema',
    title: 'WebMCP-Schema gültig',
    description: BASE_DESC,
    passed,
    details: detailParts.join('. ') + '.',
    learnMoreUrl: LEARN_MORE,
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
      learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/accessibility-for-agents',
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
    learnMoreUrl: 'https://developer.chrome.com/docs/lighthouse/agentic-browsing/accessibility-for-agents',
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
