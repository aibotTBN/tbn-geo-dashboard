'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Link2, ExternalLink, Globe, CheckCircle, XCircle, ArrowRight, Info,
  TrendingUp, BookOpen, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  domain: string
  reportJson?: string | null
}

interface SourceCitation {
  url: string
  domain: string
  isOwn: boolean
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

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

export function CitationTracking({ domain, reportJson }: Props) {
  const report = parseReport(reportJson)

  if (!report) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-gray-400">
          <Link2 size={24} className="mx-auto mb-2 opacity-50" />
          <p>Noch keine Diagnose-Daten vorhanden.</p>
          <p className="text-sm">Starte eine GEO Diagnose, um die Quellen-Analyse zu sehen.</p>
        </CardContent>
      </Card>
    )
  }

  const citationEngines = report?.citation_engines || {}
  const projectDomain = domain.replace(/^www\./, '')

  // Collect all source citations from all engines
  const allCitations: SourceCitation[] = []
  const domainCounts: Record<string, { count: number; urls: string[]; engines: Set<string> }> = {}

  for (const [engineName, engineData] of Object.entries(citationEngines)) {
    const sources = (engineData as any)?.source_citations || []
    for (const url of sources) {
      if (!url || typeof url !== 'string') continue
      const citDomain = extractDomain(url)
      const isOwn = citDomain === projectDomain || citDomain === `www.${projectDomain}`
      allCitations.push({ url, domain: citDomain, isOwn })
      
      if (!domainCounts[citDomain]) {
        domainCounts[citDomain] = { count: 0, urls: [], engines: new Set() }
      }
      domainCounts[citDomain].count++
      if (!domainCounts[citDomain].urls.includes(url)) {
        domainCounts[citDomain].urls.push(url)
      }
      domainCounts[citDomain].engines.add(engineName)
    }
  }

  // Also check for Perplexity's native citations (in the raw response)
  // These are in report.citation_engines.perplexity.source_citations already

  const sortedDomains = Object.entries(domainCounts)
    .sort(([, a], [, b]) => b.count - a.count)

  const ownCitations = sortedDomains.filter(([d]) => d === projectDomain || d === `www.${projectDomain}`)
  const otherCitations = sortedDomains.filter(([d]) => d !== projectDomain && d !== `www.${projectDomain}`)

  const totalCitations = allCitations.length
  const ownCount = allCitations.filter(c => c.isOwn).length
  const uniqueDomains = sortedDomains.length

  // Competitor domains that are cited (but not us)
  const competitorCited = otherCitations.filter(([, data]) => data.count >= 2)

  // Extract query-level data to find which topics lack citations
  const queries: { query: string; brandMentioned: boolean; hasCitations: boolean }[] = []
  for (const [, engineData] of Object.entries(citationEngines)) {
    const results = (engineData as any)?.results || []
    for (const r of results) {
      if (!r.query) continue
      queries.push({
        query: r.query,
        brandMentioned: r.brand_mentioned,
        hasCitations: (r.competitors_mentioned || []).length > 0 || r.brand_mentioned,
      })
    }
  }

  const hasCitationData = totalCitations > 0

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Quellen insgesamt</span>
              <Link2 size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{totalCitations}</div>
            <p className="text-xs text-gray-400 mt-1">
              Zitierte URLs über alle Engines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Eigene Seiten zitiert</span>
              {ownCount > 0 ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
            </div>
            <div className={cn("text-2xl font-bold", ownCount > 0 ? "text-green-600" : "text-red-500")}>
              {ownCount}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {ownCount > 0
                ? `${ownCitations[0]?.[1]?.urls.length || 0} verschiedene URLs`
                : `${projectDomain} wird nicht als Quelle zitiert`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Zitierte Domains</span>
              <Globe size={16} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{uniqueDomains}</div>
            <p className="text-xs text-gray-400 mt-1">
              Verschiedene Domains in KI-Antworten
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Own citations detail */}
      {ownCount > 0 && ownCitations.length > 0 && (
        <Card className="border-green-200 bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Deine zitierten Seiten
            </CardTitle>
            <CardDescription>
              Diese Seiten von {projectDomain} werden von KI-Systemen als Quelle referenziert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ownCitations.flatMap(([, data]) => data.urls).map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-green-100 p-2.5">
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                  <a
                    href={url.startsWith('http') ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener"
                    className="text-sm text-green-700 hover:underline truncate flex-1"
                  >
                    {url}
                  </a>
                  <ExternalLink size={12} className="text-gray-400 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competing citations */}
      {otherCitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              Zitierte Domains in KI-Antworten
            </CardTitle>
            <CardDescription>
              Diese Domains werden statt oder zusätzlich zu deiner Website als Quelle referenziert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {otherCitations.slice(0, 20).map(([citDomain, data], i) => {
                const maxCount = otherCitations[0]?.[1]?.count || 1
                const pct = (data.count / maxCount) * 100
                return (
                  <div key={citDomain} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://${citDomain}`}
                          target="_blank"
                          rel="noopener"
                          className="text-sm font-medium text-gray-700 hover:text-radar-600 truncate"
                        >
                          {citDomain}
                        </a>
                        <div className="flex gap-1">
                          {Array.from(data.engines).map(e => (
                            <Badge key={e} variant="outline" className="text-[9px] px-1 py-0 capitalize">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono text-gray-600 w-12 text-right">
                      {data.count}× / {data.urls.length} URL{data.urls.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No citation data info */}
      {!hasCitationData && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="py-6">
            <div className="flex gap-3">
              <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Quellen-Tracking ist aktiviert</p>
                <p className="text-sm text-gray-500 mt-1">
                  Source Citations werden primär von <strong>Perplexity</strong> geliefert, da diese Engine native Quellen-URLs zurückgibt.
                  Bei der nächsten Diagnose werden die zitierten Quellen hier analysiert.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KB Bridge: Actionable insights */}
      {(ownCount === 0 && totalCitations > 0) && (
        <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen size={16} className="text-amber-600" />
              Empfehlung: Knowledge Base stärken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Deine Domain wird aktuell <strong>nicht als Quelle zitiert</strong>, während {otherCitations.length} andere Domains referenziert werden.
              So kannst du das ändern:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 bg-white rounded-lg border p-3">
                <span className="text-base">1️⃣</span>
                <div>
                  <p className="text-sm font-medium">Knowledge Base mit relevanten Inhalten füllen</p>
                  <p className="text-xs text-gray-500">Services, FAQs, Case Studies und Statistiken hinzufügen oder per KI generieren lassen.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white rounded-lg border p-3">
                <span className="text-base">2️⃣</span>
                <div>
                  <p className="text-sm font-medium">Schema.org JSON-LD einbetten</p>
                  <p className="text-xs text-gray-500">Den generierten Schema.org-Code in den &lt;head&gt; der Website einfügen — besonders für Google AI Overviews.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-white rounded-lg border p-3">
                <span className="text-base">3️⃣</span>
                <div>
                  <p className="text-sm font-medium">MCP Server + skills.md bereitstellen</p>
                  <p className="text-xs text-gray-500">Damit KI-Agenten live auf geprüfte Inhalte zugreifen können.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
