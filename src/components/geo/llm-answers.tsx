'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, CheckCircle2, XCircle, MessageSquare, Eye, EyeOff } from 'lucide-react'

/**
 * Engine metadata for display.
 */
const ENGINE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  openai: { label: 'ChatGPT', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🟢' },
  claude: { label: 'Claude', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🟠' },
  gemini: { label: 'Gemini', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🔵' },
  perplexity: { label: 'Perplexity', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: '🟣' },
}

const ENGINE_ORDER = ['openai', 'claude', 'gemini', 'perplexity']

interface QueryResult {
  query: string
  brand_mentioned: boolean
  summary?: string
  response?: string
  sources?: string[]
}

interface EngineData {
  status: string
  score: number
  mentioned: number
  total: number
  results?: QueryResult[]
}

interface LlmAnswersProps {
  reportJson: string | null
  domain: string
  projectName?: string
}

/**
 * Highlight brand/domain mentions in text.
 */
function HighlightedText({ text, brandTerms, competitorTerms }: {
  text: string
  brandTerms: string[]
  competitorTerms?: string[]
}) {
  if (!text) return null

  // Build regex for brand terms
  const allBrandPatterns = brandTerms.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const allCompPatterns = (competitorTerms || []).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  
  if (allBrandPatterns.length === 0 && allCompPatterns.length === 0) {
    return <span>{text}</span>
  }

  const patterns: { regex: RegExp; type: 'brand' | 'competitor' }[] = []
  if (allBrandPatterns.length > 0) {
    patterns.push({ regex: new RegExp(`(${allBrandPatterns.join('|')})`, 'gi'), type: 'brand' })
  }
  if (allCompPatterns.length > 0) {
    patterns.push({ regex: new RegExp(`(${allCompPatterns.join('|')})`, 'gi'), type: 'competitor' })
  }

  // Simple approach: split on brand terms first, then check for competitors
  const combinedPatterns = [...allBrandPatterns, ...allCompPatterns]
  if (combinedPatterns.length === 0) return <span>{text}</span>

  const combinedRegex = new RegExp(`(${combinedPatterns.join('|')})`, 'gi')
  const parts = text.split(combinedRegex)

  return (
    <span>
      {parts.map((part, i) => {
        const lowerPart = part.toLowerCase()
        const isBrand = allBrandPatterns.some(p => lowerPart === p.toLowerCase())
        const isCompetitor = allCompPatterns.some(p => lowerPart === p.toLowerCase())
        
        if (isBrand) {
          return (
            <mark key={i} className="bg-green-100 text-green-800 px-0.5 rounded font-medium">
              {part}
            </mark>
          )
        }
        if (isCompetitor) {
          return (
            <mark key={i} className="bg-orange-100 text-orange-800 px-0.5 rounded font-medium">
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

/**
 * Single engine response card within a query.
 */
function EngineResponse({ engineKey, result, brandTerms }: {
  engineKey: string
  result: QueryResult
  brandTerms: string[]
}) {
  const meta = ENGINE_META[engineKey] || { label: engineKey, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: '⚪' }
  const summaryText = result.summary || result.response || ''
  
  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{meta.icon}</span>
          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
        </div>
        {result.brand_mentioned ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 rounded-full px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" /> Erwähnt
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 rounded-full px-2 py-0.5">
            <XCircle className="w-3 h-3" /> Nicht erwähnt
          </span>
        )}
      </div>
      {summaryText && (
        <p className="text-sm text-gray-700 leading-relaxed">
          <HighlightedText text={summaryText} brandTerms={brandTerms} />
        </p>
      )}
      {result.sources && result.sources.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200/50">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Quellen</p>
          <div className="flex flex-wrap gap-1">
            {result.sources.slice(0, 5).map((src, i) => (
              <a
                key={i}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 underline underline-offset-2 truncate max-w-[200px]"
              >
                {src.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Main LLM Answers component.
 * Shows all LLM responses grouped by query.
 */
export function LlmAnswers({ reportJson, domain, projectName }: LlmAnswersProps) {
  const [filter, setFilter] = useState<'all' | 'mentioned' | 'missing'>('all')
  const [expandedQueries, setExpandedQueries] = useState<Set<number>>(new Set())
  const [showAll, setShowAll] = useState(false)

  // Parse the report data
  const { queries, engines, brandTerms } = useMemo(() => {
    if (!reportJson) return { queries: [], engines: [], brandTerms: [] }

    try {
      const raw = typeof reportJson === 'string' ? JSON.parse(reportJson) : reportJson
      const report = raw?.report || raw
      const citationEngines: Record<string, EngineData> = report?.citation_engines || {}

      // Build brand terms for highlighting
      const terms: string[] = [domain]
      if (projectName && projectName !== domain) {
        terms.push(projectName)
        // Also add parts of the company name (e.g. "TBN" from "TBN Public Relations GmbH")
        const nameParts = projectName.split(/\s+/).filter(p => p.length > 2 && !['gmbh', 'gmbh.', 'ag', 'inc', 'ltd', 'the', 'und', 'and'].includes(p.toLowerCase()))
        if (nameParts.length > 0) terms.push(nameParts[0])
      }

      // Collect all queries across engines
      const queryMap = new Map<string, Map<string, QueryResult>>()
      const activeEngines: string[] = []

      for (const engineKey of ENGINE_ORDER) {
        const engineData = citationEngines[engineKey]
        if (!engineData || engineData.status !== 'ok' || !engineData.results) continue
        activeEngines.push(engineKey)

        for (const result of engineData.results) {
          const q = result.query?.trim()
          if (!q) continue
          if (!queryMap.has(q)) queryMap.set(q, new Map())
          queryMap.get(q)!.set(engineKey, result)
        }
      }

      // Convert to array
      const queryArray = Array.from(queryMap.entries()).map(([query, engineResults]) => {
        const anyMentioned = Array.from(engineResults.values()).some(r => r.brand_mentioned)
        const allMentioned = activeEngines.every(e => engineResults.get(e)?.brand_mentioned)
        return {
          query,
          engineResults,
          anyMentioned,
          allMentioned,
          mentionCount: Array.from(engineResults.values()).filter(r => r.brand_mentioned).length,
          totalEngines: activeEngines.length,
        }
      })

      return { queries: queryArray, engines: activeEngines, brandTerms: terms }
    } catch {
      return { queries: [], engines: [], brandTerms: [] }
    }
  }, [reportJson, domain, projectName])

  if (queries.length === 0) return null

  // Filter queries
  const filteredQueries = queries.filter(q => {
    if (filter === 'mentioned') return q.anyMentioned
    if (filter === 'missing') return !q.anyMentioned
    return true
  })

  const visibleQueries = showAll ? filteredQueries : filteredQueries.slice(0, 5)
  const missingCount = queries.filter(q => !q.anyMentioned).length
  const mentionedCount = queries.filter(q => q.anyMentioned).length

  const toggleQuery = (idx: number) => {
    setExpandedQueries(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-600" />
            Ergebnisse der LLM-Suche
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {queries.length} Fragen an {engines.length} KI-Systeme — {mentionedCount} mit Erwähnung, {missingCount} ohne
          </p>
        </div>
        
        {/* Filter pills */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search size={12} /> Alle ({queries.length})
          </button>
          <button
            onClick={() => setFilter('mentioned')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'mentioned' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye size={12} /> Erwähnt ({mentionedCount})
          </button>
          <button
            onClick={() => setFilter('missing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === 'missing' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <EyeOff size={12} /> Lücken ({missingCount})
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
          Eigene Marke erwähnt
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300" />
          Wettbewerber erwähnt
        </span>
      </div>

      {/* Query list */}
      <div className="space-y-2">
        {visibleQueries.map((q, idx) => {
          const isExpanded = expandedQueries.has(idx)
          return (
            <div key={idx} className={`rounded-xl border transition-colors ${
              q.anyMentioned ? 'border-gray-200 bg-white' : 'border-red-100 bg-red-50/30'
            }`}>
              {/* Query header — always clickable */}
              <button
                onClick={() => toggleQuery(idx)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    q.allMentioned ? 'bg-green-100 text-green-700' :
                    q.anyMentioned ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {q.mentionCount}/{q.totalEngines}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      „{q.query}"
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {engines.map(e => {
                        const r = q.engineResults.get(e)
                        if (!r) return null
                        const meta = ENGINE_META[e]
                        return r.brand_mentioned ? `${meta?.icon || ''}✓` : `${meta?.icon || ''}✗`
                      }).filter(Boolean).join('  ')}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded: show all engine responses */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {engines.map(engineKey => {
                      const result = q.engineResults.get(engineKey)
                      if (!result) return null
                      return (
                        <EngineResponse
                          key={engineKey}
                          engineKey={engineKey}
                          result={result}
                          brandTerms={brandTerms}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Show more/less */}
      {filteredQueries.length > 5 && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAll
              ? `Weniger anzeigen`
              : `Alle ${filteredQueries.length} Fragen anzeigen`
            }
          </button>
        </div>
      )}
    </div>
  )
}
