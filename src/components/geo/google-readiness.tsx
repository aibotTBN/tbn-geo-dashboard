'use client'

import { useState } from 'react'
import {
  Loader2, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink,
  ChevronDown, ChevronUp, Search, Gauge, FileCode2, Shield,
  Smartphone, Eye, Zap, Globe2, RefreshCw,
} from 'lucide-react'

/* ─── Types ─── */

interface CoreWebVital {
  value: number
  unit: string
  rating: string
}

interface Audit {
  title: string
  score: number
  description: string
}

interface SchemaData {
  valid: boolean
  types: string[]
  errors: string[]
  warnings: string[]
  count: number
  rawSchemas: any[]
}

interface PageSpeedData {
  seoScore: number
  performanceScore: number
  bestPracticesScore: number
  accessibilityScore: number
  coreWebVitals: {
    lcp: CoreWebVital
    fid: CoreWebVital
    cls: CoreWebVital
    fcp: CoreWebVital
    ttfb: CoreWebVital
  }
  seoAudits: Audit[]
  structuredDataAudits: Audit[]
}

interface GoogleReadinessData {
  domain: string
  readinessScore: number
  schema: SchemaData
  pageSpeed: PageSpeedData | null
  checkedAt: string
}

/* ─── Helpers ─── */

function getScoreColor(score: number) {
  if (score >= 90) return { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-200', label: 'Excellent' }
  if (score >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', ring: 'ring-yellow-200', label: 'Ausbaufähig' }
  if (score >= 30) return { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-200', label: 'Schwach' }
  return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200', label: 'Kritisch' }
}

function getRatingColor(rating: string) {
  if (rating === 'good') return 'text-green-600 bg-green-50'
  if (rating === 'needs-improvement') return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

/* ─── Score Ring ─── */

function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label: string }) {
  const color = getScoreColor(score)
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={score >= 90 ? '#22c55e' : score >= 50 ? '#eab308' : score >= 30 ? '#f97316' : '#ef4444'}
            strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color.text}`}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-gray-500 text-center leading-tight">{label}</span>
    </div>
  )
}

/* ─── Schema Type Badge ─── */

const SCHEMA_TYPE_COLORS: Record<string, string> = {
  Organization: 'bg-blue-100 text-blue-700 border-blue-200',
  LocalBusiness: 'bg-blue-100 text-blue-700 border-blue-200',
  WebSite: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  FAQPage: 'bg-green-100 text-green-700 border-green-200',
  BreadcrumbList: 'bg-gray-100 text-gray-600 border-gray-200',
  Article: 'bg-amber-100 text-amber-700 border-amber-200',
  BlogPosting: 'bg-amber-100 text-amber-700 border-amber-200',
  Service: 'bg-purple-100 text-purple-700 border-purple-200',
  Product: 'bg-purple-100 text-purple-700 border-purple-200',
  Person: 'bg-teal-100 text-teal-700 border-teal-200',
}

function SchemaTypeBadge({ type }: { type: string }) {
  const color = SCHEMA_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}>
      {type}
    </span>
  )
}

/* ─── Core Web Vitals Row ─── */

function CwvMetric({ label, vital }: { label: string; vital: CoreWebVital }) {
  const colorClass = getRatingColor(vital.rating)
  const displayValue = vital.unit === 'ms' ? formatMs(vital.value) : vital.value.toFixed(3)

  return (
    <div className={`rounded-lg px-3 py-2 ${colorClass}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-bold">{displayValue}</p>
    </div>
  )
}

/* ─── SEO Audit Item ─── */

function AuditItem({ audit }: { audit: Audit }) {
  const passed = audit.score >= 0.9
  const partial = audit.score >= 0.5

  return (
    <div className="flex items-center gap-2 text-sm py-1">
      {passed ? (
        <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
      ) : partial ? (
        <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
      )}
      <span className={passed ? 'text-gray-600' : partial ? 'text-yellow-700 font-medium' : 'text-red-700 font-medium'}>
        {audit.title}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */

export function GoogleReadinessCheck({ domain }: { domain: string }) {
  const [data, setData] = useState<GoogleReadinessData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandSchema, setExpandSchema] = useState(false)
  const [expandSeo, setExpandSeo] = useState(false)
  const [expandCwv, setExpandCwv] = useState(false)

  const runCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/geo/google-readiness?domain=${encodeURIComponent(domain)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Fehler ${res.status}`)
      }
      const result = await res.json()
      setData(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Not yet checked
  if (!data && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Globe2 size={18} className="text-blue-600" />
              Google Readiness Check
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Schema.org Validierung + PageSpeed SEO-Score für {domain}
            </p>
          </div>
          <button
            onClick={runCheck}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Search size={15} /> Jetzt prüfen
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <Globe2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Prüft Ihre Website auf Schema.org Markup, Google PageSpeed SEO-Score, Core Web Vitals und weitere Google-relevante Faktoren.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Dauert ca. 15–30 Sekunden
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle size={14} className="inline mr-1" /> {error}
          </div>
        )}
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 size={18} className="text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Google Readiness Check</h3>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-8 text-center">
          <Loader2 size={32} className="mx-auto text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-blue-800">Analyse läuft…</p>
          <p className="text-xs text-blue-600 mt-1">PageSpeed API & Schema.org Validierung</p>
        </div>
      </div>
    )
  }

  // Results
  if (!data) return null

  const schema = data.schema
  const ps = data.pageSpeed
  const overallColor = getScoreColor(data.readinessScore)

  return (
    <div className="space-y-5">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Globe2 size={18} className="text-blue-600" />
            Google Readiness Check
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Geprüft am {new Date(data.checkedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} /> Erneut prüfen
        </button>
      </div>

      {/* Score overview row */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Overall Readiness Score */}
          <div className="flex items-center gap-4">
            <ScoreRing score={data.readinessScore} size={90} label="Readiness" />
            <div>
              <p className={`text-sm font-semibold ${overallColor.text}`}>{overallColor.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">Google Readiness Score</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-16 w-px bg-gray-200 hidden sm:block" />

          {/* PageSpeed Scores */}
          {ps && (
            <div className="flex items-center gap-4">
              <ScoreRing score={ps.seoScore} size={70} label="SEO" />
              <ScoreRing score={ps.performanceScore} size={70} label="Performance" />
              <ScoreRing score={ps.accessibilityScore} size={70} label="Accessibility" />
              <ScoreRing score={ps.bestPracticesScore} size={70} label="Best Practices" />
            </div>
          )}
        </div>
      </div>

      {/* Schema.org Validation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setExpandSchema(!expandSchema)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FileCode2 size={16} className="text-purple-600" />
            <span className="text-sm font-semibold text-gray-900">Schema.org Markup</span>
            {schema.count > 0 ? (
              <span className="text-xs text-green-600 bg-green-50 rounded-full px-2 py-0.5 font-medium">
                {schema.count} Schema{schema.count !== 1 ? 's' : ''} gefunden
              </span>
            ) : (
              <span className="text-xs text-red-600 bg-red-50 rounded-full px-2 py-0.5 font-medium">
                Nicht vorhanden
              </span>
            )}
          </div>
          {expandSchema ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {expandSchema && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
            {/* Types found */}
            {schema.types.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gefundene Schema-Typen</p>
                <div className="flex flex-wrap gap-1.5">
                  {schema.types.map((t, i) => <SchemaTypeBadge key={i} type={t} />)}
                </div>
              </div>
            )}

            {/* Errors */}
            {schema.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">Fehler</p>
                {schema.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-1">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {e}
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {schema.warnings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1.5">
                  Hinweise & Empfehlungen ({schema.warnings.length})
                </p>
                <div className="space-y-1">
                  {schema.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" /> {w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All good */}
            {schema.count > 0 && schema.errors.length === 0 && schema.warnings.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle2 size={14} /> Schema.org Markup ist valide und vollständig!
              </div>
            )}

            {/* Missing schema CTA */}
            {schema.count === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-1">💡 Schema.org Markup fehlt</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Ohne strukturierte Daten können Google AI Overviews und andere KI-Systeme Ihre Inhalte nicht zuverlässig zuordnen. 
                  LLM Radar kann Schema.org-Markup aus Ihrer Knowledge Base generieren — nutzen Sie den Export.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEO Audits from PageSpeed */}
      {ps && ps.seoAudits.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setExpandSeo(!expandSeo)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Search size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-gray-900">SEO-Checks (PageSpeed)</span>
              {(() => {
                const passed = ps.seoAudits.filter(a => a.score >= 0.9).length
                const total = ps.seoAudits.length
                return (
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    passed === total ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
                  }`}>
                    {passed}/{total} bestanden
                  </span>
                )
              })()}
            </div>
            {expandSeo ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {expandSeo && (
            <div className="px-5 pb-4 border-t border-gray-100 pt-3">
              <div className="space-y-0.5">
                {ps.seoAudits.map((audit, i) => <AuditItem key={i} audit={audit} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Core Web Vitals */}
      {ps && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setExpandCwv(!expandCwv)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Zap size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-gray-900">Core Web Vitals</span>
              {(() => {
                const cwv = ps.coreWebVitals
                const good = [cwv.lcp, cwv.cls, cwv.fcp].filter(v => v.rating === 'good').length
                return (
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    good === 3 ? 'text-green-600 bg-green-50' : good >= 2 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
                  }`}>
                    {good}/3 gut
                  </span>
                )
              })()}
            </div>
            {expandCwv ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {expandCwv && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <CwvMetric label="LCP" vital={ps.coreWebVitals.lcp} />
                <CwvMetric label="FCP" vital={ps.coreWebVitals.fcp} />
                <CwvMetric label="CLS" vital={ps.coreWebVitals.cls} />
                <CwvMetric label="FID" vital={ps.coreWebVitals.fid} />
                <CwvMetric label="TTFB" vital={ps.coreWebVitals.ttfb} />
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                Daten von Google PageSpeed Insights (Mobile). 
                <a href={`https://pagespeed.web.dev/analysis?url=https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                  Vollständiger Report <ExternalLink size={9} className="inline" />
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* PageSpeed not available */}
      {!ps && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700">
          <AlertTriangle size={14} className="inline mr-1" /> PageSpeed Insights-Daten konnten nicht abgerufen werden. Nur Schema.org-Validierung verfügbar.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle size={14} className="inline mr-1" /> {error}
        </div>
      )}
    </div>
  )
}
