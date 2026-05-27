'use client'

import { useState, useEffect, useRef } from 'react'
import { Radar, ArrowRight, CheckCircle2, Search, Shield, FileText, Clock, BarChart3, Brain, Sparkles, Zap, Eye, ChevronRight, Globe2, Bot, Database, Users, TrendingUp, Lock, Mail, X, ChevronDown, Building2, Headphones } from 'lucide-react'

/* ──────────────────────────────────────────────────────
   LLM Radar — Landing Page (v3 — Live with Stripe)
   ────────────────────────────────────────────────────── */

function AnimatedCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = Date.now()
          const tick = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * end))
            if (progress < 1) requestAnimationFrame(tick)
          }
          tick()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

function WaitlistForm({ variant = 'hero' }: { variant?: 'hero' | 'bottom' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing_page' }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Sie sind auf der Warteliste!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Etwas ist schiefgelaufen.')
      }
    } catch {
      setStatus('error')
      setMessage('Verbindungsfehler. Bitte versuchen Sie es erneut.')
    }
  }

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-3 ${variant === 'hero' ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-500/30'} rounded-xl px-6 py-4`}>
        <CheckCircle2 className={`w-6 h-6 flex-shrink-0 ${variant === 'hero' ? 'text-green-600' : 'text-green-400'}`} />
        <div>
          <p className={`font-medium ${variant === 'hero' ? 'text-green-800' : 'text-green-300'}`}>{message}</p>
          <a href="/beta" className={`text-sm underline mt-1 inline-block ${variant === 'hero' ? 'text-green-600 hover:text-green-700' : 'text-green-400 hover:text-green-300'}`}>
            → Jetzt Ihre kostenlose GEO-Analyse starten
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`flex flex-col sm:flex-row gap-3 ${variant === 'hero' ? 'max-w-xl' : 'max-w-lg mx-auto'}`}>
        <div className="relative flex-1">
          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${variant === 'hero' ? 'text-gray-400' : 'text-slate-500'}`} />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
            placeholder="ihre@email.de"
            className={`w-full pl-12 pr-4 py-4 rounded-xl text-base outline-none transition-all ${
              variant === 'hero'
                ? 'bg-white border-2 border-gray-200 focus:border-blue-500 text-gray-900 placeholder:text-gray-400 shadow-lg shadow-blue-500/5'
                : 'bg-white/10 border-2 border-white/20 focus:border-blue-400 text-white placeholder:text-slate-400'
            }`}
            required
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`px-8 py-4 rounded-xl font-semibold text-base transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
            variant === 'hero'
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5'
              : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30'
          } disabled:opacity-50`}
        >
          {status === 'loading' ? (
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Kostenlos analysieren
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-red-500 text-sm mt-2">{message}</p>
      )}
      <p className={`text-sm mt-3 ${variant === 'hero' ? 'text-gray-500' : 'text-slate-400'}`}>
        Kostenlose GEO-Analyse — kein Abo, keine Kreditkarte.
      </p>
    </form>
  )
}

function ScoreGaugeAnimation() {
  const [score, setScore] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          let current = 0
          const interval = setInterval(() => {
            current += 1
            if (current > 72) { clearInterval(interval); return }
            setScore(current)
          }, 25)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const getColor = (s: number) => {
    if (s < 30) return '#ef4444'
    if (s < 50) return '#f97316'
    if (s < 70) return '#eab308'
    return '#22c55e'
  }

  const circumference = 2 * Math.PI * 60
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div ref={ref} className="relative inline-flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="60" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="80" cy="80" r="60" fill="none"
          stroke={getColor(score)} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 0.1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-lg text-slate-400">/100</span>
      </div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Radar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">LLM Radar</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">So funktioniert&apos;s</a>
              <a href="#knowledge" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Knowledge Builder</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Preise</a>
              <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="/beta" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Kostenlose Analyse
              </a>
              <a href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Anmelden
              </a>
              <a href="/register" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                Jetzt starten
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">GEO — Generative Engine Optimization</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Wissen KI-Assistenten,{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                wer Sie sind?
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              ChatGPT, Gemini und Claude beantworten jeden Tag Millionen Fragen über Unternehmen wie Ihres.
              LLM Radar zeigt Ihnen, <strong>was diese KI-Systeme über Sie wissen</strong> — und wie Sie es verbessern.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" id="hero-cta">
              <a
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
              >
                Jetzt starten
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/beta"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-base hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                Kostenlose GEO-Analyse
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-4">Starter ab €99/Monat · GEO-Analyse dauerhaft kostenlos</p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-gray-200">
              {/* Fake browser chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded-lg px-4 py-1 text-sm text-gray-500 flex items-center gap-2 border">
                    <Lock className="w-3 h-3 text-green-600" />
                    llmradar.de/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Score card */}
                  <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-6 flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-slate-400 mb-4">GEO Score</p>
                    <ScoreGaugeAnimation />
                    <p className="text-sm text-green-400 mt-3 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> +12 seit letztem Monat
                    </p>
                  </div>
                  {/* Dimensions */}
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    {[
                      { label: 'KI-Sichtbarkeit', score: 68, icon: Eye, color: 'text-blue-400' },
                      { label: 'Schema Markup', score: 85, icon: FileText, color: 'text-green-400' },
                      { label: 'Content-Qualität', score: 72, icon: BarChart3, color: 'text-purple-400' },
                      { label: 'Content-Aktualität', score: 45, icon: Clock, color: 'text-orange-400' },
                    ].map((dim) => (
                      <div key={dim.label} className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <dim.icon className={`w-4 h-4 ${dim.color}`} />
                          <span className="text-sm text-slate-300">{dim.label}</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-white">{dim.score}</span>
                          <span className="text-sm text-slate-500 mb-0.5">/100</span>
                        </div>
                        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dim.score >= 70 ? 'bg-green-500' : dim.score >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${dim.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST BAR ═══════════════ */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500 mb-6">
            Wir analysieren Ihre Sichtbarkeit in den führenden KI-Systemen
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
            {[
              { name: 'ChatGPT', sub: 'OpenAI' },
              { name: 'Claude', sub: 'Anthropic' },
              { name: 'Gemini', sub: 'Google' },
              { name: 'Perplexity', sub: 'Perplexity AI' },
              { name: 'Copilot', sub: 'Microsoft' },
            ].map((ai) => (
              <div key={ai.name} className="flex flex-col items-center gap-1">
                <Bot className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">{ai.name}</span>
                <span className="text-xs text-gray-400">{ai.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PROBLEM ═══════════════ */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              Ihre Website ist optimiert.<br />
              <span className="text-gray-400">Aber wissen das auch die KI-Systeme?</span>
            </h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              SEO reicht nicht mehr. Immer mehr Menschen nutzen KI-Assistenten statt Google. 
              Wenn ChatGPT oder Gemini nach Ihrem Thema gefragt werden, 
              entscheidet ein <strong>neues Regelwerk</strong>, ob Ihr Unternehmen empfohlen wird — oder die Konkurrenz.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                stat: '40%',
                label: 'der B2B-Recherchen',
                desc: 'starten bereits bei KI-Assistenten statt bei Google.*',
              },
              {
                icon: Globe2,
                stat: '73%',
                label: 'der Unternehmen',
                desc: 'haben keine Strategie für KI-Sichtbarkeit (GEO).*',
              },
              {
                icon: TrendingUp,
                stat: '3×',
                label: 'höhere Sichtbarkeit',
                desc: 'für Unternehmen mit strukturierten Knowledge Layern.*',
              },
            ].map((item) => (
              <div key={item.label} className="text-center p-8 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mb-4">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-4xl font-extrabold text-gray-900 mb-1">
                  {item.stat === '3×' ? (
                    <><AnimatedCounter end={3} suffix="×" /></>
                  ) : item.stat === '40%' ? (
                    <AnimatedCounter end={40} suffix="%" />
                  ) : (
                    <AnimatedCounter end={73} suffix="%" />
                  )}
                </p>
                <p className="text-sm font-semibold text-gray-700 mb-2">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-6">
            * Branchenschätzungen und Erfahrungswerte 2025/2026
          </p>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-4">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">5 Dimensionen, 1 Score</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Ihre KI-Sichtbarkeit —<br className="hidden sm:block" /> messbar und steuerbar
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              LLM Radar analysiert Ihre Website in fünf Dimensionen und berechnet daraus einen Gesamt-Score, 
              den Sie kontinuierlich verbessern und monitoren können.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                title: 'KI-Sichtbarkeit',
                desc: 'Wir fragen ChatGPT, Gemini, Claude und Perplexity direkt nach Ihrem Unternehmen und Ihren Themen. Sie sehen, ob und wie Sie erwähnt werden.',
                color: 'bg-blue-500',
              },
              {
                icon: Shield,
                title: 'Technische Voraussetzungen',
                desc: 'Crawlability, robots.txt, Sitemaps, Page Speed — die technische Basis, damit KI-Systeme Ihre Inhalte überhaupt finden.',
                color: 'bg-indigo-500',
              },
              {
                icon: FileText,
                title: 'Schema Markup',
                desc: 'Strukturierte Daten (JSON-LD) helfen KIs, Ihre Inhalte zu verstehen. Wir prüfen, welche Schema-Typen vorhanden sind — und welche fehlen.',
                color: 'bg-purple-500',
              },
              {
                icon: BarChart3,
                title: 'Content-Qualität',
                desc: 'Klarheit, Tiefe und Struktur Ihrer Inhalte. KI-Systeme bevorzugen gut strukturierte, faktenbasierte Texte mit klarer Expertise.',
                color: 'bg-emerald-500',
              },
              {
                icon: Clock,
                title: 'Content-Aktualität',
                desc: 'Wie aktuell sind Ihre Inhalte? Veraltete Seiten senken Ihren Score. Wir zeigen, wo Updates nötig sind.',
                color: 'bg-orange-500',
              },
              {
                icon: Zap,
                title: 'GEO Score',
                desc: 'Alle Dimensionen fließen in einen Gesamtwert. Monitoren Sie Ihre Entwicklung, vergleichen Sie sich mit der Branche.',
                color: 'bg-blue-600',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${feature.color} mb-4`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              In 3 Schritten zur KI-Sichtbarkeit
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Von der Analyse bis zum aktiven Management — so einfach funktioniert LLM Radar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Analysieren',
                desc: 'Geben Sie Ihre Domain ein. Unser System prüft Ihre Website, fragt vier KI-Systeme nach Ihrem Unternehmen und erstellt Ihren GEO Score.',
                highlight: 'Kostenlos und unverbindlich',
              },
              {
                step: '02',
                icon: Database,
                title: 'Knowledge aufbauen',
                desc: 'Der Knowledge Builder extrahiert und strukturiert Ihre Website-Inhalte zu einem maschinenlesbaren Knowledge Layer — das Fundament für bessere KI-Antworten.',
                highlight: 'Automatisch + editierbar',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Monitoren & optimieren',
                desc: 'Verfolgen Sie Ihren Score über die Zeit. Sehen Sie, welche Änderungen wirken. Erhalten Sie Alerts und konkrete Empfehlungen.',
                highlight: 'Kontinuierliche Verbesserung',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full">
                    <div className="w-full border-t-2 border-dashed border-gray-200 relative top-0">
                      <ChevronRight className="absolute -right-1 -top-2.5 w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                )}
                <div className="relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-300 h-full">
                  <span className="text-5xl font-extrabold text-blue-50">{item.step}</span>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mb-4 mt-2">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-4">{item.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {item.highlight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ KNOWLEDGE BUILDER ═══════════════ */}
      <section id="knowledge" className="py-20 lg:py-28 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Knowledge Builder</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                Ihr Unternehmenswissen —{' '}
                <span className="text-blue-400">strukturiert für KI</span>
              </h2>
              <p className="mt-6 text-lg text-slate-300 leading-relaxed">
                Der Knowledge Builder crawlt Ihre Website und extrahiert die wichtigsten Informationen: 
                Services, FAQs, Team, Case Studies und mehr. Daraus entsteht ein strukturiertes Knowledge Layer, 
                das KI-Systeme als verlässliche Quelle nutzen können.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: Sparkles, text: 'Automatische Extraktion aus Ihrer Website' },
                  { icon: Users, text: 'Human-in-the-Loop: Sie behalten die volle Kontrolle' },
                  { icon: Shield, text: 'Nur geprüfte, verlässliche Inhalte werden ausgeliefert' },
                  { icon: Globe2, text: 'MCP-Server, Schema.org & llms.txt — alle Formate inklusive' },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual: Knowledge entities */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-slate-800/80 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300">Knowledge Base</h3>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full">Live</span>
                </div>
                <div className="space-y-3">
                  {[
                    { type: 'Service', name: 'B2B PR-Beratung', status: 'Approved', confidence: 95 },
                    { type: 'FAQ', name: 'Was kostet eine PR-Kampagne?', status: 'Approved', confidence: 88 },
                    { type: 'Team', name: 'Geschäftsführung & Berater', status: 'Review', confidence: 72 },
                    { type: 'Case Study', name: 'MedTech Product Launch', status: 'Approved', confidence: 91 },
                    { type: 'Expertise', name: 'Branchenwissen Food & Beverage', status: 'Draft', confidence: 65 },
                  ].map((entity) => (
                    <div
                      key={entity.name}
                      className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3 border border-slate-600/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                          entity.type === 'Service' ? 'bg-blue-500/20 text-blue-300' :
                          entity.type === 'FAQ' ? 'bg-purple-500/20 text-purple-300' :
                          entity.type === 'Team' ? 'bg-emerald-500/20 text-emerald-300' :
                          entity.type === 'Case Study' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {entity.type}
                        </span>
                        <span className="text-sm text-slate-200 truncate">{entity.name}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          entity.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                          entity.status === 'Review' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {entity.status}
                        </span>
                        <span className="text-xs text-slate-500">{entity.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                  <span>47 Entities • 38 Approved</span>
                  <span className="text-blue-400 cursor-pointer hover:text-blue-300">Alle anzeigen →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Transparent & fair</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Starten Sie kostenlos — skalieren Sie, wenn Sie bereit sind
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Die GEO-Analyse ist kostenlos. Für Knowledge Builder, Monitoring und Agentur-Service wählen Sie den passenden Plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
            {/* FREE */}
            <div className="rounded-2xl border-2 border-gray-200 p-6 bg-white flex flex-col">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Search className="w-4 h-4 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">GEO Check</h3>
                </div>
                <p className="text-sm text-gray-500">Einmal-Analyse Ihrer KI-Sichtbarkeit</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">€0</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '1 GEO-Diagnose pro Domain',
                  '4 KI-Engines (OpenAI, Claude, Gemini, Perplexity)',
                  'Vollständiger GEO Score + Subscores',
                  'Handlungsempfehlungen',
                  'Export-Vorschau (Schema.org, llms.txt)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/beta"
                className="block w-full text-center py-3 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                Kostenlos starten
              </a>
            </div>

            {/* STARTER */}
            <div className="rounded-2xl border-2 border-blue-600 p-6 bg-blue-50/30 relative flex flex-col">
              <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                EMPFOHLEN
              </div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Radar className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Starter</h3>
                </div>
                <p className="text-sm text-gray-500">Self-Service für KMU & Mittelstand</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">€99</span>
                <span className="text-sm text-gray-500 ml-1">/Monat</span>
                <p className="text-xs text-blue-600 font-medium mt-1">oder €79/Monat bei jährlicher Zahlung</p>
                <p className="text-xs text-gray-400 mt-0.5">Monatlich kündbar</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '1 Domain / Projekt',
                  'Wöchentliches Monitoring + Trends',
                  'Knowledge Builder (selbst editierbar)',
                  'Alle Exports (Schema.org, llms.txt, MCP)',
                  'FAQ-Generator (5×/Monat)',
                  'Wettbewerber-Analyse (3 Wettbewerber)',
                  'Quellen-Tracking',
                  'E-Mail-Support',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/register?plan=starter"
                className="block w-full text-center py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
              >
                Starter wählen
              </a>
            </div>

            {/* PRO */}
            <div className="rounded-2xl border-2 border-gray-200 p-6 bg-white flex flex-col">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Pro</h3>
                </div>
                <p className="text-sm text-gray-500">Für größere Unternehmen & Agenturen</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">€499</span>
                <span className="text-sm text-gray-500 ml-1">/Monat</span>
                <p className="text-xs text-purple-600 font-medium mt-1">oder €399/Monat bei jährlicher Zahlung</p>
                <p className="text-xs text-gray-400 mt-0.5">Monatlich kündbar</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Bis zu 5 Domains / Projekte',
                  'Tägliches Monitoring + Alerts',
                  'Knowledge Builder (unbegrenzte Entitäten)',
                  'FAQ-Generator (unbegrenzt)',
                  'Wettbewerber-Analyse (10 pro Domain)',
                  'Alle Exports + API-Zugang',
                  'E-Mail- und Slack-Alerts',
                  'Prioritäts-Support',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/register?plan=pro"
                className="block w-full text-center py-3 px-6 rounded-xl border-2 border-purple-200 text-purple-700 font-semibold hover:border-purple-400 hover:bg-purple-50 transition-all"
              >
                Pro wählen
              </a>
            </div>

            {/* MANAGED */}
            <div className="rounded-2xl border-2 border-gray-200 p-6 bg-gradient-to-b from-slate-50 to-white flex flex-col">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Managed</h3>
                </div>
                <p className="text-sm text-gray-500">Agentur-Service durch TBN</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold text-gray-900">ab €799</span>
                <span className="text-sm text-gray-500 ml-1">/Monat</span>
                <p className="text-xs text-emerald-600 font-medium mt-1">Jahresvertrag · individuell nach Umfang</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Alles aus Pro, plus:',
                  'TBN pflegt Ihre Knowledge Base',
                  'Initiales KB-Setup inklusive',
                  'Monatlicher GEO-Report (PDF)',
                  'Quartals-Strategie-Call',
                  'Content-Empfehlungen',
                  'Unbegrenzte Domains (nach Vereinbarung)',
                  'Persönlicher Ansprechpartner',
                ].map((item, i) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${i === 0 ? 'text-emerald-500' : 'text-emerald-500'}`} />
                    <span className={`text-sm ${i === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:geo@tbnpr.de?subject=LLM%20Radar%20Managed%20—%20Anfrage"
                className="block w-full text-center py-3 px-6 rounded-xl border-2 border-emerald-200 text-emerald-700 font-semibold hover:border-emerald-400 hover:bg-emerald-50 transition-all"
              >
                Kontakt aufnehmen
              </a>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Alle Preise verstehen sich zzgl. der gesetzlichen MwSt. von 19%.
          </p>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section id="faq" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Häufig gestellte Fragen
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-200 px-6">
            <FAQItem
              question="Was ist GEO (Generative Engine Optimization)?"
              answer="GEO ist das Äquivalent zu SEO für KI-Systeme. Während SEO Ihre Website für Google optimiert, sorgt GEO dafür, dass KI-Assistenten wie ChatGPT, Gemini oder Claude Ihr Unternehmen kennen und korrekt empfehlen. Da immer mehr Nutzer KI statt klassische Suchmaschinen nutzen, wird GEO zum entscheidenden Wettbewerbsfaktor."
            />
            <FAQItem
              question="Was genau passiert bei der kostenlosen GEO-Analyse?"
              answer="Wir analysieren Ihre Website und befragen vier führende KI-Systeme (OpenAI, Anthropic Claude, Google Gemini und Perplexity) direkt zu Ihrem Unternehmen und Ihren Kernthemen. Daraus berechnen wir Ihren GEO Score (0–100) mit Subscores für KI-Sichtbarkeit, technische Voraussetzungen, Schema Markup, Content-Qualität und Content-Aktualität. Sie erhalten konkrete Handlungsempfehlungen."
            />
            <FAQItem
              question="Was ist der Knowledge Builder?"
              answer="Der Knowledge Builder extrahiert automatisch die wichtigsten Informationen von Ihrer Website — Services, FAQs, Team, Case Studies, Produkte und mehr — und strukturiert sie in einem maschinenlesbaren Knowledge Layer. Dieses Layer kann als MCP-Server, Schema.org JSON-LD, llms.txt oder skills.md exportiert werden, damit KI-Systeme Ihre Inhalte als verlässliche Quelle nutzen. Sie behalten dabei die volle Kontrolle: Alle Inhalte sind editierbar (Human-in-the-Loop)."
            />
            <FAQItem
              question="Wie unterscheidet sich LLM Radar von reinen Monitoring-Tools?"
              answer="Die meisten Tools auf dem Markt messen nur — LLM Radar misst und repariert. Neben dem Monitoring bieten wir den Knowledge Builder, einen Schema.org-Generator, einen FAQ-Generator, MCP-Server-Integration und optionalen Agentur-Service. Statt nur ein Thermometer zu sein, sind wir Thermometer + Arzt + Apotheke."
            />
            <FAQItem
              question="Muss ich technisches Wissen mitbringen?"
              answer="Nein. Die Analyse läuft vollautomatisch. Der Knowledge Builder extrahiert und strukturiert Ihre Inhalte eigenständig. Sie müssen nur prüfen und freigeben. Für die technische Integration (Schema.org, MCP-Server) liefern wir fertige Code-Snippets zum Einbinden — oder unser Managed-Service übernimmt alles für Sie."
            />
            <FAQItem
              question="Was ist der Managed-Service?"
              answer="Im Managed-Tarif übernimmt das TBN-Team die vollständige Pflege Ihrer Knowledge Base, erstellt monatliche GEO-Reports mit Handlungsempfehlungen, führt quartalsweise Strategie-Calls durch und gibt konkrete Content-Empfehlungen. Ideal für Unternehmen, die das Thema KI-Sichtbarkeit professionell angehen möchten, ohne interne Ressourcen aufzubauen."
            />
            <FAQItem
              question="Kann ich LLM Radar kostenlos testen?"
              answer="Ja! Die GEO-Analyse ist dauerhaft kostenlos — Sie erhalten einen vollständigen GEO Score mit Subscores und Handlungsempfehlungen. Für erweiterte Funktionen wie den Knowledge Builder, Monitoring und Exports wählen Sie den Starter- oder Pro-Plan."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ BOTTOM CTA ═══════════════ */}
      <section id="bottom-cta" className="py-20 lg:py-28 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-blue-200">Jetzt live — sofort loslegen</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Starten Sie jetzt,{' '}
            <span className="text-blue-400">bevor es Ihre Konkurrenz tut</span>
          </h2>
          <p className="mt-6 text-lg text-slate-300 max-w-xl mx-auto">
            Kostenlose GEO-Analyse in 2 Minuten. Oder starten Sie direkt mit Starter oder Pro
            für Knowledge Builder, Monitoring und Exports.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold text-base shadow-lg shadow-blue-500/30 transition-all"
            >
              Konto erstellen
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/beta"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/20 text-white font-semibold text-base hover:border-blue-400 transition-all"
            >
              Kostenlose Analyse
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Radar className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">LLM Radar</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>Ein Produkt von <a href="https://tbnpr.de" className="text-gray-700 hover:text-blue-600 transition-colors font-medium" target="_blank" rel="noopener">TBN Public Relations GmbH</a></span>
              <span>•</span>
              <a href="https://tbnpr.de/impressum" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener">Impressum</a>
              <a href="https://tbnpr.de/datenschutz" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener">Datenschutz</a>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} TBN Public Relations GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  )
}
