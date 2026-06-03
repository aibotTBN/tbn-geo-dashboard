'use client'

import { useState } from 'react'
import { Info, X, Eye, Shield, FileText, Sparkles, Clock, ChevronDown, ChevronUp, ExternalLink, Bot } from 'lucide-react'

/**
 * Methodology data for each GEO Score dimension.
 */
const DIMENSIONS: {
  key: string
  label: string
  maxScore: number
  icon: React.ElementType
  color: string
  shortDesc: string
  methodology: string
  criteria: string[]
  dataSource: string
  tip: string
}[] = [
  {
    key: 'citation',
    label: 'KI-Sichtbarkeit',
    maxScore: 30,
    icon: Eye,
    color: 'text-blue-600',
    shortDesc: 'Wie oft wird Ihr Unternehmen von KI-Systemen erwähnt und empfohlen?',
    methodology:
      'Wir generieren 10 branchenspezifische Fragen, die potenzielle Kunden an KI-Assistenten stellen würden (z.B. „Welche PR-Agenturen in Deutschland sind auf B2B spezialisiert?"). Diese Fragen werden an 4 KI-Systeme gesendet: ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google) und Perplexity. Für jede Antwort prüfen wir: Wird Ihr Unternehmen namentlich erwähnt? Wird es empfohlen? Wird es als Quelle zitiert?',
    criteria: [
      'Namentliche Erwähnung in KI-Antworten (pro Engine)',
      'Empfehlung als relevanter Anbieter',
      'Zitation als Quelle / Verweis auf Website',
      'Konsistenz über alle 4 Engines hinweg',
    ],
    dataSource: 'Live-Abfragen an OpenAI GPT-4, Anthropic Claude, Google Gemini, Perplexity Sonar',
    tip: 'Die KI-Sichtbarkeit verbessern Sie am schnellsten durch strukturierte Inhalte (Knowledge Base, Schema.org) und regelmäßige, hochwertige Fachpublikationen.',
  },
  {
    key: 'tech',
    label: 'Technische GEO-Dateien',
    maxScore: 20,
    icon: Shield,
    color: 'text-indigo-600',
    shortDesc: 'Sind die technischen Voraussetzungen für KI-Crawler erfüllt?',
    methodology:
      'Wir prüfen Ihre Website auf die technischen Dateien und Konfigurationen, die KI-Crawler benötigen, um Ihre Inhalte zu indexieren. Dazu gehören klassische SEO-Grundlagen (robots.txt, Sitemap, SSL) sowie neue KI-spezifische Standards (llms.txt, mcp.json, agent-card.json).',
    criteria: [
      'robots.txt vorhanden und KI-Crawler nicht blockiert',
      'XML-Sitemap vorhanden und aktuell',
      'SSL/HTTPS aktiv',
      'llms.txt vorhanden (natürlichsprachliches Unternehmensprofil für LLMs)',
      'mcp.json Discovery-Datei (MCP-Server-Endpunkt)',
      'agent-card.json (Agent-to-Agent Kommunikation)',
      'Meta-Tags optimiert (title, description, Open Graph)',
    ],
    dataSource: 'Direkter Crawl Ihrer Website (HTTP-Requests an /.well-known/ Pfade, Sitemap, robots.txt)',
    tip: 'Die neuen KI-Dateien (llms.txt, mcp.json) sind der schnellste Weg, Ihre technische Score zu verbessern. LLM Radar generiert diese automatisch aus Ihrer Knowledge Base.',
  },
  {
    key: 'schema',
    label: 'Schema Markup',
    maxScore: 20,
    icon: FileText,
    color: 'text-purple-600',
    shortDesc: 'Wie gut sind Ihre strukturierten Daten für Google AI und KI-Systeme?',
    methodology:
      'Wir analysieren die JSON-LD / Schema.org Markup-Daten auf Ihrer Website. Strukturierte Daten helfen Google AI Overviews und anderen KI-Systemen, Ihre Inhalte korrekt zu verstehen — ohne zu raten oder zu halluzinieren.',
    criteria: [
      'Organization-Schema vorhanden (Name, Beschreibung, Kontakt)',
      'Service/Product-Schemas (Leistungen korrekt beschrieben)',
      'FAQPage-Schema (häufige Fragen maschinenlesbar)',
      'Person-Schema (Team, Ansprechpartner)',
      'Article/BlogPosting-Schema (Fachbeiträge)',
      'Breadcrumb und Navigation-Schema',
      'Korrekte Syntax (valides JSON-LD)',
    ],
    dataSource: 'Parsing des HTML-Quellcodes aller gecrawlten Seiten, JSON-LD Extraktion und Validierung',
    tip: 'LLM Radar generiert Schema.org-Markup direkt aus Ihrer Knowledge Base. Sie müssen den generierten Code nur in Ihre Website einbetten.',
  },
  {
    key: 'content',
    label: 'Content-Qualität',
    maxScore: 15,
    icon: Sparkles,
    color: 'text-amber-600',
    shortDesc: 'Wie hochwertig und relevant sind Ihre Website-Inhalte für KI-Systeme?',
    methodology:
      'Wir bewerten die Qualität Ihrer Inhalte anhand von Kriterien, die KI-Systeme bei der Auswahl von Quellen und Empfehlungen nutzen. Dazu gehören inhaltliche Tiefe, Fachkompetenz-Signale, Strukturierung und Einzigartigkeit.',
    criteria: [
      'Inhaltliche Tiefe (nicht nur oberflächliche Texte)',
      'Fachkompetenz-Signale (Autorschaft, Expertise, Referenzen)',
      'Strukturierung (Überschriften-Hierarchie, Absätze, Listen)',
      'Einzigartigkeit (kein Duplicate Content)',
      'Thematische Abdeckung der Kernthemen',
    ],
    dataSource: 'KI-gestützte Analyse der gecrawlten Seiteninhalte (Text, Überschriften, Strukturelemente)',
    tip: 'Erstellen Sie regelmäßig Fachbeiträge mit klarer Autorschaft und strukturierten Inhalten. Case Studies und datengestützte Artikel haben die höchste Wirkung.',
  },
  {
    key: 'agentic',
    label: 'Agentic Browsing',
    maxScore: 0, // pass/fail, no point score
    icon: Bot,
    color: 'text-indigo-600',
    shortDesc: 'Ist Ihre Website bereit für KI-Agenten, die autonom im Web navigieren?',
    methodology:
      'Chrome Lighthouse enthält sechs „Agentic Browsing"-Audits (Pass/Fail). Diese prüfen, ob eine Website für autonome KI-Agenten navigierbar ist — über maschinenlesbare Beschreibungen, WebMCP-Tool-Registrierung, Barrierefreiheit und Layout-Stabilität.',
    criteria: [
      'llms.txt vorhanden und wohlgeformt (Markdown-Spec gemäß llmstxt.org)',
      'Registrierte WebMCP-Tools (deklarativ oder imperativ)',
      'Formulare mit WebMCP-Annotationen',
      'WebMCP-Schema-Validität',
      'Barrierefreiheit für Agenten (ARIA, Landmarks, Labels)',
      'Layout-Stabilität (CLS — Bilder mit Dimensionen, font-display)',
    ],
    dataSource: 'Direkter Check der Website: llms.txt-Datei, HTML-Struktur (WebMCP, A11y, CLS-Indikatoren) — gemäß Lighthouse Agentic Browsing Scoring',
    tip: 'WebMCP ist das Kernstück: Registrieren Sie Tools und annotieren Sie Formulare, damit KI-Agenten Ihre Website nutzen können. llms.txt aus dem Knowledge Layer ist der schnellste Quick Win.',
  },
  {
    key: 'fresh',
    label: 'Content-Freshness',
    maxScore: 15,
    icon: Clock,
    color: 'text-teal-600',
    shortDesc: 'Wie aktuell sind Ihre Inhalte?',
    methodology:
      'KI-Systeme bevorzugen aktuelle Quellen. Wir messen, wie frisch Ihre Inhalte sind — basierend auf Veröffentlichungsdaten, letzten Änderungen und der Aktualisierungsfrequenz.',
    criteria: [
      'Letzte Aktualisierung der Hauptseiten (< 6 Monate = gut)',
      'Blog/News-Aktivität (regelmäßige neue Beiträge)',
      'Sitemap-Freshness (<lastmod> Timestamps)',
      'Copyright-Jahr und Impressum aktuell',
      'Keine veralteten Informationen auf Kernseiten',
    ],
    dataSource: 'Analyse von <lastmod> in Sitemap, Veröffentlichungsdaten in Meta-Tags und Schema.org, HTTP Last-Modified Header',
    tip: 'Aktualisieren Sie Ihre wichtigsten Seiten mindestens quartalsweise. Ein aktiver Blog mit 2–4 Beiträgen pro Monat signalisiert Relevanz.',
  },
]

/**
 * Expandable methodology card for a single dimension.
 */
function DimensionCard({ dimension, isOpen, onToggle }: {
  dimension: typeof DIMENSIONS[0]
  isOpen: boolean
  onToggle: () => void
}) {
  const Icon = dimension.icon

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} className={dimension.color} />
          <span className="text-sm font-semibold text-gray-900">{dimension.label}</span>
          <span className="text-xs text-gray-400">max. {dimension.maxScore} Pkt.</span>
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">{dimension.methodology}</p>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prüfkriterien</p>
            <ul className="space-y-1">
              {dimension.criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 mt-0.5">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-600">Datenquelle:</strong> {dimension.dataSource}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-700">
              <strong>💡 Tipp:</strong> {dimension.tip}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Full methodology panel — shows all scoring dimensions with details.
 */
export function MethodologyPanel() {
  const [openDimensions, setOpenDimensions] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleDimension = (key: string) => {
    setOpenDimensions(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    if (openDimensions.size === DIMENSIONS.length) {
      setOpenDimensions(new Set())
    } else {
      setOpenDimensions(new Set(DIMENSIONS.map(d => d.key)))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">So bewerten wir Ihre KI-Sichtbarkeit</h3>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {openDimensions.size === DIMENSIONS.length ? 'Alle schließen' : 'Alle öffnen'}
        </button>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Der GEO Score (0–100) bewertet Ihre Website in 5 Dimensionen. Zusätzlich prüft der Lighthouse Agentic Browsing Check 
        6 Audits für KI-Agenten-Readiness (Pass/Fail). Klicken Sie auf eine Dimension, um die genauen Prüfkriterien und Datenquellen zu sehen.
      </p>

      <div className="space-y-2">
        {DIMENSIONS.map(dim => (
          <DimensionCard
            key={dim.key}
            dimension={dim}
            isOpen={openDimensions.has(dim.key)}
            onToggle={() => toggleDimension(dim.key)}
          />
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-600">Gewichtung:</strong> KI-Sichtbarkeit (30 Pkt.) hat das höchste Gewicht, 
          weil sie den direkten Effekt auf Kundenanfragen misst. Die technischen Dimensionen (Tech + Schema = 40 Pkt.) 
          bilden die Grundlage für nachhaltige Sichtbarkeit. Content-Qualität und Freshness (30 Pkt.) sichern die 
          langfristige Relevanz.
        </p>
      </div>
    </div>
  )
}

/**
 * Small info button that opens a tooltip/popover for a single dimension.
 * Use next to ScoreDimension labels.
 */
export function DimensionInfoButton({ dimensionKey }: { dimensionKey: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const dim = DIMENSIONS.find(d => d.key === dimensionKey)
  if (!dim) return null

  return (
    <span className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
        title="Wie wird das geprüft?"
      >
        <Info size={14} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          {/* Popover */}
          <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <dim.icon size={14} className={dim.color} />
                <span className="text-sm font-semibold text-gray-900">{dim.label}</span>
                <span className="text-xs text-gray-400">{dim.maxScore} Pkt.</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{dim.shortDesc}</p>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Prüfkriterien:</p>
              <ul className="space-y-0.5">
                {dim.criteria.slice(0, 4).map((c, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                    <span className="text-gray-300">•</span> {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-50 rounded-md px-2.5 py-1.5">
              <p className="text-[11px] text-blue-700">💡 {dim.tip}</p>
            </div>
          </div>
        </>
      )}
    </span>
  )
}
