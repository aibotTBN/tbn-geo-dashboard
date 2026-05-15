'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe2, Search, Loader2, ChevronRight, ChevronLeft, Check, AlertCircle,
  Pencil, X, Plus, Users, Sparkles, FileCode2, ArrowRight, Eye,
  Lightbulb, Info, CheckCircle2, AlertTriangle, Zap, ExternalLink,
} from 'lucide-react'

/* ─── Types ─── */

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

/* ─── Evaluation Criteria (from methodology) ─── */

const EVALUATION_DIMENSIONS = [
  {
    name: 'Citation Score',
    weight: '30%',
    icon: '🔍',
    description: 'Wie oft und wo wird Ihr Unternehmen in KI-Antworten erwähnt?',
    criteria: [
      'Erwähnung in GPT-4, Claude, Gemini & Perplexity',
      'Erwähnung bei branchenspezifischen Fragen',
      'Konsistenz über verschiedene Formulierungen',
    ],
  },
  {
    name: 'Technical SEO',
    weight: '20%',
    icon: '⚙️',
    description: 'Technische Grundlagen, die KI-Crawlern den Zugriff erleichtern.',
    criteria: [
      'robots.txt & Crawler-Zugänglichkeit',
      'llms.txt Datei vorhanden',
      'Sitemap & Seitenstruktur',
    ],
  },
  {
    name: 'Schema.org',
    weight: '20%',
    icon: '📋',
    description: 'Strukturierte Daten helfen KI-Systemen, Inhalte einzuordnen.',
    criteria: [
      'JSON-LD Markup vorhanden & valide',
      'Relevante Typen (Organization, FAQPage etc.)',
      'Vollständigkeit der Pflichtfelder',
    ],
  },
  {
    name: 'Content Quality',
    weight: '15%',
    icon: '📝',
    description: 'Qualität und Struktur der Inhalte für KI-Verständlichkeit.',
    criteria: [
      'Klare Heading-Struktur',
      'FAQ-Inhalte vorhanden',
      'Expertenwissen & E-E-A-T Signale',
    ],
  },
  {
    name: 'Freshness',
    weight: '15%',
    icon: '🕐',
    description: 'Aktualität der Inhalte — KI bevorzugt frische Quellen.',
    criteria: [
      'Regelmäßig aktualisierte Inhalte',
      'Aktuelle Datumsstempel',
      'News/Blog-Aktivität',
    ],
  },
]

/* ─── Step Indicator ─── */

function StepIndicator({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${i <= step ? 'text-radar-700' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
              ${i < step ? 'bg-radar-600 text-white border-radar-600' :
                i === step ? 'border-radar-600 text-radar-700 bg-radar-50' :
                'border-gray-300 text-gray-400'}`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${i <= step ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 ${i < step ? 'bg-radar-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Tag Input ─── */

function TagInput({
  tags, onTagsChange, placeholder, maxTags = 12,
}: {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
}) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const val = input.trim()
    if (val && !tags.includes(val) && tags.length < maxTags) {
      onTagsChange([...tags, val])
      setInput('')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-radar-50 text-radar-700 border border-radar-200 rounded-lg text-sm">
            {tag}
            <button onClick={() => onTagsChange(tags.filter((_, j) => j !== i))} className="hover:text-red-500 ml-0.5">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
        />
        <button
          onClick={addTag}
          disabled={!input.trim() || tags.length >= maxTags}
          className="px-3 py-2 text-sm font-medium text-radar-700 border border-radar-300 rounded-lg hover:bg-radar-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Main Wizard Component
   ═══════════════════════════════════════════ */

export function ProjectWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0: Domain input
  const [domainInput, setDomainInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  // Step 1: Editable fields from analysis
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIndustry, setEditIndustry] = useState('')
  const [editTopics, setEditTopics] = useState<string[]>([])

  // Step 2: Competitors
  const [competitors, setCompetitors] = useState<string[]>([])
  const [competitorInput, setCompetitorInput] = useState('')
  const [validatingComp, setValidatingComp] = useState<string | null>(null)

  // Step 3: Create
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [startDiagnosis, setStartDiagnosis] = useState(true)

  const stepLabels = ['Website', 'Projektdaten', 'Wettbewerber', 'Starten']

  /* ─── Step 0: Analyze Website ─── */

  const analyzeDomain = useCallback(async () => {
    const cleaned = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!cleaned) return

    setAnalyzing(true)
    setAnalyzeError('')

    try {
      const res = await fetch(`/api/geo/website-analyze?domain=${encodeURIComponent(cleaned)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Fehler ${res.status}`)
      }
      const result: AnalysisResult = await res.json()
      setAnalysis(result)

      // Pre-fill editable fields
      setEditName(result.name)
      setEditDescription(result.description)
      setEditIndustry(result.industry)
      setEditTopics(result.coreTopics)
      setCompetitors(result.suggestedCompetitors)

      // Move to next step
      setStep(1)
    } catch (e) {
      setAnalyzeError((e as Error).message)
    } finally {
      setAnalyzing(false)
    }
  }, [domainInput])

  /* ─── Step 2: Add Competitor ─── */

  const addCompetitor = useCallback(async () => {
    const cleaned = competitorInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!cleaned || competitors.includes(cleaned)) return

    setValidatingComp(cleaned)
    try {
      // Quick check if domain is reachable
      const res = await fetch(`/api/geo/website-analyze?domain=${encodeURIComponent(cleaned)}`)
      if (res.ok) {
        setCompetitors(prev => [...prev, cleaned])
        setCompetitorInput('')
      } else {
        // Add anyway but warn
        setCompetitors(prev => [...prev, cleaned])
        setCompetitorInput('')
      }
    } catch {
      // Add anyway
      setCompetitors(prev => [...prev, cleaned])
      setCompetitorInput('')
    } finally {
      setValidatingComp(null)
    }
  }, [competitorInput, competitors])

  /* ─── Step 3: Create Project ─── */

  const createProject = useCallback(async () => {
    if (!analysis) return
    setCreating(true)
    setCreateError('')

    try {
      // 1. Create the project
      const res = await fetch('/api/geo/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: analysis.domain,
          name: editName,
          description: editDescription,
          industry: editIndustry,
          coreTopics: editTopics.join(', '),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Fehler beim Anlegen')
      }

      // 2. Save competitors if any
      if (competitors.length > 0) {
        await fetch(`/api/geo/projects/${encodeURIComponent(analysis.domain)}/competitors`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors }),
        }).catch(() => {}) // non-critical
      }

      // 3. Optionally trigger first diagnosis
      if (startDiagnosis) {
        fetch('/api/geo/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: analysis.domain,
            companyName: editName,
            industry: editIndustry,
          }),
        }).catch(() => {}) // fire-and-forget, user will see it on the page
      }

      // 4. Navigate to project page (signal that diagnosis was started)
      const diagParam = startDiagnosis ? '?diagnosing=true' : ''
      router.push(`/projekte/${encodeURIComponent(analysis.domain)}${diagParam}`)
    } catch (e) {
      setCreateError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }, [analysis, editName, editDescription, editIndustry, editTopics, competitors, startDiagnosis, router])

  /* ─── Render ─── */

  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator step={step} total={4} labels={stepLabels} />

      {/* ─── STEP 0: Domain Input ─── */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Website analysieren</h2>
            <p className="text-sm text-gray-500">
              Geben Sie die Domain ein — LLM Radar analysiert die Website und generiert automatisch Projektdaten.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Website-Domain
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Globe2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyzeDomain()}
                    placeholder="beispiel.de"
                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 bg-gray-50"
                    autoFocus
                  />
                </div>
                <button
                  onClick={analyzeDomain}
                  disabled={analyzing || !domainInput.trim()}
                  className="px-6 py-3 bg-radar-600 hover:bg-radar-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {analyzing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Analysieren
                </button>
              </div>
            </div>

            {analyzing && (
              <div className="flex items-center gap-3 text-sm text-radar-700 bg-radar-50 rounded-lg px-4 py-3">
                <Loader2 size={16} className="animate-spin" />
                <div>
                  <p className="font-medium">Website wird analysiert…</p>
                  <p className="text-xs text-radar-500">Meta-Tags, Überschriften, Schema.org, About-Seite, Leistungen</p>
                </div>
              </div>
            )}

            {analyzeError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
                <AlertCircle size={16} />
                {analyzeError}
              </div>
            )}
          </div>

          {/* Preview what will be analyzed */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              🔍 Was wird analysiert?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: FileCode2, text: 'Schema.org Markup & JSON-LD' },
                { icon: Eye, text: 'Meta-Tags, Titel & Beschreibung' },
                { icon: Search, text: 'Überschriften & Seitenstruktur' },
                { icon: Lightbulb, text: 'About-/Leistungen-Seite' },
                { icon: Sparkles, text: 'Branche & Kernthemen-Erkennung' },
                { icon: Users, text: 'Wettbewerber-Hinweise' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Icon size={14} className="text-gray-400 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 1: Review Extracted Data ─── */}
      {step === 1 && analysis && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Projektdaten prüfen & anpassen</h2>
            <p className="text-sm text-gray-500">
              Diese Daten wurden automatisch aus <span className="font-medium">{analysis.domain}</span> extrahiert. Passen Sie alles an, bevor das Projekt erstellt wird.
            </p>
          </div>

          {/* Analysis signals */}
          {analysis.signals.length > 0 && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                <Sparkles size={12} className="inline mr-1" /> Analyse-Ergebnis
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.signals.map((s, i) => (
                  <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    s.startsWith('⚠️') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {s.startsWith('⚠️') ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                    {s.replace('⚠️ ', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Firmenname
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Branche
                </label>
                <input
                  type="text"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Automatisch erkannt — bitte bei Bedarf korrigieren</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Beschreibung
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 resize-y"
                placeholder="Kurze Beschreibung des Unternehmens / der Website…"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Kernthemen (Core Topics)
              </label>
              <TagInput
                tags={editTopics}
                onTagsChange={setEditTopics}
                placeholder="Thema hinzufügen und Enter drücken"
                maxTags={12}
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                Diese Themen bestimmen, welche Fragen die KI-Diagnose an die Engines stellt.
              </p>
            </div>

            {/* Schema.org types found */}
            {analysis.schemaTypes.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Schema.org Typen (erkannt)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.schemaTypes.map((t, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evaluation Criteria Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Info size={14} className="text-radar-600" />
              Diagnose-Kriterien (diese werden geprüft)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Die GEO Diagnose bewertet Ihre Website anhand dieser 5 Dimensionen:
            </p>
            <div className="space-y-2">
              {EVALUATION_DIMENSIONS.map((dim, i) => (
                <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{dim.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{dim.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{dim.weight}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{dim.description}</p>
                    <div className="flex flex-wrap gap-x-4 mt-1.5">
                      {dim.criteria.map((c, j) => (
                        <span key={j} className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-300" /> {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft size={16} /> Zurück
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!editName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-radar-600 hover:bg-radar-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              Weiter: Wettbewerber <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Competitors ─── */}
      {step === 2 && analysis && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Wettbewerber definieren</h2>
            <p className="text-sm text-gray-500">
              Fügen Sie Domains Ihrer Wettbewerber hinzu. Die Diagnose vergleicht dann deren KI-Sichtbarkeit mit Ihrer.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
                  placeholder="wettbewerber-domain.de"
                  className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 bg-gray-50"
                />
              </div>
              <button
                onClick={addCompetitor}
                disabled={!competitorInput.trim() || validatingComp !== null}
                className="px-5 py-3 bg-radar-600 hover:bg-radar-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                {validatingComp ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Hinzufügen
              </button>
            </div>

            {competitors.length > 0 ? (
              <div className="space-y-2">
                {competitors.map((comp, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Globe2 size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{comp}</span>
                    </div>
                    <button
                      onClick={() => setCompetitors(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Noch keine Wettbewerber hinzugefügt</p>
                <p className="text-xs mt-1">Sie können diesen Schritt auch überspringen und später ergänzen.</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-amber-50 rounded-lg border border-amber-200 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
              <Lightbulb size={12} /> Tipps
            </p>
            <ul className="text-xs text-amber-600 space-y-0.5 list-disc pl-4">
              <li>Wählen Sie 2–5 direkte Wettbewerber aus Ihrer Branche</li>
              <li>Die Diagnose prüft, ob diese statt Ihnen in KI-Antworten genannt werden</li>
              <li>Wettbewerber können jederzeit in den Projekt-Einstellungen geändert werden</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft size={16} /> Zurück
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 bg-radar-600 hover:bg-radar-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              Weiter: Zusammenfassung <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Summary & Create ─── */}
      {step === 3 && analysis && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Zusammenfassung & Projekt erstellen</h2>
            <p className="text-sm text-gray-500">
              Prüfen Sie die Daten und erstellen Sie das Projekt.
            </p>
          </div>

          {/* Summary card */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {/* Domain */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe2 size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Domain</p>
                  <p className="text-sm font-bold text-gray-900">{analysis.domain}</p>
                </div>
              </div>
              <button onClick={() => setStep(0)} className="text-xs text-radar-600 hover:underline flex items-center gap-1">
                <Pencil size={10} /> Ändern
              </button>
            </div>

            {/* Name & Industry */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Firmenname</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{editName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Branche</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{editIndustry}</p>
                </div>
              </div>
              {editDescription && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Beschreibung</p>
                  <p className="text-sm text-gray-700 mt-0.5">{editDescription}</p>
                </div>
              )}
              <button onClick={() => setStep(1)} className="text-xs text-radar-600 hover:underline flex items-center gap-1 mt-2">
                <Pencil size={10} /> Bearbeiten
              </button>
            </div>

            {/* Core Topics */}
            <div className="px-6 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Kernthemen ({editTopics.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {editTopics.map((t, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 bg-radar-50 text-radar-700 border border-radar-200 rounded-lg text-xs font-medium">
                    {t}
                  </span>
                ))}
                {editTopics.length === 0 && <span className="text-xs text-gray-400">Keine Kernthemen definiert</span>}
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-radar-600 hover:underline flex items-center gap-1 mt-2">
                <Pencil size={10} /> Bearbeiten
              </button>
            </div>

            {/* Competitors */}
            <div className="px-6 py-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Wettbewerber ({competitors.length})</p>
              {competitors.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {competitors.map((c, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400">Keine Wettbewerber definiert — kann später ergänzt werden</span>
              )}
              <button onClick={() => setStep(2)} className="text-xs text-radar-600 hover:underline flex items-center gap-1 mt-2">
                <Pencil size={10} /> Bearbeiten
              </button>
            </div>
          </div>

          {/* Auto-diagnose toggle */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={startDiagnosis}
                onChange={(e) => setStartDiagnosis(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-radar-600 focus:ring-radar-500 mt-0.5"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">GEO Diagnose automatisch starten</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Startet direkt nach dem Anlegen die erste Diagnose über alle 4 KI-Engines (GPT-4, Claude, Gemini, Perplexity).
                  Dauer: ca. 2–3 Minuten.
                </p>
              </div>
            </label>
          </div>

          {createError && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
              <AlertCircle size={16} />
              {createError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft size={16} /> Zurück
            </button>
            <button
              onClick={createProject}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-bold rounded-xl transition-all shadow-md"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} />
              )}
              Projekt erstellen{startDiagnosis ? ' & Diagnose starten' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
