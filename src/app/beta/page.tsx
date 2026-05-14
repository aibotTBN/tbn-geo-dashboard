'use client'

import { useState, useEffect, useRef } from 'react'
import { Radar, ArrowRight, CheckCircle2, Eye, Shield, FileText, Clock, BarChart3, Zap, Globe2, Lock, Loader2, AlertCircle, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

/* ──────────────────────────────────────────────────────
   LLM Radar — Closed Beta: Free GEO Analysis
   ────────────────────────────────────────────────────── */

interface DiagnosisResult {
  score: number
  scoreCitation: number
  scoreTech: number
  scoreSchema: number
  scoreContent: number
  scoreFresh: number
  reportJson: string
}

function ScoreGauge({ score, size = 'large' }: { score: number; size?: 'large' | 'small' }) {
  const getColor = (s: number) => {
    if (s < 30) return '#ef4444'
    if (s < 50) return '#f97316'
    if (s < 70) return '#eab308'
    return '#22c55e'
  }

  const r = size === 'large' ? 70 : 28
  const sw = size === 'large' ? 14 : 6
  const viewBox = size === 'large' ? 180 : 72
  const cx = viewBox / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={viewBox} height={viewBox} viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
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
        {size === 'large' ? (
          <>
            <span className="text-5xl font-bold text-white">{score}</span>
            <span className="text-xl text-slate-400">/100</span>
          </>
        ) : (
          <span className="text-sm font-bold text-white">{score}</span>
        )}
      </div>
    </div>
  )
}

function SubScoreBar({ label, score, maxScore, icon: Icon, color }: { label: string; score: number; maxScore: number; icon: React.ElementType; color: string }) {
  const pct = Math.round((score / maxScore) * 100)
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-slate-300">{label}</span>
        </div>
        <span className="text-sm font-bold text-white">{score}<span className="text-slate-500">/{maxScore}</span></span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BetaPage() {
  const [step, setStep] = useState<'form' | 'analyzing' | 'result' | 'error'>('form')
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showFullReport, setShowFullReport] = useState(false)

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

    // Clean domain
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

    // Simulate progress while diagnosis runs
    let currentStep = 0
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        setProgress(progressSteps[currentStep].pct)
        setProgressText(progressSteps[currentStep].text)
        currentStep++
      }
    }, 8000)

    try {
      // Trigger beta diagnosis (no auth required)
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

      // Brief pause to show 100%
      await new Promise(resolve => setTimeout(resolve, 800))

      setResult({
        score: data.score || 0,
        scoreCitation: data.scoreCitation || 0,
        scoreTech: data.scoreTech || 0,
        scoreSchema: data.scoreSchema || 0,
        scoreContent: data.scoreContent || 0,
        scoreFresh: data.scoreFresh || 0,
        reportJson: data.reportJson || '{}',
      })
      setStep('result')
    } catch (err) {
      clearInterval(progressInterval)
      setErrorMsg((err as Error).message || 'Ein unbekannter Fehler ist aufgetreten.')
      setStep('error')
    }
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Ausgezeichnet', color: 'text-green-400' }
    if (score >= 60) return { label: 'Gut', color: 'text-green-400' }
    if (score >= 40) return { label: 'Ausbaufähig', color: 'text-yellow-400' }
    if (score >= 20) return { label: 'Schwach', color: 'text-orange-400' }
    return { label: 'Kritisch', color: 'text-red-400' }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Radar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">LLM Radar</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Preise</a>
              <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Anmelden</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">

        {/* ═══ FORM STEP ═══ */}
        {step === 'form' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Kostenlose GEO-Analyse</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
              Wie sichtbar ist Ihr Unternehmen{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                für KI-Assistenten?
              </span>
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
              Wir befragen ChatGPT, Claude, Gemini und Perplexity nach Ihrem Unternehmen und berechnen Ihren GEO Score.
            </p>

            <div className="mt-10 bg-slate-900/80 border border-slate-800 rounded-2xl p-8">
              <div className="space-y-4">
                <div>
                  <label htmlFor="beta-domain" className="block text-sm font-medium text-slate-300 text-left mb-2">
                    Ihre Website-Domain
                  </label>
                  <div className="relative">
                    <Globe2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="beta-domain"
                      type="text"
                      value={domain}
                      onChange={(e) => { setDomain(e.target.value); setErrorMsg('') }}
                      placeholder="beispiel.de"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800 border-2 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500 text-base outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="beta-email" className="block text-sm font-medium text-slate-300 text-left mb-2">
                    Ihre E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="beta-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
                      placeholder="ihre@email.de"
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-800 border-2 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500 text-base outline-none transition-all"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-left mt-1.5">Wir senden Ihren Report auch per E-Mail. Kein Spam, versprochen.</p>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  onClick={startAnalysis}
                  disabled={!email || !domain}
                  className="w-full py-4 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 mt-2"
                >
                  GEO-Analyse starten
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
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
                <div key={item.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <item.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ANALYZING STEP ═══ */}
        {step === 'analyzing' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Analyse läuft</h2>
              <p className="text-slate-400 mb-8">{progressText}</p>

              {/* Progress bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500">{progress}%</p>

              <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="text-xs text-slate-400">
                  <strong className="text-slate-300">Domain:</strong> {domain}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Die Analyse dauert in der Regel 1–3 Minuten. Wir befragen vier KI-Systeme und analysieren Ihre Website parallel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ERROR STEP ═══ */}
        {step === 'error' && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-slate-900/80 border border-red-500/20 rounded-2xl p-10">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Analyse fehlgeschlagen</h2>
              <p className="text-slate-400 mb-6">{errorMsg}</p>
              <button
                onClick={() => { setStep('form'); setErrorMsg('') }}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all"
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
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
                Ihr GEO Score für <span className="text-blue-400">{domain}</span>
              </h1>
              <p className="text-slate-400">
                Analyse vom {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Main score + subscores */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Big score */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center">
                <p className="text-sm font-medium text-slate-400 mb-4">GEO Gesamtscore</p>
                <ScoreGauge score={result.score} size="large" />
                <p className={`text-lg font-semibold mt-4 ${getScoreLabel(result.score).color}`}>
                  {getScoreLabel(result.score).label}
                </p>
              </div>

              {/* Subscores */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SubScoreBar label="KI-Sichtbarkeit" score={result.scoreCitation} maxScore={30} icon={Eye} color="text-blue-400" />
                <SubScoreBar label="Technik" score={result.scoreTech} maxScore={20} icon={Shield} color="text-indigo-400" />
                <SubScoreBar label="Schema Markup" score={result.scoreSchema} maxScore={20} icon={FileText} color="text-purple-400" />
                <SubScoreBar label="Content-Qualität" score={result.scoreContent} maxScore={15} icon={BarChart3} color="text-emerald-400" />
                <SubScoreBar label="Content-Aktualität" score={result.scoreFresh} maxScore={15} icon={Clock} color="text-orange-400" />
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">4 KI-Engines analysiert</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
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

            {/* Report details (collapsed) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden mb-8">
              <button
                onClick={() => setShowFullReport(!showFullReport)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-300">Detaillierter Report anzeigen</span>
                {showFullReport ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              {showFullReport && (
                <div className="px-6 pb-6 border-t border-slate-800">
                  <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap mt-4 max-h-96 overflow-y-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(result.reportJson), null, 2)
                      } catch {
                        return result.reportJson
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            {/* CTA: Next steps */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-8">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-white mb-3">
                  So verbessern Sie Ihren Score
                </h2>
                <p className="text-slate-300 mb-8">
                  Mit dem Knowledge Builder, Monitoring und konkreten Optimierungen steigern Sie Ihre KI-Sichtbarkeit nachhaltig.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Zap, title: 'Knowledge Builder', desc: 'Strukturierte Wissensbasis für KI-Systeme aufbauen' },
                    { icon: TrendingUp, title: 'Score Monitoring', desc: 'Entwicklung tracken und Alerts bei Veränderungen' },
                    { icon: FileText, title: 'Schema.org & MCP', desc: 'Technische Optimierung für maximale Sichtbarkeit' },
                  ].map((item) => (
                    <div key={item.title} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
                      <item.icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="/#pricing"
                    className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                  >
                    Tarife ansehen
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="mailto:geo@tbnpr.de?subject=LLM%20Radar%20Managed%20—%20Anfrage%20für%20{domain}"
                    className="px-8 py-3.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-semibold transition-all flex items-center gap-2"
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
      <footer className="border-t border-slate-800/50 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <Radar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-400">LLM Radar</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Ein Produkt von <a href="https://tbnpr.de" className="hover:text-slate-300 transition-colors" target="_blank" rel="noopener">TBN Public Relations GmbH</a></span>
            <a href="https://tbnpr.de/impressum" className="hover:text-slate-300 transition-colors" target="_blank" rel="noopener">Impressum</a>
            <a href="https://tbnpr.de/datenschutz" className="hover:text-slate-300 transition-colors" target="_blank" rel="noopener">Datenschutz</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
