'use client'

import { useState, useEffect } from 'react'
import { Radar, ArrowRight, CheckCircle2, Eye, Shield, FileText, Clock, BarChart3, Zap, Globe2, Lock, Loader2, AlertCircle, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Sparkles, Lightbulb, AlertTriangle, Search, Bot } from 'lucide-react'

/* ──────────────────────────────────────────────────────
   LLM Radar — /kostenlos Landing Page
   Optimised for Instagram/Meta ad traffic (mobile-first).
   Uses /api/beta/diagnose for the free GEO analysis.
   Fires Meta Pixel events: ViewContent, Lead, CompleteRegistration
   ────────────────────────────────────────────────────── */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
  }
}

/* ── Score Gauge ── */
function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s < 30) return '#ef4444'
    if (s < 50) return '#f97316'
    if (s < 70) return '#eab308'
    return '#22c55e'
  }

  const r = 60
  const sw = 12
  const viewBox = 160
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
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="text-lg text-gray-400">/100</span>
      </div>
    </div>
  )
}

/* ── SubScore Bar ── */
function SubScoreBar({ label, score, maxScore, icon: Icon, color }: {
  label: string; score: number; maxScore: number; icon: React.ElementType; color: string
}) {
  const pct = Math.round((score / maxScore) * 100)
  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 30 ? 'bg-orange-500' : 'bg-red-500'
  const statusText = pct >= 70 ? 'Gut' : pct >= 50 ? 'Ausbaufähig' : pct >= 30 ? 'Schwach' : 'Kritisch'
  const statusColor = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : pct >= 30 ? 'text-orange-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
          <span className={`text-xs font-semibold ${statusColor}`}>{score}/{maxScore}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

interface DiagnosisResult {
  score: number
  scoreCitation: number
  scoreTech: number
  scoreSchema: number
  scoreContent: number
  scoreFresh: number
  reportJson: string
}

export default function KostenlosPage() {
  const [step, setStep] = useState<'form' | 'analyzing' | 'result' | 'error'>('form')
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Fire ViewContent pixel event on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: 'Kostenlose GEO-Analyse',
        content_category: 'landing_page',
      })
    }
  }, [])

  const progressSteps = [
    { pct: 5, text: 'Website wird gecrawlt…' },
    { pct: 15, text: 'Seiten werden analysiert…' },
    { pct: 25, text: 'ChatGPT wird befragt…' },
    { pct: 40, text: 'Claude wird befragt…' },
    { pct: 55, text: 'Gemini wird befragt…' },
    { pct: 70, text: 'Perplexity wird befragt…' },
    { pct: 85, text: 'Report wird erstellt…' },
    { pct: 95, text: 'Score wird berechnet…' },
  ]

  const startAnalysis = async () => {
    if (!domain) return

    const cleanDomain = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')

    if (!cleanDomain.includes('.')) {
      setErrorMsg('Bitte geben Sie eine gültige Domain ein (z.B. beispiel.de)')
      return
    }

    // Fire Lead pixel event
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: 'GEO-Analyse gestartet',
        content_category: 'free_analysis',
      })
    }

    setStep('analyzing')
    setProgress(0)
    setProgressText('Analyse wird vorbereitet…')

    // Register on waitlist if email provided
    if (email && email.includes('@')) {
      try {
        await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'kostenlos_landing' }),
        })
      } catch {
        // Non-critical
      }
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
        body: JSON.stringify({ domain: cleanDomain, email: email || `anon+${cleanDomain}@llmradar.de` }),
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Analyse fehlgeschlagen (${res.status})`)
      }

      const data = await res.json()
      setProgress(100)
      setProgressText('Fertig!')

      await new Promise(resolve => setTimeout(resolve, 600))

      const r: DiagnosisResult = {
        score: data.score || 0,
        scoreCitation: data.scoreCitation || 0,
        scoreTech: data.scoreTech || 0,
        scoreSchema: data.scoreSchema || 0,
        scoreContent: data.scoreContent || 0,
        scoreFresh: data.scoreFresh || 0,
        reportJson: data.reportJson || '{}',
      }
      setResult(r)
      setStep('result')

      // Fire CompleteRegistration pixel event
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'CompleteRegistration', {
          content_name: 'GEO-Analyse abgeschlossen',
          value: r.score,
          currency: 'EUR',
        })
      }
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
    <div className="min-h-screen bg-white">
      {/* Minimal nav */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">LLM Radar</span>
          </a>
          <a href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Anmelden</a>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">

        {/* ═══ FORM ═══ */}
        {step === 'form' && (
          <div className="text-center">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-6">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">100% kostenlos · Keine Kreditkarte</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Was sagt KI über{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ihr Unternehmen?
              </span>
            </h1>
            <p className="mt-3 text-base text-gray-500 leading-relaxed">
              Wir befragen ChatGPT, Claude, Gemini & Perplexity — und zeigen Ihnen in 60 Sekunden, wie sichtbar Sie für KI sind.
            </p>

            {/* Form card */}
            <div className="mt-8 bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-lg shadow-gray-100/80">
              <div className="space-y-4">
                <div>
                  <label htmlFor="kl-domain" className="block text-sm font-medium text-gray-700 text-left mb-1.5">
                    Ihre Website
                  </label>
                  <div className="relative">
                    <Globe2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="kl-domain"
                      type="text"
                      value={domain}
                      onChange={(e) => { setDomain(e.target.value); setErrorMsg('') }}
                      placeholder="beispiel.de"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 placeholder:text-gray-400 text-base outline-none transition-all"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="kl-email" className="block text-sm font-medium text-gray-700 text-left mb-1.5">
                    E-Mail <span className="text-gray-400 font-normal">(optional — für Ihren Report)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="kl-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
                      placeholder="ihre@email.de"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:bg-white text-gray-900 placeholder:text-gray-400 text-base outline-none transition-all"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  onClick={startAnalysis}
                  disabled={!domain}
                  className="w-full py-4 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-700/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 active:scale-[0.98]"
                >
                  <Search className="w-5 h-5" />
                  Kostenlose Analyse starten
                </button>
              </div>

              <p className="mt-4 text-xs text-gray-400 text-center">
                Kein Abo · Kein Spam · Ergebnis in ca. 60 Sekunden
              </p>
            </div>

            {/* Social proof */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Bot className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">4 KI-Engines</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <BarChart3 className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">5 Score-Faktoren</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">Sofort-Ergebnis</p>
              </div>
            </div>

            {/* Value proposition — what makes LLM Radar different */}
            <div className="mt-10 text-left">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Nicht nur messen — auch verbessern</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Diagnose</p>
                    <p className="text-xs text-gray-600 mt-0.5">Sehen Sie, was ChatGPT, Claude & Co. über Ihr Unternehmen sagen — und wo Sie unsichtbar sind.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Optimierung</p>
                    <p className="text-xs text-gray-600 mt-0.5">Knowledge Builder, Schema Markup & MCP-Server — damit KI-Systeme die richtigen Antworten über Sie geben.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ANALYZING ═══ */}
        {step === 'analyzing' && (
          <div className="text-center py-12">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <Radar className="absolute w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Analyse läuft…</h2>
            <p className="text-sm text-gray-500 mb-6">{progressText}</p>

            {/* Progress bar */}
            <div className="max-w-xs mx-auto">
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{progress}%</p>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-sm mx-auto">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Wussten Sie?</strong> Über 30% der B2B-Entscheider nutzen bereits KI-Assistenten für die Anbieterrecherche. Tendenz: stark steigend.
              </p>
            </div>
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {step === 'error' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Analyse fehlgeschlagen</h2>
            <p className="text-sm text-gray-500 mb-2">{errorMsg}</p>
            {domain && (
              <p className="text-xs text-gray-400 mb-6">
                <strong>Domain:</strong> {domain}
              </p>
            )}
            <button
              onClick={() => { setStep('form'); setErrorMsg('') }}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* ═══ RESULT ═══ */}
        {step === 'result' && result && (
          <div>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1">
                GEO Score für <span className="text-blue-600">{domain}</span>
              </h1>
              <p className="text-sm text-gray-500">
                Analyse vom {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Score card */}
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-lg shadow-gray-100/80 mb-6">
              <div className="flex flex-col items-center mb-6">
                <ScoreGauge score={result.score} />
                <p className={`text-lg font-bold mt-3 ${getScoreLabel(result.score).color}`}>
                  {getScoreLabel(result.score).label}
                </p>
              </div>

              {/* Subscores */}
              <div className="space-y-4">
                <SubScoreBar label="KI-Sichtbarkeit" score={result.scoreCitation} maxScore={30} icon={Eye} color="text-blue-600" />
                <SubScoreBar label="Technik" score={result.scoreTech} maxScore={20} icon={Shield} color="text-indigo-600" />
                <SubScoreBar label="Schema Markup" score={result.scoreSchema} maxScore={20} icon={FileText} color="text-purple-600" />
                <SubScoreBar label="Content-Qualität" score={result.scoreContent} maxScore={15} icon={BarChart3} color="text-emerald-600" />
                <SubScoreBar label="Content-Aktualität" score={result.scoreFresh} maxScore={15} icon={Clock} color="text-orange-600" />
              </div>
            </div>

            {/* Impact callout */}
            {result.score < 60 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-900 mb-1">Das bedeutet für Sie:</p>
                    <p className="text-sm text-red-800 leading-relaxed">
                      Wenn potenzielle Kunden KI-Assistenten nach Lösungen in Ihrem Bereich fragen, wird Ihr Unternehmen <strong>selten oder gar nicht genannt</strong>. Ihre Wettbewerber bekommen diese Anfragen stattdessen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA: What to do now */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">
                Sichtbarkeit gezielt verbessern
              </h2>
              <p className="text-sm text-gray-600 text-center mb-5">
                LLM Radar misst nicht nur — sondern hilft aktiv bei der Optimierung.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  { icon: Zap, title: 'Knowledge Builder', desc: 'Maschinenlesbare Wissensbasis für KI-Systeme' },
                  { icon: TrendingUp, title: 'Score Monitoring', desc: 'Veränderungen im Blick, automatische Alerts' },
                  { icon: FileText, title: 'Schema & MCP', desc: 'Technische Optimierungen automatisch generiert' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200">
                    <item.icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="/register"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  Kostenlos registrieren
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="/beta"
                  className="w-full py-3.5 rounded-xl border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 font-semibold text-center transition-all flex items-center justify-center gap-2"
                >
                  Ausführlichen Report ansehen
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal footer */}
      <footer className="border-t border-gray-100 py-6 mt-8 bg-white">
        <div className="max-w-lg mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <Radar className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-400">LLM Radar</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <a href="https://tbnpr.de/impressum" className="hover:text-gray-600 transition-colors" target="_blank" rel="noopener">Impressum</a>
            <a href="/datenschutz" className="hover:text-gray-600 transition-colors">Datenschutz</a>
            <a href="/agb" className="hover:text-gray-600 transition-colors">AGB</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
