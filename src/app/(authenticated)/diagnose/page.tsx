'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScoreGauge, ScoreDimension } from '@/components/geo/score-gauge'
import { Search, Loader2, CheckCircle2 } from 'lucide-react'

interface DiagResult {
  geo_score: number
  score_citation: number
  score_tech: number
  score_schema: number
  score_content: number
  score_fresh: number
  pages_analyzed?: number
  recommendations?: string[]
}

export default function DiagnosePage() {
  const [domain, setDomain] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DiagResult | null>(null)
  const [error, setError] = useState('')

  async function runDiagnose() {
    if (!domain) return
    setRunning(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/geo/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, companyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Diagnose fehlgeschlagen')
      if (data.result) setResult(data.result)
      else setError('Keine Ergebnisse zurückgegeben. Der n8n Workflow läuft möglicherweise noch.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <Header title="GEO Diagnose" />
      <div className="p-6 space-y-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Neue Diagnose starten</CardTitle>
            <CardDescription>
              Analysiert KI-Sichtbarkeit, technische GEO-Dateien, Schema Markup, Content-Qualität und Freshness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Domain (z.B. tbnpr.de)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
                onKeyDown={(e) => e.key === 'Enter' && runDiagnose()}
              />
              <input
                type="text"
                placeholder="Firmenname (optional)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
              />
              <Button onClick={runDiagnose} disabled={running || !domain} className="min-w-[160px]">
                {running ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Analysiere...</>
                ) : (
                  <><Search size={16} className="mr-2" /> Diagnose starten</>
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </CardContent>
        </Card>

        {/* Running indicator */}
        {running && (
          <Card className="border-radar-200 bg-radar-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Loader2 size={24} className="animate-spin text-radar-600" />
                <div>
                  <p className="font-medium text-radar-700">Diagnose läuft...</p>
                  <p className="text-sm text-radar-500">
                    Crawle Sitemap, prüfe technische Dateien, analysiere Content. Das dauert ca. 30-60 Sekunden.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-medium">Diagnose abgeschlossen</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 flex flex-col items-center justify-center p-8">
                <ScoreGauge score={result.geo_score} size="lg" />
                <p className="mt-4 text-sm text-gray-500">
                  {result.pages_analyzed ? `${result.pages_analyzed} Seiten analysiert` : ''}
                </p>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Score-Dimensionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreDimension label="KI-Sichtbarkeit" score={result.score_citation || 0} maxScore={30} />
                  <ScoreDimension label="Tech GEO-Dateien" score={result.score_tech || 0} maxScore={20} />
                  <ScoreDimension label="Schema Markup" score={result.score_schema || 0} maxScore={20} />
                  <ScoreDimension label="Content-Qualität" score={result.score_content || 0} maxScore={15} />
                  <ScoreDimension label="Content-Freshness" score={result.score_fresh || 0} maxScore={15} />
                </CardContent>
              </Card>
            </div>

            {result.recommendations && result.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Empfehlungen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-radar-600 font-bold mt-0.5">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  )
}
