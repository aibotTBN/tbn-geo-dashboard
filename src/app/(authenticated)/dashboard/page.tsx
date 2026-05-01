'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreGauge, ScoreDimension } from '@/components/geo/score-gauge'
import { Button } from '@/components/ui/button'
import { FolderKanban, Search, Database, ArrowRight, Plus, Globe } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  domain: string
  name: string
  updatedAt: string
  diagnoses: Array<{
    score: number
    scoreCitation: number
    scoreTech: number
    scoreSchema: number
    scoreContent: number
    scoreFresh: number
    createdAt: string
  }>
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/geo/projects')
      .then((r) => r.json())
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalProjects = projects.length
  const projectsWithDiagnosis = projects.filter((p) => p.diagnoses.length > 0)
  const avgScore = projectsWithDiagnosis.length > 0
    ? Math.round(projectsWithDiagnosis.reduce((sum, p) => sum + p.diagnoses[0].score, 0) / projectsWithDiagnosis.length)
    : 0

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-radar-50">
                  <FolderKanban className="text-radar-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Projekte</p>
                  <p className="text-2xl font-bold">{totalProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-50">
                  <Search className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diagnosen</p>
                  <p className="text-2xl font-bold">{projectsWithDiagnosis.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Database className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ø GEO Score</p>
                  <p className="text-2xl font-bold">{avgScore}<span className="text-sm text-gray-400">/100</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Projekte</CardTitle>
              <CardDescription>Übersicht aller analysierten Domains</CardDescription>
            </div>
            <Link href="/projekte">
              <Button size="sm">
                <Plus size={16} className="mr-1" /> Neues Projekt
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-radar-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Globe size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Noch keine Projekte angelegt</p>
                <Link href="/projekte">
                  <Button>
                    <Plus size={16} className="mr-1" /> Erstes Projekt anlegen
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => {
                  const diag = project.diagnoses[0]
                  return (
                    <Link
                      key={project.id}
                      href={`/projekte/${encodeURIComponent(project.domain)}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-radar-200 hover:bg-radar-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Globe size={20} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{project.name}</p>
                          <p className="text-sm text-gray-400">{project.domain}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {diag ? (
                          <div className="flex items-center gap-3">
                            <ScoreGauge score={diag.score} size="sm" />
                            <Badge variant={diag.score >= 60 ? 'success' : 'warning'}>
                              {diag.score}/100
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary">Keine Diagnose</Badge>
                        )}
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
