'use client'

import { cn } from '@/lib/utils'

/**
 * Engine icon mapping with colors.
 */
const ENGINE_META: Record<string, { label: string; color: string; icon: string }> = {
  openai: { label: 'OpenAI', color: 'text-emerald-600', icon: '🟢' },
  claude: { label: 'Claude', color: 'text-orange-600', icon: '🟠' },
  gemini: { label: 'Gemini', color: 'text-blue-600', icon: '🔵' },
  perplexity: { label: 'Perplexity', color: 'text-purple-600', icon: '🟣' },
  google_ai_overview: { label: 'Google AI', color: 'text-red-600', icon: '🔴' },
}

interface EngineScore {
  status: string
  score: number
  mentioned: number
  total: number
  knowledge_score?: number
  source_citations?: string[]
}

interface McpDiscoveryDetail {
  score: number
  max: number
  has_llms_txt?: boolean
  has_mcp_json?: boolean
  has_agent_card?: boolean
  configured?: boolean
}

interface GoogleAiReadiness {
  score: number
  max: number
  details: {
    schema_depth?: { score: number; max: number }
    google_extended?: { score: number; max: number; blocked: boolean }
    mcp_discovery?: McpDiscoveryDetail
    sitemap_freshness?: { score: number; max: number }
    gemini_visibility?: { score: number; max: number }
  }
}

/**
 * Bar component for engine scores.
 */
function EngineBar({
  name,
  data,
}: {
  name: string
  data: EngineScore
}) {
  const meta = ENGINE_META[name] || { label: name, color: 'text-gray-600', icon: '⚪' }
  const pct = Math.round((data.mentioned / Math.max(data.total, 1)) * 100)

  function getBarColor(pct: number) {
    if (pct >= 70) return 'bg-green-500'
    if (pct >= 40) return 'bg-yellow-500'
    if (pct >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (data.status === 'skipped') {
    return (
      <div className="flex items-center gap-3 py-2 opacity-50">
        <span className="text-lg">{meta.icon}</span>
        <div className="flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{meta.label}</span>
            <span className="text-gray-400 text-xs">nicht konfiguriert</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mt-1">
            <div className="h-full rounded-full bg-gray-200" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (data.status === 'error') {
    return (
      <div className="flex items-center gap-3 py-2 opacity-60">
        <span className="text-lg">{meta.icon}</span>
        <div className="flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{meta.label}</span>
            <span className="text-red-500 text-xs">Fehler</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mt-1">
            <div className="h-full rounded-full bg-red-200" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-lg">{meta.icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-sm">
          <span className={cn('font-medium', meta.color)}>{meta.label}</span>
          <span className="text-gray-600">
            <span className="font-semibold">{data.mentioned}/{data.total}</span>
            <span className="text-gray-400 ml-1">Queries</span>
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', getBarColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Multi-engine citation breakdown card.
 */
export function EngineBreakdown({
  engines,
  enginesActive,
}: {
  engines: Record<string, EngineScore>
  enginesActive: number
}) {
  const engineOrder = ['openai', 'claude', 'gemini', 'perplexity', 'google_ai_overview']
  const activeEngines = engineOrder.filter(
    (e) => engines[e] && engines[e].status === 'ok'
  )
  const avgScore = activeEngines.length > 0
    ? Math.round(
        activeEngines.reduce((sum, e) => sum + (engines[e]?.score ?? 0), 0) / activeEngines.length
      )
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          KI-Engines ({enginesActive} aktiv)
        </h4>
        <span className="text-xs text-gray-400">∅ Score: {avgScore}/30</span>
      </div>
      <div className="space-y-1">
        {engineOrder.map((name) => {
          const data = engines[name]
          if (!data) return null
          return <EngineBar key={name} name={name} data={data} />
        })}
      </div>
    </div>
  )
}

/**
 * MCP Discovery status display — contextual instead of bare score.
 */
function McpDiscoveryRow({ mcp }: { mcp: McpDiscoveryDetail }) {
  const configured = mcp.configured || mcp.score > 0

  if (!configured) {
    // Not configured: show neutral status, not a red "0/20"
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">MCP Discovery</span>
          <span className="font-medium text-gray-400">Nicht konfiguriert</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gray-200" style={{ width: '0%' }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">
          llms.txt, MCP-Server oder AI-Agent-Card sind noch nicht eingerichtet.
        </p>
      </div>
    )
  }

  // Configured: show what's active
  const items: string[] = []
  if (mcp.has_llms_txt) items.push('llms.txt')
  if (mcp.has_mcp_json) items.push('MCP-Server')
  if (mcp.has_agent_card) items.push('Agent-Card')

  const dimPct = Math.round((mcp.score / mcp.max) * 100)

  function getColor(pct: number) {
    if (pct >= 70) return { bg: 'bg-green-500', text: 'text-green-600' }
    if (pct >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600' }
    if (pct >= 30) return { bg: 'bg-orange-500', text: 'text-orange-600' }
    return { bg: 'bg-red-500', text: 'text-red-600' }
  }

  const color = getColor(dimPct)

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">MCP Discovery</span>
        <span className={cn('font-medium', color.text)}>
          {mcp.score}/{mcp.max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color.bg)}
          style={{ width: `${dimPct}%` }}
        />
      </div>
      {items.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-0.5">
          Erreichbar: {items.join(', ')}
        </p>
      )}
    </div>
  )
}

/**
 * Google AI Readiness sub-score display.
 */
export function GoogleAiReadinessCard({
  data,
}: {
  data: GoogleAiReadiness
}) {
  const pct = Math.round((data.score / data.max) * 100)

  function getColor(pct: number) {
    if (pct >= 70) return { bg: 'bg-green-500', text: 'text-green-600', label: 'Excellent' }
    if (pct >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Gut' }
    if (pct >= 30) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'Ausbaufähig' }
    return { bg: 'bg-red-500', text: 'text-red-600', label: 'Kritisch' }
  }

  const color = getColor(pct)
  const details = data.details || {}

  // Standard dimensions (without MCP — handled separately)
  const standardDimensions = [
    { label: 'Schema.org Tiefe', ...(details.schema_depth || {}) },
    { label: 'Google-Extended', ...(details.google_extended || {}) },
    { label: 'Sitemap & Freshness', ...(details.sitemap_freshness || {}) },
    { label: 'Gemini Sichtbarkeit', ...(details.gemini_visibility || {}) },
  ].filter((d) => d.max !== undefined)

  const mcpDetail = details.mcp_discovery

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Google AI Readiness
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-bold', color.text)}>
            {data.score}
          </span>
          <span className="text-sm text-gray-400">/ {data.max}</span>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color.bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{color.label}</p>

      {/* Sub-dimensions */}
      <div className="space-y-2 pt-2">
        {standardDimensions.map((dim) => {
          const dimPct = dim.max ? Math.round(((dim.score ?? 0) / dim.max) * 100) : 0
          const dimColor = getColor(dimPct)
          return (
            <div key={dim.label} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{dim.label}</span>
                <span className={cn('font-medium', dimColor.text)}>
                  {dim.score ?? 0}/{dim.max}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', dimColor.bg)}
                  style={{ width: `${dimPct}%` }}
                />
              </div>
            </div>
          )
        })}

        {/* MCP Discovery — contextual display */}
        {mcpDetail && <McpDiscoveryRow mcp={mcpDetail} />}
      </div>

      {/* Warning for blocked Google-Extended */}
      {details.google_extended?.blocked && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          ⚠️ <strong>Google-Extended blockiert</strong> — robots.txt verhindert, dass Google eure Inhalte für KI-Antworten nutzt.
        </div>
      )}
    </div>
  )
}
