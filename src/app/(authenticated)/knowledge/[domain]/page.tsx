'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EntityTable } from '@/components/geo/entity-table'
import { cn } from '@/lib/utils'
import {
  Building2, Briefcase, HelpCircle, Users, FileText, Trophy, BarChart3, Calendar,
  Loader2, Search, CheckCircle, XCircle,
} from 'lucide-react'

const ENTITY_META = [
  { key: 'geo_organizations', label: 'Organisationen', icon: Building2, columns: ['name', 'description'] },
  { key: 'geo_services', label: 'Services', icon: Briefcase, columns: ['name', 'description'] },
  { key: 'geo_faq', label: 'FAQ', icon: HelpCircle, columns: ['question', 'answer'] },
  { key: 'geo_persons', label: 'Personen', icon: Users, columns: ['name', 'role'] },
  { key: 'geo_blog_posts', label: 'Blog Posts', icon: FileText, columns: ['title', 'summary'] },
  { key: 'geo_case_studies', label: 'Case Studies', icon: Trophy, columns: ['title', 'client_name'] },
  { key: 'geo_statistics', label: 'Statistiken', icon: BarChart3, columns: ['metric', 'value'] },
  { key: 'geo_events', label: 'Events', icon: Calendar, columns: ['name', 'date'] },
]

export default function KnowledgeDomainPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const domain = decodeURIComponent(params.domain as string)
  const initialType = searchParams.get('type') || 'geo_organizations'

  const [activeType, setActiveType] = useState(initialType)
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCounts()
  }, [domain])

  useEffect(() => {
    loadEntities()
  }, [activeType, domain, searchQuery])

  async function loadCounts() {
    const c: Record<string, number> = {}
    for (const meta of ENTITY_META) {
      try {
        const res = await fetch(`/api/geo/knowledge?type=${meta.key}&domain=${domain}`)
        const data = await res.json()
        c[meta.key] = data.rows?.length || 0
      } catch { c[meta.key] = 0 }
    }
    setCounts(c)
  }

  async function loadEntities() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeType, domain })
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/geo/knowledge?${params}`)
      const data = await res.json()
      setEntities(data.rows || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(rowId: number, status: string) {
    try {
      await fetch('/api/geo/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, rowId, status }),
      })
      setEntities((prev) =>
        prev.map((e) => (e.id === rowId ? { ...e, status: { value: status } } : e))
      )
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  const activeMeta = ENTITY_META.find((m) => m.key === activeType) || ENTITY_META[0]

  return (
    <>
      <Header title={`Knowledge: ${domain}`} />
      <div className="p-6 space-y-6">
        {/* Type tabs */}
        <div className="flex flex-wrap gap-2">
          {ENTITY_META.map((meta) => {
            const Icon = meta.icon
            const isActive = meta.key === activeType
            return (
              <button
                key={meta.key}
                onClick={() => setActiveType(meta.key)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-radar-100 text-radar-700' : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                <Icon size={16} />
                {meta.label}
                <span className="text-xs opacity-60">({counts[meta.key] || 0})</span>
              </button>
            )
          })}
        </div>

        {/* Search + bulk actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-radar-500"
            />
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <CheckCircle size={14} className="text-green-500" />
            {entities.filter((e) => (e.status?.value || e.status) === 'Approved').length}
            <XCircle size={14} className="text-red-400 ml-2" />
            {entities.filter((e) => (e.status?.value || e.status) === 'Rejected').length}
          </div>
        </div>

        {/* Entity table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{activeMeta.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-radar-600" />
              </div>
            ) : (
              <EntityTable
                entities={entities}
                keyField={activeMeta.columns[0]}
                columns={activeMeta.columns}
                onStatusChange={handleStatusChange}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
