'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileJson2, FileText, Copy, Check, Loader2 } from 'lucide-react'

interface Project {
  id: string
  domain: string
  name: string
}

export default function ExportPage() {
  const searchParams = useSearchParams()
  const initialDomain = searchParams.get('domain') || ''

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedDomain, setSelectedDomain] = useState(initialDomain)
  const [llmsTxt, setLlmsTxt] = useState('')
  const [mcpJson, setMcpJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

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
      const [llmsRes, mcpRes] = await Promise.all([
        fetch(`/api/geo/export?domain=${selectedDomain}&format=llms.txt`),
        fetch(`/api/geo/export?domain=${selectedDomain}&format=mcp.json`),
      ])
      setLlmsTxt(await llmsRes.text())
      setMcpJson(JSON.stringify(await mcpRes.json(), null, 2))
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

  return (
    <>
      <Header title="Export" />
      <div className="p-6 space-y-6">
        {/* Domain selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain auswählen</CardTitle>
            <CardDescription>
              Generiert Discovery-Dateien (llms.txt + mcp.json) für die gewählte Domain.
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* llms.txt */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-radar-600" />
                  <CardTitle className="text-lg">llms.txt</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(llmsTxt, 'llms')}
                  >
                    {copied === 'llms' ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                    {copied === 'llms' ? 'Kopiert' : 'Kopieren'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadFile(llmsTxt, 'llms.txt', 'text/plain')}
                  >
                    <Download size={14} className="mr-1" /> Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono">
                  {llmsTxt || 'Keine Daten'}
                </pre>
              </CardContent>
            </Card>

            {/* mcp.json */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson2 size={20} className="text-radar-600" />
                  <CardTitle className="text-lg">mcp.json</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(mcpJson, 'mcp')}
                  >
                    {copied === 'mcp' ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                    {copied === 'mcp' ? 'Kopiert' : 'Kopieren'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadFile(mcpJson, '.well-known/mcp.json', 'application/json')}
                  >
                    <Download size={14} className="mr-1" /> Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono">
                  {mcpJson || 'Keine Daten'}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deployment instructions */}
        {selectedDomain && !loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deployment-Anleitung</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-600">
                Um die Dateien auf <strong>{selectedDomain}</strong> zu deployen:
              </p>
              <ol className="text-sm text-gray-600 space-y-2 mt-3">
                <li><code>llms.txt</code> → <code>https://{selectedDomain}/llms.txt</code></li>
                <li><code>mcp.json</code> → <code>https://{selectedDomain}/.well-known/mcp.json</code></li>
              </ol>
              <p className="text-sm text-gray-500 mt-3">
                Nach dem Deployment können LLMs wie ChatGPT, Gemini und Claude die strukturierten
                Unternehmensdaten automatisch finden und zitieren.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
