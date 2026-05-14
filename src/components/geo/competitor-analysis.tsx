'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, Plus, X, Search, AlertTriangle, Trophy, TrendingDown, TrendingUp,
  Loader2, CheckCircle, XCircle, Minus, ExternalLink, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompetitorMention {
  name: string
  mentions: number
}

interface CitationResult {
  query: string
  brand_mentioned: boolean
  sentiment: string
  competitors_mentioned: string[]
  confidence: number
  summary: string
}

interface EngineData {
  status: string
  score: number
  mentioned: number
  total: number
  results?: CitationResult[]
  competitors?: string[]
  source_citations?: string[]
}

interface Props {
  domain: string
  projectName?: string
  reportJson?: string | null
  savedCompetitors?: string[]
  onCompetitorsChange?: (competitors: string[]) => void
}

/**
 * Detect if a competitor name actually refers to the company itself.
 * Needed because domain ≠ brand name (e.g. portabiles-hct.de → "Portabiles").
 */
function isSelfBrand(competitorName: string, domain: string, projectName?: string): boolean {
  const comp = competitorName.toLowerCase().trim()
  if (!comp || comp.length < 2) return false

  // Build brand tokens from domain (strip TLD, split by hyphens/dots)
  const domainBase = domain.toLowerCase().replace(/\.[^.]+$/, '') // e.g. "portabiles-hct"
  const domainTokens = domainBase.split(/[-._]/).filter(t => t.length >= 3)
  const brandPatterns = new Set([domainBase, domain.toLowerCase(), ...domainTokens])

  // Add project name tokens
  if (projectName) {
    const nameLower = projectName.toLowerCase()
    brandPatterns.add(nameLower)
    nameLower.split(/[\s\-_.]+/).filter(t => t.length >= 3).forEach(t => brandPatterns.add(t))
  }

  // Check if competitor matches any brand pattern (bidirectional substring)
  for (const pattern of brandPatterns) {
    if (pattern.length < 3) continue
    if (comp.includes(pattern) || pattern.includes(comp)) return true
  }

  return false
}

function parseReport(reportJson: string | null | undefined) {
  if (!reportJson) return null
  try {
    const raw = typeof reportJson === 'string' ? JSON.parse(reportJson) : reportJson
    return raw?.report || raw
  } catch {
    return null
  }
}

export function CompetitorAnalysis({ domain, projectName, reportJson, savedCompetitors = [], onCompetitorsChange }: Props) {
  const [newCompetitor, setNewCompetitor] = useState('')
  const [competitors, setCompetitors] = useState<string[]>(savedCompetitors)
  const [saving, setSaving] = useState(false)

  const report = parseReport(reportJson)

  // Discovered competitors from the latest diagnosis
  const discoveredCompetitors: CompetitorMention[] = report?.competitors || []

  // Collect per-engine per-query data
  const engineNames = ['openai', 'claude', 'gemini', 'perplexity']
  const citationEngines: Record<string, EngineData> = report?.citation_engines || {}

  // Build query-level competitor analysis
  interface QueryAnalysis {
    query: string
    brandMentioned: Record<string, boolean>
    competitorsMentioned: Record<string, string[]>
    overallBrandMentioned: boolean
  }

  const queryMap = new Map<string, QueryAnalysis>()

  // Parse from the full report - look at each engine's results
  for (const [engineName, engineData] of Object.entries(citationEngines)) {
    const results = (engineData as EngineData).results || []
    for (const r of results) {
      const key = r.query?.toLowerCase().trim()
      if (!key) continue
      if (!queryMap.has(key)) {
        queryMap.set(key, {
          query: r.query,
          brandMentioned: {},
          competitorsMentioned: {},
          overallBrandMentioned: false,
        })
      }
      const qa = queryMap.get(key)!
      qa.brandMentioned[engineName] = r.brand_mentioned
      qa.competitorsMentioned[engineName] = r.competitors_mentioned || []
      if (r.brand_mentioned) qa.overallBrandMentioned = true
    }
  }

  // If no per-engine results, try the legacy citation_test
  if (queryMap.size === 0 && report?.citation_test?.citation_results) {
    for (const r of report.citation_test.citation_results) {
      const key = r.query?.toLowerCase().trim()
      if (!key) continue
      queryMap.set(key, {
        query: r.query,
        brandMentioned: { openai: r.brand_mentioned },
        competitorsMentioned: { openai: r.competitors_mentioned || [] },
        overallBrandMentioned: r.brand_mentioned,
      })
    }
  }

  const queries = Array.from(queryMap.values())
  const gapQueries = queries.filter(q => {
    // Only count as gap if real (non-self) competitors are mentioned
    const hasRealCompetitor = Object.values(q.competitorsMentioned).some(
      arr => arr.some(c => !isSelfBrand(c, domain, projectName))
    )
    return !q.overallBrandMentioned && hasRealCompetitor
  })

  // Aggregate all competitor mentions across all engines (filter out self-brand)
  const allCompetitorCounts: Record<string, number> = {}
  for (const q of queries) {
    for (const comps of Object.values(q.competitorsMentioned)) {
      for (const c of comps) {
        if (!isSelfBrand(c, domain, projectName)) {
          allCompetitorCounts[c] = (allCompetitorCounts[c] || 0) + 1
        }
      }
    }
  }
  const sortedCompetitors = Object.entries(allCompetitorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)

  // Brand mention rate
  const totalQueries = queries.length
  const brandMentionedCount = queries.filter(q => q.overallBrandMentioned).length

  async function addCompetitor() {
    const cleaned = newCompetitor.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!cleaned || competitors.includes(cleaned)) return
    const updated = [...competitors, cleaned]
    setCompetitors(updated)
    setNewCompetitor('')
    await saveCompetitors(updated)
  }

  async function removeCompetitor(comp: string) {
    const updated = competitors.filter(c => c !== comp)
    setCompetitors(updated)
    await saveCompetitors(updated)
  }

  async function saveCompetitors(list: string[]) {
    setSaving(true)
    try {
      await fetch(`/api/geo/projects/${encodeURIComponent(domain)}/competitors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors: list }),
      })
      onCompetitorsChange?.(list)
    } catch (e) {
      console.error('Save competitors failed:', e)
    } finally {
      setSaving(false)
    }
  }

  function addDiscovered(name: string) {
    const cleaned = name.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!competitors.includes(cleaned)) {
      const updated = [...competitors, cleaned]
      setCompetitors(updated)
      saveCompetitors(updated)
    }
  }

  const activeEngines = engineNames.filter(e => citationEngines[e]?.status === 'ok')

  if (!report) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-gray-400">
          <Users size={24} className="mx-auto mb-2 opacity-50" />
          <p>Noch keine Diagnose-Daten vorhanden.</p>
          <p className="text-sm">Starte eine GEO Diagnose, um die Wettbewerber-Analyse zu sehen.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Competitor Input */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target size={16} className="text-radar-600" />
                Wettbewerber verfolgen
              </CardTitle>
              <CardDescription>
                Definiere Wettbewerber, um sie gezielt mit deiner Sichtbarkeit zu vergleichen.
              </CardDescription>
            </div>
            {saving && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
              placeholder="wettbewerber-domain.de"
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 bg-white"
            />
            <Button size="sm" onClick={addCompetitor} disabled={!newCompetitor.trim()}>
              <Plus size={14} className="mr-1" /> Hinzufügen
            </Button>
          </div>
          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map(c => (
                <Badge key={c} variant="outline" className="gap-1.5 py-1 px-2.5">
                  {c}
                  <button onClick={() => removeCompetitor(c)} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Brand Mention Rate */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Brand-Sichtbarkeit</span>
              {brandMentionedCount / Math.max(totalQueries, 1) >= 0.5 ? (
                <TrendingUp size={16} className="text-green-500" />
              ) : (
                <TrendingDown size={16} className="text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold">
              {brandMentionedCount}/{totalQueries}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Queries mit Brand-Erwähnung ({activeEngines.length} Engines)
            </p>
          </CardContent>
        </Card>

        {/* Top Competitor */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Stärkster Wettbewerber</span>
              <Trophy size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold truncate">
              {sortedCompetitors[0]?.[0] || '—'}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {sortedCompetitors[0] ? `${sortedCompetitors[0][1]}× erwähnt über alle Engines` : 'Keine Wettbewerber erkannt'}
            </p>
          </CardContent>
        </Card>

        {/* Visibility Gaps */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Sichtbarkeits-Lücken</span>
              <AlertTriangle size={16} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {gapQueries.length}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Queries wo Wettbewerber statt dir genannt werden
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competitor Frequency Chart */}
      {sortedCompetitors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Wettbewerber in KI-Antworten</CardTitle>
            <CardDescription>Wie oft werden Wettbewerber über alle Engines und Queries erwähnt?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedCompetitors.map(([name, count], i) => {
                const maxCount = sortedCompetitors[0][1]
                const pct = (count / maxCount) * 100
                const isTracked = competitors.some(c => name.toLowerCase().includes(c))
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium truncate", isTracked && "text-radar-700")}>
                          {name}
                        </span>
                        {isTracked && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-radar-600 border-radar-300">
                            Verfolgt
                          </Badge>
                        )}
                        {!isTracked && (
                          <button
                            onClick={() => addDiscovered(name)}
                            className="text-[10px] text-gray-400 hover:text-radar-600 underline"
                          >
                            verfolgen
                          </button>
                        )}
                      </div>
                      <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isTracked ? "bg-radar-500" : "bg-gray-300"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono text-gray-600 w-8 text-right">{count}×</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query × Engine Matrix */}
      {queries.length > 0 && activeEngines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Query-Matrix: Brand vs. Wettbewerber</CardTitle>
            <CardDescription>
              Pro Query und Engine: ✅ = du wirst erwähnt, ❌ = nur Wettbewerber, ➖ = niemand
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 min-w-[200px]">Query</th>
                  {activeEngines.map(e => (
                    <th key={e} className="px-2 py-2 font-medium text-gray-500 text-center capitalize min-w-[80px]">{e}</th>
                  ))}
                  <th className="px-2 py-2 font-medium text-gray-500 text-center">Wettbewerber</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, i) => {
                  const allComps = new Set<string>()
                  for (const comps of Object.values(q.competitorsMentioned)) {
                    for (const c of comps) { if (!isSelfBrand(c, domain, projectName)) allComps.add(c) }
                  }
                  return (
                    <tr key={i} className={cn("border-b border-gray-50", !q.overallBrandMentioned && allComps.size > 0 && "bg-red-50/50")}>
                      <td className="py-2 pr-4 text-gray-700 truncate max-w-[300px]" title={q.query}>
                        {q.query}
                      </td>
                      {activeEngines.map(e => {
                        const mentioned = q.brandMentioned[e]
                        const hasComps = (q.competitorsMentioned[e] || []).length > 0
                        if (mentioned === undefined) return <td key={e} className="px-2 py-2 text-center text-gray-300">—</td>
                        return (
                          <td key={e} className="px-2 py-2 text-center">
                            {mentioned ? (
                              <CheckCircle size={16} className="inline text-green-500" />
                            ) : hasComps ? (
                              <XCircle size={16} className="inline text-red-400" />
                            ) : (
                              <Minus size={16} className="inline text-gray-300" />
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center">
                        {allComps.size > 0 ? (
                          <span className="text-xs text-gray-500" title={Array.from(allComps).join(', ')}>
                            {Array.from(allComps).slice(0, 2).join(', ')}
                            {allComps.size > 2 && ` +${allComps.size - 2}`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Gap Analysis */}
      {gapQueries.length > 0 && (
        <Card className="border-orange-200 bg-gradient-to-br from-white to-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              Sichtbarkeits-Lücken
            </CardTitle>
            <CardDescription>
              Bei diesen Themen werden Wettbewerber erwähnt, aber nicht dein Unternehmen. 
              Die Knowledge Base kann helfen, diese Lücken zu schließen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gapQueries.map((q, i) => {
                const allComps = new Set<string>()
                for (const comps of Object.values(q.competitorsMentioned)) {
                  for (const c of comps) { if (!isSelfBrand(c, domain, projectName)) allComps.add(c) }
                }
                return (
                  <div key={i} className="bg-white rounded-lg border border-orange-100 p-3">
                    <p className="text-sm font-medium text-gray-900">{q.query}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-red-500 font-medium">Stattdessen genannt:</span>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(allComps).map(c => (
                          <Badge key={c} variant="outline" className="text-[10px] text-orange-700 border-orange-300 bg-orange-50">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      💡 Tipp: Erstelle KB-Inhalte zu diesem Thema, um die KI-Sichtbarkeit zu verbessern.
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
