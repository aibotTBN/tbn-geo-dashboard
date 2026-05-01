'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Briefcase, HelpCircle, Users, FileText, Trophy, BarChart3, Calendar, ArrowRight, Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  domain: string
  name: string
}

const ENTITY_META = [
  { key: 'geo_organizations', label: 'Organisationen', icon: Building2, color: 'bg-blue-50 text-blue-600' },
  { key: 'geo_services', label: 'Services', icon: Briefcase, color: 'bg-purple-50 text-purple-600' },
  { key: 'geo_faq', label: 'FAQ', icon: HelpCircle, color: 'bg-amber-50 text-amber-600' },
  { key: 'geo_persons', label: 'Personen', icon: Users, color: 'bg-green-50 text-green-600' },
  { key: 'geo_blog_posts', label: 'Blog Posts', icon: FileText, color: 'bg-pink-50 text-pink-600' },
  { key: 'geo_case_studies', label: 'Case Studies', icon: Trophy, color: 'bg-orange-50 text-orange-600' },
  { key: 'geo_statistics', label: 'Statistiken', icon: BarChart3, color: 'bg-cyan-50 text-cyan-600' },
  { key: 'geo_events', label: 'Events', icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
]

export default function KnowledgePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/geo/projects')
      const data = await res.json()
      const projs = Array.isArray(data) ? data : []
      setProjects(projs)

      // Load entity counts per domain
      const allCounts: Record<string, Record<string, number>> = {}
      for (const proj of projs) {
        allCounts[proj.domain] = {}
        for (const meta of ENTITY_META) {
          try {
            const resp = await fetch(`/api/geo/knowledge?type=${meta.key}&domain=${proj.domain}`)
            const d = await resp.json()
            allCounts[proj.domain][meta.key] = d.rows?.length || 0
          } catch {
            allCounts[proj.domain][meta.key] = 0
          }
        }
      }
      setCounts(allCounts)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header title="Knowledge Base" />
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-radar-600" />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Keine Projekte vorhanden. Lege zuerst ein Projekt an.</p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => {
            const domainCounts = counts[project.domain] || {}
            const total = Object.values(domainCounts).reduce((a, b) => a + b, 0)
            return (
              <Card key={project.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription>{project.domain} — {total} Entities</CardDescription>
                  </div>
                  <Link href={`/knowledge/${encodeURIComponent(project.domain)}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-radar-50">
                      Details <ArrowRight size={12} className="ml-1" />
                    </Badge>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ENTITY_META.map((meta) => {
                      const Icon = meta.icon
                      const count = domainCounts[meta.key] || 0
                      return (
                        <Link
                          key={meta.key}
                          href={`/knowledge/${encodeURIComponent(project.domain)}?type=${meta.key}`}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:border-radar-200 transition-colors"
                        >
                          <div className={`p-2 rounded-lg ${meta.color}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{meta.label}</p>
                            <p className="text-xs text-gray-400">{count}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
