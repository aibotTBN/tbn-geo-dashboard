'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, MinusCircle,
  ChevronDown, ChevronUp, RefreshCw, ExternalLink, Shield,
  FileText, Globe2, Eye, Zap, Database, Code2,
} from 'lucide-react'

/* ─── Types ─── */

interface AuditResult {
  id: string
  title: string
  description: string
  passed: boolean | null // null = skipped
  details: string
  learnMoreUrl?: string
}

interface AgenticBrowsingData {
  domain: string
  audits: AuditResult[]
  summary: {
    passCount: number
    totalCount: number
    gradedCount: number
    skippedCount: number
    passRatio: string
    lighthouseLabel: string
  }
  checkedAt: string
}

/* ─── Audit icon mapping ─── */

const AUDIT_ICONS: Record<string, React.ElementType> = {
  'llms-txt': FileText,
  'webmcp-registered': Globe2,
  'webmcp-forms': Database,
  'webmcp-schema': Code2,
  'agent-a11y': Eye,
  'layout-stability': Zap,
}

/* ─── Helpers ─── */

function getPassRatioColor(passCount: number, gradedCount: number) {
  if (gradedCount === 0) return { text: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' }
  const ratio = passCount / gradedCount
  if (ratio >= 0.8) return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' }
  if (ratio >= 0.5) return { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' }
  if (ratio >= 0.25) return { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' }
  return { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
}

function getPassRatioLabel(passCount: number, gradedCount: number) {
  if (gradedCount === 0) return 'Keine Daten'
  const ratio = passCount / gradedCount
  if (ratio >= 0.8) return 'Sehr gut'
  if (ratio >= 0.5) return 'Ausbaufähig'
  if (ratio >= 0.25) return 'Schwach'
  return 'Kritisch'
}

/* ─── Audit Row ─── */

function AuditRow({ audit, isExpanded, onToggle }: {
  audit: AuditResult
  isExpanded: boolean
  onToggle: () => void
}) {
  const Icon = AUDIT_ICONS[audit.id] || Shield

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      audit.passed === true
        ? 'border-green-200 bg-white'
        : audit.passed === false
          ? 'border-red-100 bg-red-50/20'
          : 'border-gray-200 bg-gray-50/50'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors text-left"
      >
        {/* Status icon */}
        {audit.passed === true ? (
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
        ) : audit.passed === false ? (
          <XCircle size={18} className="text-red-500 flex-shrink-0" />
        ) : (
          <MinusCircle size={18} className="text-gray-400 flex-shrink-0" />
        )}

        {/* Audit icon + title */}
        <Icon size={14} className="text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${
            audit.passed === true ? 'text-gray-700' :
            audit.passed === false ? 'text-red-800' : 'text-gray-500'
          }`}>
            {audit.title}
          </span>
        </div>

        {/* Badge */}
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          audit.passed === true
            ? 'text-green-600 bg-green-100'
            : audit.passed === false
              ? 'text-red-600 bg-red-100'
              : 'text-gray-500 bg-gray-200'
        }`}>
          {audit.passed === true ? 'Pass' : audit.passed === false ? 'Fail' : 'N/A'}
        </span>

        {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">{audit.description}</p>
          <div className={`rounded-md px-3 py-2 text-xs ${
            audit.passed === true
              ? 'bg-green-50 text-green-700'
              : audit.passed === false
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {audit.details}
          </div>
          {audit.learnMoreUrl && (
            <a
              href={audit.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
            >
              Mehr erfahren <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Pass Ratio Badge (Lighthouse-style) ─── */

function PassRatioBadge({ passCount, gradedCount }: { passCount: number; gradedCount: number }) {
  const color = getPassRatioColor(passCount, gradedCount)
  const circumference = 2 * Math.PI * 30
  const ratio = gradedCount > 0 ? passCount / gradedCount : 0
  const offset = circumference - ratio * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[76px] h-[76px]">
        <svg width={76} height={76} viewBox="0 0 76 76">
          <circle cx={38} cy={38} r={30} fill="none" stroke="#e5e7eb" strokeWidth={5} />
          <circle
            cx={38} cy={38} r={30} fill="none"
            stroke={ratio >= 0.8 ? '#22c55e' : ratio >= 0.5 ? '#eab308' : ratio >= 0.25 ? '#f97316' : '#ef4444'}
            strokeWidth={5} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 38 38)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color.text}`}>{passCount}/{gradedCount}</span>
        </div>
      </div>
      <span className={`text-[10px] font-semibold ${color.text}`}>{getPassRatioLabel(passCount, gradedCount)}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */

export function AgenticBrowsingCheck({ domain }: { domain: string }) {
  const [data, setData] = useState<AgenticBrowsingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAudits, setExpandedAudits] = useState<Set<string>>(new Set())

  // Auto-load persisted results on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch(`/api/geo/agentic-browsing?domain=${encodeURIComponent(domain)}&load=1`)
        if (res.ok) {
          const { saved } = await res.json()
          if (saved) {
            setData(saved)
            const failedIds = new Set<string>(
              saved.audits.filter((a: AuditResult) => a.passed === false).map((a: AuditResult) => a.id)
            )
            setExpandedAudits(failedIds)
          }
        }
      } catch {
        // Silent — will just show "not yet checked" state
      } finally {
        setInitialLoading(false)
      }
    }
    loadSaved()
  }, [domain])

  const runCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/geo/agentic-browsing?domain=${encodeURIComponent(domain)}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Fehler ${res.status}`)
      }
      const result = await res.json()
      setData(result)
      // Auto-expand failed audits
      const failedIds = new Set<string>(result.audits.filter((a: AuditResult) => a.passed === false).map((a: AuditResult) => a.id))
      setExpandedAudits(failedIds)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAudit = (id: string) => {
    setExpandedAudits(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!data) return
    if (expandedAudits.size === data.audits.length) {
      setExpandedAudits(new Set())
    } else {
      setExpandedAudits(new Set(data.audits.map(a => a.id)))
    }
  }

  /* ─── Initial loading ─── */
  if (initialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">Lighthouse Agentic Browsing</h3>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <Loader2 size={24} className="mx-auto text-gray-400 animate-spin mb-2" />
          <p className="text-xs text-gray-400">Lade gespeicherte Ergebnisse…</p>
        </div>
      </div>
    )
  }

  /* ─── Not yet checked ─── */
  if (!data && !loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={18} className="text-indigo-600" />
              Lighthouse Agentic Browsing
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              6 Audits aus Chrome Lighthouse für {domain}
            </p>
          </div>
          <button
            onClick={runCheck}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Shield size={15} /> Jetzt prüfen
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
          <Shield size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Prüft Ihre Website gegen die 6 Lighthouse Agentic Browsing Audits: llms.txt, WebMCP-Tool-Registrierung, WebMCP-Formulare, WebMCP-Schema, Barrierefreiheit und Layout-Stabilität.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Chrome Lighthouse Agentic Browsing Scoring · Dauert ca. 10–15 Sekunden
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

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">Lighthouse Agentic Browsing</h3>
        </div>
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-8 text-center">
          <Loader2 size={32} className="mx-auto text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-indigo-800">Agentic Browsing Audit läuft…</p>
          <p className="text-xs text-indigo-600 mt-1">Prüfe llms.txt, WebMCP, Barrierefreiheit &amp; Layout-Stabilität</p>
        </div>
      </div>
    )
  }

  /* ─── Results ─── */
  if (!data) return null

  const { summary } = data
  const color = getPassRatioColor(summary.passCount, summary.gradedCount)
  const passedAudits = data.audits.filter(a => a.passed === true)
  const failedAudits = data.audits.filter(a => a.passed === false)
  const skippedAudits = data.audits.filter(a => a.passed === null)

  return (
    <div className="space-y-5">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={18} className="text-indigo-600" />
            Lighthouse Agentic Browsing
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

      {/* Summary card */}
      <div className={`rounded-xl border ${color.border} ${color.bg} p-5`}>
        <div className="flex items-center gap-6 flex-wrap">
          <PassRatioBadge passCount={summary.passCount} gradedCount={summary.gradedCount} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${color.text}`}>
              {summary.lighthouseLabel}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {passedAudits.length} bestanden · {failedAudits.length} fehlgeschlagen
              {skippedAudits.length > 0 && ` · ${skippedAudits.length} nicht anwendbar`}
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              Basierend auf Chrome Lighthouse Agentic Browsing Scoring.
              Pass/Fail pro Audit — kein gewichteter Score.
            </p>
          </div>
          <a
            href="https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            Lighthouse Docs <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Audit list */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Einzelne Audits
          </p>
          <button
            onClick={toggleAll}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {expandedAudits.size === data.audits.length ? 'Alle schließen' : 'Alle öffnen'}
          </button>
        </div>

        {/* Failed first, then passed, then skipped */}
        {[...failedAudits, ...passedAudits, ...skippedAudits].map(audit => (
          <AuditRow
            key={audit.id}
            audit={audit}
            isExpanded={expandedAudits.has(audit.id)}
            onToggle={() => toggleAudit(audit.id)}
          />
        ))}
      </div>

      {/* Quick fix suggestions for failed audits */}
      {failedAudits.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">💡 Schnelle Verbesserungen</p>
          <ul className="space-y-1.5 text-xs text-blue-700">
            {failedAudits.some(a => a.id === 'llms-txt') && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  <strong>llms.txt erstellen:</strong> LLM Radar generiert diese Datei automatisch aus Ihrer Knowledge Base — nutzen Sie den Export und platzieren Sie sie unter <code className="bg-blue-100 px-1 rounded">/llms.txt</code>.
                </span>
              </li>
            )}
            {failedAudits.some(a => a.id === 'webmcp-registered') && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  <strong>WebMCP-Tools registrieren:</strong> Fügen Sie <code className="bg-blue-100 px-1 rounded">{'<template data-webmcp-tool="name">'}</code>-Elemente in Ihren HTML-Code ein, damit KI-Agenten mit Ihrer Website interagieren können.
                </span>
              </li>
            )}
            {failedAudits.some(a => a.id === 'webmcp-forms') && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  <strong>Formulare annotieren:</strong> Jedes {'<form>'} sollte ein zugehöriges WebMCP-Template haben, das die Formular-Interaktion beschreibt.
                </span>
              </li>
            )}
            {failedAudits.some(a => a.id === 'agent-a11y') && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  <strong>Accessibility verbessern:</strong> Nutzen Sie semantisches HTML (nav, main, header), ARIA-Rollen und Labels. Agenten navigieren über den Accessibility-Tree.
                </span>
              </li>
            )}
            {failedAudits.some(a => a.id === 'layout-stability') && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  <strong>Layout stabilisieren:</strong> Setzen Sie width/height auf Bilder, nutzen Sie <code className="bg-blue-100 px-1 rounded">font-display: swap</code> und vermeiden Sie document.write().
                </span>
              </li>
            )}
          </ul>
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
