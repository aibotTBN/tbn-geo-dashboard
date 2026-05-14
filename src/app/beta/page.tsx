'use client'

import { useState } from 'react'
import { Radar, ArrowRight, CheckCircle2, Eye, Shield, FileText, Clock, BarChart3, Zap, Globe2, Lock, Loader2, AlertCircle, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Sparkles, Lightbulb, AlertTriangle, Info } from 'lucide-react'

/* ──────────────────────────────────────────────────────
   LLM Radar — Closed Beta: Free GEO Analysis (Light Mode)
   ────────────────────────────────────────────────────── */

interface DiagnosisResult {
  score: number
  scoreCitation: number
  scoreTech: number
  scoreSchema: number
  scoreContent: number
  scoreFresh: number
  reportJson: string
  recommendations?: string[]
  citation_engines?: Record<string, any>
  google_ai_readiness?: any
}

/* ── Score Gauge (light) ── */
function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s < 30) return '#ef4444'
    if (s < 50) return '#f97316'
    if (s < 70) return '#eab308'
    return '#22c55e'
  }

  const r = 70
  const sw = 14
  const viewBox = 180
  const cx = viewBox / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={viewBox} height={viewBox} viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={getColor(score)} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-5xl font-bold text-gray-900">{score}</span>
        <span className="text-xl text-gray-400">/100</span>
      </div>
    </div>
  )
}

/* ── SubScore Bar (light) ── */
function SubScoreBar({ label, score, maxScore, icon: Icon, color }: { label: string; score: number; maxScore: number; icon: React.ElementType; color: string }) {
  const pct = Math.round((score / maxScore) * 100)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{score}<span className="text-gray-400">/{maxScore}</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 30 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ── Human-Readable Report ── */
function ReadableReport({ reportJson, domain }: { reportJson: string; domain: string }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  let report: any = null
  try {
    const raw = JSON.parse(reportJson)
    report = raw?.report || raw
  } catch {
    return null
  }

  if (!report) return null

  const scores = report?.scores
  const bd = scores?.breakdown
  const citationEngines = report?.citation_engines || {}
  const engineNames = ['openai', 'claude', 'gemini', 'perplexity']
  const engineLabels: Record<string, string> = { openai: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', perplexity: 'Perplexity' }
  const recommendations = report?.recommendations || []
  const techAnalysis = report?.technical_analysis || report?.analysis?.technical || {}
  const schemaAnalysis = report?.schema_analysis || report?.analysis?.schema || {}
  const contentAnalysis = report?.content_analysis || report?.analysis?.content || {}

  const sections: { key: string; icon: React.ElementType; title: string; color: string; content: React.ReactNode }[] = []

  /* ─── Section: KI-Sichtbarkeit ─── */
  const activeEngines = engineNames.filter(e => citationEngines[e]?.status === 'ok')
  if (activeEngines.length > 0) {
    sections.push({
      key: 'citation',
      icon: Eye,
      title: 'KI-Sichtbarkeit',
      color: 'text-blue-600',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Wir haben {activeEngines.length} KI-Systeme nach <strong>{domain}</strong> befragt.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {engineNames.map(e => {
              const data = citationEngines[e]
              if (!data) return null
              const ok = data.status === 'ok'
              const mentioned = data.mentioned || 0
              const total = data.total || 0
              return (
                <div key={e} className={`rounded-lg border p-3 text-center ${ok ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="text-xs font-medium text-gray-500 mb-1">{engineLabels[e]}</p>
                  {ok ? (
                    <>
                      <p className="text-lg font-bold text-gray-900">{mentioned}/{total}</p>
                      <p className="text-xs text-gray-400">Erwähnungen</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Nicht verfügbar</p>
                  )}
                </div>
              )
            })}
          </div>
          {/* Sample queries */}
          {(() => {
            const sampleResults: { engine: string; query: string; mentioned: boolean; summary?: string }[] = []
            for (const [eName, eData] of Object.entries(citationEngines)) {
              const results = (eData as any)?.results || []
              for (const r of results.slice(0, 3)) {
                sampleResults.push({ engine: eName, query: r.query, mentioned: r.brand_mentioned, summary: r.summary })
              }
            }
            const uniqueQueries = [...new Set(sampleResults.map(r => r.query))].slice(0, 5)
            if (uniqueQueries.length === 0) return null
            return (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Getestete Fragen</p>
                <div className="space-y-2">
                  {uniqueQueries.map((query, i) => {
                    const engines = sampleResults.filter(r => r.query === query)
                    const anyMentioned = engines.some(r => r.mentioned)
                    return (
                      <div key={i} className={`rounded-lg border px-3 py-2 text-sm ${anyMentioned ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                        <div className="flex items-start gap-2">
                          {anyMentioned ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-800">„{query}"</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {engines.map(e => `${engineLabels[e.engine]}: ${e.mentioned ? '✓ erwähnt' : '✗ nicht erwähnt'}`).join(' · ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      ),
    })
  }

  /* ─── Section: Technik ─── */
  sections.push({
    key: 'tech',
    icon: Shield,
    title: 'Technische Analyse',
    color: 'text-indigo-600',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Technische Voraussetzungen für die KI-Auffindbarkeit Ihrer Website.
        </p>
        {(() => {
          const checks: { label: string; ok: boolean; detail?: string }[] = []
          if (techAnalysis.robots_txt !== undefined) checks.push({ label: 'robots.txt vorhanden', ok: !!techAnalysis.robots_txt })
          if (techAnalysis.sitemap !== undefined) checks.push({ label: 'Sitemap vorhanden', ok: !!techAnalysis.sitemap })
          if (techAnalysis.ssl !== undefined) checks.push({ label: 'SSL / HTTPS aktiv', ok: !!techAnalysis.ssl })
          if (techAnalysis.meta_tags !== undefined) checks.push({ label: 'Meta-Tags optimiert', ok: !!techAnalysis.meta_tags })
          if (techAnalysis.structured_data !== undefined) checks.push({ label: 'Strukturierte Daten vorhanden', ok: !!techAnalysis.structured_data })
          if (techAnalysis.page_speed !== undefined) checks.push({ label: 'Akzeptable Ladezeit', ok: techAnalysis.page_speed !== 'slow' })
          
          // Fallback if no specific checks
          if (checks.length === 0) {
            const score = bd?.technical?.score || 0
            const max = bd?.technical?.max || 20
            return (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-700">
                  Technischer Score: <strong>{score} von {max} Punkten</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {score < max * 0.5
                    ? 'Es gibt deutliches Verbesserungspotenzial bei den technischen Grundlagen.'
                    : score < max * 0.8
                      ? 'Die technischen Grundlagen sind vorhanden, aber es gibt Optimierungspotenzial.'
                      : 'Die technischen Grundlagen sind gut umgesetzt.'
                  }
                </p>
              </div>
            )
          }
          
          return (
            <div className="space-y-2">
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className={c.ok ? 'text-gray-700' : 'text-red-700 font-medium'}>{c.label}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    ),
  })

  /* ─── Section: Schema Markup ─── */
  sections.push({
    key: 'schema',
    icon: FileText,
    title: 'Schema Markup',
    color: 'text-purple-600',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Strukturierte Daten helfen KI-Systemen, Ihre Website-Inhalte korrekt zu verstehen.
        </p>
        {(() => {
          const score = bd?.schema?.score || 0
          const max = bd?.schema?.max || 20
          const types = schemaAnalysis.types_found || schemaAnalysis.schema_types || []
          return (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-700">
                Schema Score: <strong>{score} von {max} Punkten</strong>
              </p>
              {types.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {types.map((t: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {score === 0
                  ? 'Kein Schema Markup gefunden. Mit strukturierten Daten (JSON-LD) verbessern Sie die KI-Sichtbarkeit erheblich.'
                  : score < max * 0.5
                    ? 'Grundlegende Schema-Daten sind vorhanden. Erweitern Sie diese für eine bessere KI-Auffindbarkeit.'
                    : 'Gute Schema-Markup-Implementierung.'
                }
              </p>
            </div>
          )
        })()}
      </div>
    ),
  })

  /* ─── Section: Empfehlungen ─── */
  if (recommendations.length > 0) {
    sections.push({
      key: 'recs',
      icon: Lightbulb,
      title: `${recommendations.length} Empfehlungen`,
      color: 'text-amber-600',
      content: (
        <div className="space-y-2">
          {recommendations.map((rec: string, i: number) => (
            <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="text-amber-600 font-bold text-sm mt-0.5">{i + 1}.</span>
              <p className="text-sm text-gray-700">{rec}</p>
            </div>
          ))}
        </div>
      ),
    })
  }

  return (
    <div className="space-y-3 mt-6">
      <h3 className="text-lg font-bold text-gray-900">Detaillierte Analyse</h3>
      {sections.map(section => (
        <div key={section.key} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => toggleSection(section.key)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <section.icon className={`w-5 h-5 ${section.color}`} />
              <span className="text-sm font-semibold text-gray-900">{section.title}</span>
            </div>
            {expandedSections.has(section.key) ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.has(section.key) && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */

export default function BetaPage() {
  const [step, setStep] = useState<'form' | 'analyzing' | 'result' | 'error'>('form')
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const progressSteps = [
    { pct: 5, text: 'Website wird gecrawlt...' },
    { pct: 15, text: 'Seiten werden analysiert...' },
    { pct: 25, text: 'ChatGPT wird befragt...' },
    { pct: 40, text: 'Claude wird befragt...' },
    { pct: 55, text: 'Gemini wird befragt...' },
    { pct: 70, text: 'Perplexity wird befragt...' },
    { pct: 85, text: 'Report wird erstellt...' },
    { pct: 95, text: 'Score wird berechnet...' },
  ]

  const startAnalysis = async () => {
    if (!email || !email.includes('@') || !domain) return

    const cleanDomain = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    if (!cleanDomain.includes('.')) {
      setErrorMsg('Bitte geben Sie eine gültige Domain ein (z.B. beispiel.de)')
      return
    }

    setStep('analyzing')
    setProgress(0)
    setProgressText('Analyse wird vorbereitet...')

    // Register on waitlist
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'beta_analysis' }),
      })
    } catch {
      // Non-critical
    }

    // Simulate progress
    let currentStep = 0
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setProgress(progressSteps[currentStep].pct)
        setProgressText(progressSteps[currentStep].text)
        currentStep++
      }
    }, 8000)

    try {
      const res = await fetch('/api/beta/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain, email }),
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Analyse fehlgeschlagen (${res.status})`)
      }

      const data = await res.json()
      setProgress(100)
      setProgressText('Fertig!')

      await new Promise(resolve => setTimeout(resolve, 800))

      setResult({
        score: data.score || 0,
        scoreCitation: data.scoreCitation || 0,
        scoreTech: data.scoreTech || 0,
        scoreSchema: data.scoreSchema || 0,
        scoreContent: data.scoreContent || 0,
        scoreFresh: data.scoreFresh || 0,
        reportJson: data.reportJson || '{}',
        recommendations: data.recommendations || [],
        citation_engines: data.citation_engines || {},
        google_ai_readiness: data.google_ai_readiness || null,
      })
      setStep('result')
    } catch (err) {
      clearInterval(progressInterval)
      setErrorMsg((err as Error).message || 'Ein unbekannter Fehler ist aufgetreten.')
      setStep('error')
    }
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Ausgezeichnet', color: 'text-green-600' }
    if (score >= 60) return { label: 'Gut', color: 'text-green-600' }
    if (score >= 40) return { label: 'Ausbaufähig', color: 'text-yellow-600' }
    if (score >= 20) return { label: 'Schwach', color: 'text-orange-600' }
    return { label: 'Kritisch', color: 'text-red-600' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Radar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">LLM Radar</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Preise</a>
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Anmelden</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">

        {/* ═══ FORM STEP ═══ */}
        {step === 'form' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Kostenlose GEO-Analyse</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Wie sichtbar ist Ihr Unternehmen{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                für KI-Assistenten?
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              Wir befragen ChatGPT, Claude, Gemini und Perplexity nach Ihrem Unternehmen und berechnen Ihren GEO Score.
            </p>

            <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-8 shadow-lg shadow-gray-200/50">
              <div className="space-y-4">
                <div>
                  <label htmlFor="beta-domain" className="block text-sm font-medium text-gray-700 text-left mb-2">
                    Ihre Website-Domain
                  </label>
                  <div className="relative">
                    <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="beta-domain"
                      type="text"
                      value={domain}
                      onChange={(e) => { setDomain(e.target.value); setErrorMsg('') }}
                      placeholder="beispiel.de"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 placeholder:text-gray-400 text-base outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="beta-email" className="block text-sm font-medium text-gray-700 text-left mb-2">
                    Ihre E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="beta-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
                      placeholder="ihre@email.de"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 placeholder:text-gray-400 text-base outline-none transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-left mt-1.5">Wir senden Ihren Report auch per E-Mail. Kein Spam, versprochen.</p>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  onClick={startAnalysis}
                  disabled={!email || !domain}
                  className="w-full py-4 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-700/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 mt-2"
                >
                  GEO-Analyse starten
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Kostenlos</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Keine Kreditkarte</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Kein Abo</span>
              </div>
            </div>

            {/* What you get */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Eye, label: 'KI-Sichtbarkeit', desc: '4 Engines' },
                { icon: Shield, label: 'Technik-Check', desc: 'Crawlability' },
                { icon: FileText, label: 'Schema Markup', desc: 'JSON-LD Analyse' },
                { icon: BarChart3, label: 'Content Score', desc: 'Qualität & Aktualität' },
              ].map((item) => (
                <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <item.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ANALYZING STEP ═══ */}
        {step === 'analyzing' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-lg shadow-gray-200/50">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyse läuft</h2>
              <p className="text-gray-500 mb-8">{progressText}</p>

              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{progress}%</p>

              <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600">
                  <strong className="text-gray-700">Domain:</strong> {domain}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Die Analyse dauert in der Regel 1–3 Minuten. Wir befragen vier KI-Systeme und analysieren Ihre Website parallel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ERROR STEP ═══ */}
        {step === 'error' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white border border-red-200 rounded-2xl p-10 shadow-lg">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyse fehlgeschlagen</h2>
              <p className="text-gray-500 mb-6">{errorMsg}</p>
              <button
                onClick={() => { setStep('form'); setErrorMsg('') }}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        )}

        {/* ═══ RESULT STEP ═══ */}
        {step === 'result' && result && (
          <div>
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
                Ihr GEO Score für <span className="text-blue-600">{domain}</span>
              </h1>
              <p className="text-gray-500">
                Analyse vom {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Main score + subscores */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Big score */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-sm">
                <p className="text-sm font-medium text-gray-500 mb-4">GEO Gesamtscore</p>
                <ScoreGauge score={result.score} />
                <p className={`text-lg font-semibold mt-4 ${getScoreLabel(result.score).color}`}>
                  {getScoreLabel(result.score).label}
                </p>
              </div>

              {/* Subscores */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SubScoreBar label="KI-Sichtbarkeit" score={result.scoreCitation} maxScore={30} icon={Eye} color="text-blue-600" />
                <SubScoreBar label="Technik" score={result.scoreTech} maxScore={20} icon={Shield} color="text-indigo-600" />
                <SubScoreBar label="Schema Markup" score={result.scoreSchema} maxScore={20} icon={FileText} color="text-purple-600" />
                <SubScoreBar label="Content-Qualität" score={result.scoreContent} maxScore={15} icon={BarChart3} color="text-emerald-600" />
                <SubScoreBar label="Content-Aktualität" score={result.scoreFresh} maxScore={15} icon={Clock} color="text-orange-600" />
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center shadow-sm">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">4 KI-Engines analysiert</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>ChatGPT</span>
                      <span>•</span>
                      <span>Claude</span>
                      <span>•</span>
                      <span>Gemini</span>
                      <span>•</span>
                      <span>Perplexity</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Human-readable report */}
            <ReadableReport reportJson={result.reportJson} domain={domain} />

            {/* CTA: Next steps */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  So verbessern Sie Ihren Score
                </h2>
                <p className="text-gray-600 mb-8">
                  Mit dem Knowledge Builder, Monitoring und konkreten Optimierungen steigern Sie Ihre KI-Sichtbarkeit nachhaltig.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Zap, title: 'Knowledge Builder', desc: 'Strukturierte Wissensbasis für KI-Systeme aufbauen' },
                    { icon: TrendingUp, title: 'Score Monitoring', desc: 'Entwicklung tracken und Alerts bei Veränderungen' },
                    { icon: FileText, title: 'Schema.org & MCP', desc: 'Technische Optimierung für maximale Sichtbarkeit' },
                  ].map((item) => (
                    <div key={item.title} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <item.icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="/#pricing"
                    className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                  >
                    Tarife ansehen
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`mailto:geo@tbnpr.de?subject=LLM%20Radar%20Managed%20—%20Anfrage%20für%20${domain}`}
                    className="px-8 py-3.5 rounded-xl border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 font-semibold transition-all flex items-center gap-2"
                  >
                    Managed-Service anfragen
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-12 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Radar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-500">LLM Radar</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Ein Produkt von <a href="https://tbnpr.de" className="hover:text-gray-600 transition-colors" target="_blank" rel="noopener">TBN Public Relations GmbH</a></span>
            <a href="https://tbnpr.de/impressum" className="hover:text-gray-600 transition-colors" target="_blank" rel="noopener">Impressum</a>
            <a href="https://tbnpr.de/datenschutz" className="hover:text-gray-600 transition-colors" target="_blank" rel="noopener">Datenschutz</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
