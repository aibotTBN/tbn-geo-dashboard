"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"

interface HistoryPoint {
  id: string
  date: string
  score: number
  citation: number
  tech: number
  schema: number
  content: number
  freshness: number
}

interface Trend {
  scoreDelta: number
  citationDelta: number
  techDelta: number
  schemaDelta: number
  contentDelta: number
  freshnessDelta: number
  daysBetween: number
}

interface ScoreHistoryProps {
  domain: string
}

function TrendBadge({ delta, label }: { delta: number; label: string }) {
  const color = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-400"
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const sign = delta > 0 ? "+" : ""
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{sign}{delta}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  )
}

function MiniChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  if (data.length < 2) return null
  const h = 40
  const w = 120
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / Math.max(maxVal, 1)) * h
    return `${x},${y}`
  }).join(" ")
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

export function ScoreHistory({ domain }: ScoreHistoryProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [trend, setTrend] = useState<Trend | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/geo/projects/${domain}/history?limit=30`)
      .then(r => r.json())
      .then(data => {
        setHistory(data.history || [])
        setTrend(data.trend || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [domain])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return null // Don't show if no history
  }

  const latest = history[history.length - 1]
  const scores = history.map(h => h.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)

  // Main score chart - larger SVG
  const chartH = 120
  const chartW = 500
  const padding = 10

  function chartPoints(values: number[], max: number) {
    return values.map((v, i) => {
      const x = padding + (i / Math.max(values.length - 1, 1)) * (chartW - 2 * padding)
      const y = padding + (1 - v / Math.max(max, 1)) * (chartH - 2 * padding)
      return { x, y }
    })
  }

  const scorePoints = chartPoints(scores, 100)
  const polyline = scorePoints.map(p => `${p.x},${p.y}`).join(" ")
  const areaPath = `M${scorePoints[0].x},${chartH - padding} ${scorePoints.map(p => `L${p.x},${p.y}`).join(" ")} L${scorePoints[scorePoints.length - 1].x},${chartH - padding} Z`

  const dimensions = [
    { key: "citation", label: "KI-Sichtbarkeit", max: 30, color: "#6366f1", delta: trend?.citationDelta },
    { key: "tech", label: "Tech Files", max: 20, color: "#8b5cf6", delta: trend?.techDelta },
    { key: "schema", label: "Schema", max: 20, color: "#a855f7", delta: trend?.schemaDelta },
    { key: "content", label: "Content", max: 15, color: "#d946ef", delta: trend?.contentDelta },
    { key: "freshness", label: "Freshness", max: 15, color: "#ec4899", delta: trend?.freshnessDelta },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Score-Verlauf</CardTitle>
            <CardDescription>
              {history.length} Diagnose{history.length !== 1 ? "n" : ""} seit{" "}
              {new Date(history[0].date).toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
            </CardDescription>
          </div>
          {trend && (
            <div className="text-right">
              <TrendBadge delta={trend.scoreDelta} label={`in ${trend.daysBetween}d`} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Score Chart */}
        <div className="mb-4">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: 120 }}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(v => {
              const y = padding + (1 - v / 100) * (chartH - 2 * padding)
              return (
                <g key={v}>
                  <line x1={padding} y1={y} x2={chartW - padding} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={padding - 2} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{v}</text>
                </g>
              )
            })}
            {/* Area fill */}
            <path d={areaPath} fill="url(#scoreGradient)" opacity="0.15" />
            {/* Score line */}
            <polyline fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
            {/* Data points */}
            {scorePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" stroke="white" strokeWidth="1.5" />
            ))}
            {/* Date labels */}
            {history.filter((_, i) => i === 0 || i === history.length - 1 || history.length <= 5).map((h, i) => {
              const idx = history.indexOf(h)
              const p = scorePoints[idx]
              return (
                <text key={i} x={p.x} y={chartH - 1} textAnchor="middle" fontSize="7" fill="#9ca3af">
                  {new Date(h.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </text>
              )
            })}
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Dimension Sparklines */}
        {history.length >= 2 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {dimensions.map(dim => {
              const values = history.map(h => h[dim.key as keyof HistoryPoint] as number)
              return (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{dim.label}</span>
                    {dim.delta !== undefined && dim.delta !== null && (
                      <span className={`text-xs font-medium ${dim.delta > 0 ? "text-green-600" : dim.delta < 0 ? "text-red-600" : "text-gray-400"}`}>
                        {dim.delta > 0 ? "+" : ""}{dim.delta}
                      </span>
                    )}
                  </div>
                  <MiniChart data={values} maxVal={dim.max} color={dim.color} />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
