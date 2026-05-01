'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge, ScoreDimension } from '@/components/geo/score-gauge'
import {
  Search, Database, Download, Loader2, Play, ExternalLink, ArrowRight, Trash2,
  Building2, Briefcase, HelpCircle, Users, FileText, Trophy, BarChart3, Calendar,
} from 'lucide-react'
import Link from 'next/link'

const ENTITY_ICONS: Record<string, any> = {
  geo_organizations: Building2,
  geo_services: Briefcase,
  geo_faq: HelpCircle,
  geo_persons: Users,
  geo_blog_posts: FileText,
  geo_case_studies: Trophy,
  geo_statistics: BarChart3,
  geo_events: Calendar,
}

const ENTITY_LABELS: Record<string, string> = {
  geo_organizations: 'Organisationen',
  geo_services: 'Services',
  geo_faq: 'FAQ',
  geo_persons: 'Personen',
  geo_blog_posts: 'Blog Posts',
  geo_case_studies: 'Case Studies',
  geo_statistics: 'Statistiken',
  geo_events: 'Events',
}

interface DiagnosisData {
  score: number
  scoreCitation: number
  scoreTech: number
  scoreSchema: number
  scoreContent: number
  scoreFresh: number
  createdAt: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const domain = decodeURIComponent(params.domain as string)

  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null)
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [diagnosing, setDiagnosing] = useState(false)
  const [building, setBuilding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    loadData()
  }, [domain])

  async function loadData() {
    setLoading(true)
    try {
      // Load project data
      const projRes = await fetch('/api/geo/projects')
      const projects = await projRes.json()
      const project = (projects || []).find((p: any) => p.domain === domain)
      if (project?.diagnoses?.[0]) {
        setDiagnosis(project.diagnoses[0])
      }

      // Load entity counts
      const types = Object.keys(ENTITY_LABELS)
      const counts: Record<string, number> = {}
      for (const type of types) {
        try {
          const res = await fetch(`/api/geo/knowledge?type=${type}&domain=${domain}`)
          const data = await res.json()
          counts[type] = data.rows?.length || 0
        } catch { counts[type] = 0 }
      }
      setEntityCounts(counts)
    } finally {
      setLoading(false)
    }
  }

  async function runDiagnose() {
    setDiagnosing(true)
    try {
      const res = await fetch('/api/geo/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (data.result?.geo_score !== undefined) {
        setDiagnosis({
          score: data.result.geo_score,
          scoreCitation: data.result.score_citation || 0,
          scoreTech: data.result.score_tech || 0,
          scoreSchema: data.result.score_schema || 0,
          scoreContent: data.result.score_content || 0,
          scoreFresh: data.result.score_fresh || 0,
          createdAt: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDiagnosing(false)
    }
  }

  async function runKnowledgeBuilder() {
    setBuilding(true)
    try {
      await fetch('/api/geo/knowledge-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      // Reload counts after a delay
      setTimeout(loadData, 5000)
    } catch (err) {
      console.error(err)
    } finally {
      setBuilding(false)
    }
  }

  async function deleteProject() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/geo/projects?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        alert(data.error || 'Löschen fehlgeschlagen')
      }
    } catch (err) {
      console.error(err)
      alert('Löschen fehlgeschlagen')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const totalEntities = Object.values(entityCounts).reduce((a, b) => a + b, 0)

  if (loading) {
    return (
      <>
        <Header title={domain} />
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-radar-600" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={domain} />
      <div className="p-6 space-y-6">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={runDiagnose} disabled={diagnosing}>
            {diagnosing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Search size={16} className="mr-2" />}
            GEO Diagnose starten
          </Button>
          <Button variant="outline" onClick={runKnowledgeBuilder} disabled={building}>
            {building ? <Loader2 size={16} className="animate-spin mr-2" /> : <Database size={16} className="mr-2" />}
            Knowledge Builder starten
          </Button>
          <Link href={`/export?domain=${domain}`}>
            <Button variant="outline">
              <Download size={16} className="mr-2" /> Export
            </Button>
          </Link>
          <div className="ml-auto">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Wirklich löschen? Alle Diagnosen gehen verloren.</span>
                <Button variant="destructive" size="sm" onClick={deleteProject} disabled={deleting}>
                  {deleting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Ja, löschen
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Abbrechen
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="text-red-500 hover:text-red-700 hover:border-red-300" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={16} className="mr-2" /> Projekt löschen
              </Button>
            )}
          </div>
        </div>

        {/* Score Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">GEO Score</CardTitle>
              <CardDescription>
                {diagnosis
                  ? `Letzte Diagnose: ${new Date(diagnosis.createdAt).toLocaleDateString('de-DE')}`
                  : 'Noch keine Diagnose durchgeführt'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {diagnosis ? (
                <ScoreGauge score={diagnosis.score} size="lg" />
              ) : (
                <div className="text-center py-8">
                  <Search size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Starte eine Diagnose</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Score-Dimensionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnosis ? (
                <>
                  <ScoreDimension label="KI-Sichtbarkeit" score={diagnosis.scoreCitation} maxScore={30} />
                  <ScoreDimension label="Tech GEO-Dateien" score={diagnosis.scoreTech} maxScore={20} />
                  <ScoreDimension label="Schema Markup" score={diagnosis.scoreSchema} maxScore={20} />
                  <ScoreDimension label="Content-Qualität" score={diagnosis.scoreContent} maxScore={15} />
                  <ScoreDimension label="Content-Freshness" score={diagnosis.scoreFresh} maxScore={15} />
                </>
              ) : (
                <p className="text-gray-400 text-sm py-4">Keine Score-Daten vorhanden</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Base */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Knowledge Base</CardTitle>
              <CardDescription>{totalEntities} Entities extrahiert</CardDescription>
            </div>
            <Link href={`/knowledge/${domain}`}>
              <Button variant="outline" size="sm">
                Alle anzeigen <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(ENTITY_LABELS).map(([key, label]) => {
                const Icon = ENTITY_ICONS[key] || Database
                const count = entityCounts[key] || 0
                return (
                  <Link
                    key={key}
                    href={`/knowledge/${domain}?type=${key}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-radar-200 hover:bg-radar-50/30 transition-colors"
                  >
                    <Icon size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-gray-400">{count} Einträge</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
