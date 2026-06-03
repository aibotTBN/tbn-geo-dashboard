'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download, FileJson2, FileText, Copy, Check, Loader2,
  Code2, BookOpen, ChevronDown, ChevronUp, Globe2, Braces,
  Bot, Link2,
} from 'lucide-react'

interface Project {
  id: string
  domain: string
  name: string
}

interface SchemaOrgData {
  domain: string
  generated: string
  summary: Record<string, number>
  totalSchemas: number
  schemas: any[]
  embedCode: string
}

export default function ExportPage() {
  const searchParams = useSearchParams()
  const initialDomain = searchParams.get('domain') || ''

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedDomain, setSelectedDomain] = useState(initialDomain)
  const [llmsTxt, setLlmsTxt] = useState('')
  const [mcpJson, setMcpJson] = useState('')
  const [schemaOrg, setSchemaOrg] = useState<SchemaOrgData | null>(null)
  const [skillsMd, setSkillsMd] = useState('')
  const [agentCard, setAgentCard] = useState('')
  const [linkTags, setLinkTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/geo/projects')
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
  }, [])

  useEffect(() => {
    if (selectedDomain) generateExports()
  }, [selectedDomain])

  async function generateExports() {
    setLoading(true)
    try {
      const [llmsRes, mcpRes, schemaRes, skillsRes, agentCardRes, linkTagsRes] = await Promise.all([
        fetch(`/api/geo/export?domain=${selectedDomain}&format=llms.txt`),
        fetch(`/api/geo/export?domain=${selectedDomain}&format=mcp.json`),
        fetch(`/api/geo/export?domain=${selectedDomain}&format=schema.org`),
        fetch(`/api/geo/export?domain=${selectedDomain}&format=skills.md`),
        fetch(`/api/geo/export?domain=${selectedDomain}&format=agent.json`),
        fetch(`/api/geo/export?domain=${selectedDomain}&format=link-tags`),
      ])
      setLlmsTxt(await llmsRes.text())
      setMcpJson(JSON.stringify(await mcpRes.json(), null, 2))
      const schemaData = await schemaRes.json()
      setSchemaOrg(schemaData)
      setSkillsMd(await skillsRes.text())
      setAgentCard(JSON.stringify(await agentCardRes.json(), null, 2))
      setLinkTags(await linkTagsRes.text())
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(content: string, label: string) {
    navigator.clipboard.writeText(content)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleExpand(card: string) {
    setExpandedCard(expandedCard === card ? null : card)
  }

  return (
    <>
      <Header title="Export" />
      <div className="p-6 space-y-6">
        {/* Domain selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain auswählen</CardTitle>
            <CardDescription>
              Generiert Discovery-Dateien, Schema.org Markup und Knowledge-Profile für die gewählte Domain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full max-w-md px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
            >
              <option value="">Domain wählen...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.domain}>{p.name} ({p.domain})</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={32} className="animate-spin text-radar-600" />
          </div>
        )}

        {selectedDomain && !loading && (
          <>
            {/* Schema.org JSON-LD — prominent at top */}
            {schemaOrg && (
              <Card className="border-radar-200 bg-gradient-to-br from-white to-radar-50/30">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Braces size={20} className="text-radar-600" />
                      <CardTitle className="text-lg">Schema.org JSON-LD</CardTitle>
                      <Badge variant="default" className="bg-radar-600 text-xs">Neu</Badge>
                    </div>
                    <CardDescription>
                      Strukturierte Daten für Google AI Overviews, Rich Snippets und KI-Sichtbarkeit.
                      Einfach in den {'<head>'} der Website einbetten.
                    </CardDescription>
                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(schemaOrg.summary).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}: {count}
                        </Badge>
                      ))}
                      <Badge variant="secondary" className="text-xs font-medium">
                        {schemaOrg.totalSchemas} Schemas gesamt
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(schemaOrg.embedCode, 'schema')}
                    >
                      {copied === 'schema' ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                      {copied === 'schema' ? 'Kopiert' : 'Embed-Code'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => downloadFile(
                        schemaOrg.embedCode,
                        `${selectedDomain}-schema-org.html`,
                        'text/html'
                      )}
                    >
                      <Download size={14} className="mr-1" /> Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand('schema')}
                    className="mb-2 text-xs text-gray-500"
                  >
                    {expandedCard === 'schema' ? (
                      <><ChevronUp size={14} className="mr-1" /> Vorschau ausblenden</>
                    ) : (
                      <><ChevronDown size={14} className="mr-1" /> JSON-LD Vorschau anzeigen</>
                    )}
                  </Button>
                  {expandedCard === 'schema' && (
                    <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-[500px] whitespace-pre-wrap font-mono border">
                      {schemaOrg.embedCode}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Grid: llms.txt, mcp.json, skills.md */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* llms.txt */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-gray-500" />
                    <CardTitle className="text-base">llms.txt</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(llmsTxt, 'llms')}
                      title="Kopieren"
                    >
                      {copied === 'llms' ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downloadFile(llmsTxt, 'llms.txt', 'text/plain')}
                      title="Download"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-2">
                    Natürlichsprachliche Übersicht für LLM-Crawler.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand('llms')}
                    className="text-xs text-gray-500 px-0"
                  >
                    {expandedCard === 'llms' ? 'Ausblenden' : 'Vorschau'}
                  </Button>
                  {expandedCard === 'llms' && (
                    <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono mt-2">
                      {llmsTxt || 'Keine Daten'}
                    </pre>
                  )}
                </CardContent>
              </Card>

              {/* mcp.json */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <FileJson2 size={18} className="text-gray-500" />
                    <CardTitle className="text-base">mcp.json</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(mcpJson, 'mcp')}
                      title="Kopieren"
                    >
                      {copied === 'mcp' ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downloadFile(mcpJson, 'mcp.json', 'application/json')}
                      title="Download"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-2">
                    MCP Server Discovery für KI-Agenten (Gemini, Claude, ChatGPT).
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand('mcp')}
                    className="text-xs text-gray-500 px-0"
                  >
                    {expandedCard === 'mcp' ? 'Ausblenden' : 'Vorschau'}
                  </Button>
                  {expandedCard === 'mcp' && (
                    <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono mt-2">
                      {mcpJson || 'Keine Daten'}
                    </pre>
                  )}
                </CardContent>
              </Card>

              {/* skills.md */}
              <Card className="border-radar-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-radar-600" />
                    <CardTitle className="text-base">skills.md</CardTitle>
                    <Badge variant="default" className="bg-radar-600 text-xs">Neu</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(skillsMd, 'skills')}
                      title="Kopieren"
                    >
                      {copied === 'skills' ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downloadFile(skillsMd, 'skills.md', 'text/markdown')}
                      title="Download"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-2">
                    Natürlichsprachliches Profil für KI-Agenten — wer ist das Unternehmen, was kann es?
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand('skills')}
                    className="text-xs text-gray-500 px-0"
                  >
                    {expandedCard === 'skills' ? 'Ausblenden' : 'Vorschau'}
                  </Button>
                  {expandedCard === 'skills' && (
                    <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono mt-2">
                      {skillsMd || 'Keine Daten'}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Agent Discovery — agent.json (A2A) + Discovery Links */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <Bot size={16} className="text-indigo-600" />
                AI Agent Discovery
              </h3>
              <p className="text-xs text-gray-400">
                Standards für die Auffindbarkeit durch KI-Agenten: Google A2A Agent Card und HTML Discovery-Links.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* agent.json (A2A) */}
              <Card className="border-indigo-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-indigo-600" />
                    <CardTitle className="text-base">agent.json</CardTitle>
                    <Badge variant="default" className="bg-indigo-600 text-xs">A2A</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(agentCard, 'agent')}
                      title="Kopieren"
                    >
                      {copied === 'agent' ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downloadFile(agentCard, 'agent.json', 'application/json')}
                      title="Download"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-2">
                    Google A2A Agent Card — beschreibt Fähigkeiten und Endpunkte für KI-Agenten. Unter <code className="text-xs">/.well-known/agent.json</code> bereitstellen.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand('agent')}
                    className="text-xs text-gray-500 px-0"
                  >
                    {expandedCard === 'agent' ? 'Ausblenden' : 'Vorschau'}
                  </Button>
                  {expandedCard === 'agent' && (
                    <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono mt-2">
                      {agentCard || 'Keine Daten'}
                    </pre>
                  )}
                </CardContent>
              </Card>

              {/* Auto-Discovery <link> Tags */}
              <Card className="border-indigo-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Link2 size={18} className="text-indigo-600" />
                    <CardTitle className="text-base">Discovery Links</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(linkTags, 'linktags')}
                      title="Kopieren"
                    >
                      {copied === 'linktags' ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => downloadFile(linkTags, 'discovery-links.html', 'text/html')}
                      title="Download"
                    >
                      <Download size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-2">
                    HTML {'<link>'}-Tags für den {'<head>'} — damit Agenten alle Discovery-Dateien automatisch finden.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand('linktags')}
                    className="text-xs text-gray-500 px-0"
                  >
                    {expandedCard === 'linktags' ? 'Ausblenden' : 'Vorschau'}
                  </Button>
                  {expandedCard === 'linktags' && (
                    <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono mt-2">
                      {linkTags || 'Keine Daten'}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Deployment instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deployment-Anleitung</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-600">
                  Um die Dateien auf <strong>{selectedDomain}</strong> zu deployen:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Globe2 size={16} className="text-radar-600" />
                      Für Google AI (Schema.org)
                    </h4>
                    <ol className="text-xs text-gray-600 space-y-1.5 list-decimal pl-4">
                      <li>Schema.org JSON-LD Embed-Code kopieren</li>
                      <li>In den <code>{'<head>'}</code> jeder relevanten Seite einbetten</li>
                      <li>Mit <a href="https://search.google.com/test/rich-results" target="_blank" className="text-radar-600 underline">Google Rich Results Test</a> validieren</li>
                    </ol>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Code2 size={16} className="text-radar-600" />
                      Für KI-Agenten (MCP + Discovery)
                    </h4>
                    <ol className="text-xs text-gray-600 space-y-1.5 list-decimal pl-4">
                      <li><code>llms.txt</code> → <code>https://{selectedDomain}/llms.txt</code></li>
                      <li><code>mcp.json</code> → <code>https://{selectedDomain}/.well-known/mcp.json</code></li>
                      <li><code>skills.md</code> → <code>https://{selectedDomain}/.well-known/skills.md</code></li>
                      <li><code>agent.json</code> → <code>https://{selectedDomain}/.well-known/agent.json</code> (A2A)</li>
                      <li>Discovery <code>{'<link>'}</code>-Tags in den <code>{'<head>'}</code> einbetten</li>
                    </ol>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Nach dem Deployment können Google AI Overviews die Schema.org-Daten nutzen,
                  KI-Agenten finden die strukturierten Unternehmensdaten über MCP Discovery und A2A Agent Card,
                  und die llms.txt wird für den Chrome Lighthouse Agentic Browsing Audit erkannt.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
