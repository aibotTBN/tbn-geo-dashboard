'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import {
  Activity, TrendingUp, TrendingDown, Minus, Bot, Wrench,
  RefreshCw, Clock, Globe2, ChevronDown, ChevronUp, Zap,
  AlertCircle, Loader2,
} from 'lucide-react'

/* ─── Types ─── */

interface McpStats {
  domain: string
  period: { days: number; since: string }
  totalRequests: number
  prevRequests: number
  trendPercent: number
  daily: { date: string; count: number }[]
  engines: { engine: string; count: number }[]
  tools: { tool: string; count: number }[]
  recentRequests: {
    id: string
    tool: string
    engine: string
    sourceIp: string
    createdAt: string
  }[]
}

/* ─── Engine colors ─── */

const ENGINE_COLORS: Record<string, string> = {
  'OpenAI/ChatGPT': '#10a37f',
  'Claude/Anthropic': '#cc785c',
  'Gemini/Google': '#4285f4',
  'Perplexity': '#20808d',
  'Microsoft Copilot': '#00a4ef',
  'Cohere': '#39594d',
  'Mistral': '#f54e42',
  'Unknown': '#94a3b8',
}

/* ─── Tool friendly names ─── */

const TOOL_LABELS: Record<string, string> = {
  search: 'Suche',
  get_entity: 'Entity abrufen',
  list_services: 'Services auflisten',
  list_faqs: 'FAQs auflisten',
  list_products: 'Produkte auflisten',
  get_profile: 'Firmenprofil',
  list_persons: 'Personen auflisten',
  list_statistics: 'Statistiken',
}

/* ─── Component ─── */

export function McpAnalytics({ domain }: { domain: string }) {
  const [stats, setStats] = useState<McpStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)
  const [showRecent, setShowRecent] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/geo/mcp-stats?domain=${encodeURIComponent(domain)}&days=${days}`)
      if (!res.ok) throw new Error(`Fehler ${res.status}`)
      const data = await res.json()
      setStats(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [domain, days])

  useEffect(() => { fetchStats() }, [fetchStats])

  /* ─── Loading / Error / Empty states ─── */

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">MCP-Statistiken laden…</span>
        </div>
      </div>
    )
  }

  if (error) {
    // Silently hide on server errors (e.g. table not yet migrated)
    if (error.includes('500') || error.includes('401')) {
      return null
    }
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          MCP-Statistiken konnten nicht geladen werden: {error}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const hasData = stats.totalRequests > 0

  /* ─── Trend indicator ─── */
  const TrendIcon = stats.trendPercent > 0 ? TrendingUp : stats.trendPercent < 0 ? TrendingDown : Minus
  const trendColor = stats.trendPercent > 0 ? 'text-green-600' : stats.trendPercent < 0 ? 'text-red-600' : 'text-gray-400'

  /* ─── Chart data: show last N days (trim to fit well) ─── */
  const chartData = stats.daily.slice(-Math.min(days, 30)).map((d) => ({
    date: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    count: d.count,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
            <Activity size={18} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">MCP-Anfragen</h3>
            <p className="text-xs text-gray-500">Zugriffe von KI-Systemen auf Ihre Knowledge Base</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value={7}>7 Tage</option>
            <option value={14}>14 Tage</option>
            <option value={30}>30 Tage</option>
            <option value={60}>60 Tage</option>
            <option value={90}>90 Tage</option>
          </select>
          <button onClick={fetchStats} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Aktualisieren">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {!hasData ? (
        /* ─── Empty state ─── */
        <div className="px-6 py-12 text-center">
          <Bot size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">Noch keine MCP-Anfragen</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Sobald externe KI-Systeme (ChatGPT, Claude, Gemini etc.) Ihre Knowledge Base über den MCP-Server abfragen,
            erscheinen hier die Statistiken. Stellen Sie sicher, dass Ihre <code className="bg-gray-100 px-1 rounded">mcp.json</code> Discovery-Datei
            korrekt eingerichtet ist.
          </p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* ─── KPI Cards ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total requests */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Anfragen gesamt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRequests.toLocaleString('de-DE')}</p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
                <TrendIcon size={12} />
                {stats.trendPercent !== 0 && (
                  <span>{stats.trendPercent > 0 ? '+' : ''}{stats.trendPercent}% vs. Vorperiode</span>
                )}
                {stats.trendPercent === 0 && <span>Gleich wie Vorperiode</span>}
              </div>
            </div>

            {/* Daily avg */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Ø pro Tag</p>
              <p className="text-2xl font-bold text-gray-900">
                {(stats.totalRequests / days).toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-1">letzte {days} Tage</p>
            </div>

            {/* Top engine */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Top Engine</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {stats.engines[0]?.engine || '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.engines[0]?.count || 0} Anfragen ({stats.engines[0] ? Math.round((stats.engines[0].count / stats.totalRequests) * 100) : 0}%)
              </p>
            </div>

            {/* Top tool */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Top Tool</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {TOOL_LABELS[stats.tools[0]?.tool] || stats.tools[0]?.tool || '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.tools[0]?.count || 0} Aufrufe
              </p>
            </div>
          </div>

          {/* ─── Daily Chart ─── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Anfragen pro Tag
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 8))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [`${value} Anfragen`, 'MCP']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.count > 0 ? '#8b5cf6' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── Engine & Tool Breakdown ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Engines */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Bot size={12} /> KI-Engines
              </p>
              <div className="space-y-2">
                {stats.engines.map((eng, i) => {
                  const pct = Math.round((eng.count / stats.totalRequests) * 100)
                  const color = ENGINE_COLORS[eng.engine] || ENGINE_COLORS['Unknown']
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{eng.engine}</span>
                      <span className="text-xs text-gray-400 tabular-nums">{eng.count}</span>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                    </div>
                  )
                })}
                {stats.engines.length === 0 && (
                  <p className="text-xs text-gray-400">Keine Engine-Daten</p>
                )}
              </div>
            </div>

            {/* Tools */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Wrench size={12} /> MCP Tools
              </p>
              <div className="space-y-2">
                {stats.tools.map((t, i) => {
                  const pct = Math.round((t.count / stats.totalRequests) * 100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <Zap size={10} className="text-violet-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        {TOOL_LABELS[t.tool] || t.tool}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums">{t.count}</span>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{pct}%</span>
                    </div>
                  )
                })}
                {stats.tools.length === 0 && (
                  <p className="text-xs text-gray-400">Keine Tool-Daten</p>
                )}
              </div>
            </div>
          </div>

          {/* ─── Recent Requests (expandable) ─── */}
          {stats.recentRequests.length > 0 && (
            <div>
              <button
                onClick={() => setShowRecent(!showRecent)}
                className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
              >
                <Clock size={12} />
                Letzte Anfragen
                {showRecent ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showRecent && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Zeitpunkt</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Engine</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Tool</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium hidden sm:table-cell">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.recentRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600 tabular-nums">
                            {new Date(req.createdAt).toLocaleString('de-DE', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                backgroundColor: `${ENGINE_COLORS[req.engine] || ENGINE_COLORS['Unknown']}15`,
                                color: ENGINE_COLORS[req.engine] || ENGINE_COLORS['Unknown'],
                              }}
                            >
                              {req.engine}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {TOOL_LABELS[req.tool] || req.tool}
                          </td>
                          <td className="px-3 py-2 text-gray-400 font-mono hidden sm:table-cell">
                            {req.sourceIp.substring(0, 15)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
