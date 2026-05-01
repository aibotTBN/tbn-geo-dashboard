'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EntityTable } from '@/components/geo/entity-table'
import { cn } from '@/lib/utils'
import {
  Building2, Briefcase, HelpCircle, Users, FileText, Trophy, BarChart3, Calendar,
  Loader2, Search, CheckCircle, XCircle, Filter, Clock, FileCheck,
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

const STATUS_FILTERS = [
  { key: '', label: 'Alle', icon: Filter },
  { key: 'Draft', label: 'Draft', icon: Clock },
  { key: 'Reviewed', label: 'Reviewed', icon: FileCheck },
  { key: 'Approved', label: 'Approved', icon: CheckCircle },
  { key: 'Rejected', label: 'Rejected', icon: XCircle },
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
  const [statusFilter, setStatusFilter] = useState('')
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    loadCounts()
  }, [domain])

  useEffect(() => {
    loadEntities()
  }, [activeType, domain])

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
      const p = new URLSearchParams({ type: activeType, domain })
      const res = await fetch(`/api/geo/knowledge?${p}`)
      const data = await res.json()
      setEntities(data.rows || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(rowId: number, status: string) {
    setSaving(rowId)
    try {
      await fetch('/api/geo/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, rowId, fields: { status } }),
      })
      setEntities((prev) =>
        prev.map((e) => (e.id === rowId ? { ...e, status: status } : e))
      )
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setSaving(null)
    }
  }

  async function handleFieldUpdate(rowId: number, field: string, value: string) {
    setSaving(rowId)
    try {
      await fetch('/api/geo/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, rowId, fields: { [field]: value } }),
      })
      setEntities((prev) =>
        prev.map((e) => (e.id === rowId ? { ...e, [field]: value } : e))
      )
    } catch (err) {
      console.error('Field update failed:', err)
    } finally {
      setSaving(null)
    }
  }

  // Bulk actions
  async function bulkApproveAll() {
    const drafts = entities.filter((e) => (e.status?.value || e.status || 'Draft') === 'Draft')
    for (const entity of drafts) {
      await handleStatusChange(entity.id, 'Approved')
    }
  }

  const activeMeta = ENTITY_META.find((m) => m.key === activeType) || ENTITY_META[0]

  // Count statuses
  const statusCounts = entities.reduce((acc, e) => {
    const s = e.status?.value || e.status || 'Draft'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filter by search
  const searchFiltered = searchQuery
    ? entities.filter((e) =>
        Object.values(e).some((v) => {
          const str = typeof v === 'object' ? v?.value || '' : String(v || '')
          return str.toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    : entities

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
                onClick={() => { setActiveType(meta.key); setStatusFilter(''); setSearchQuery('') }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-radar-100 text-radar-700 shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                <Icon size={16} />
                {meta.label}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-radar-200/50' : 'bg-gray-100'
                )}>
                  {counts[meta.key] || 0}
                </span>
              </button>
            )
          })}
        </div>

        {/* Status filter bar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            {STATUS_FILTERS.map((sf) => {
              const Icon = sf.icon
              const count = sf.key ? (statusCounts[sf.key] || 0) : entities.length
              const isActive = statusFilter === sf.key
              return (
                <button
                  key={sf.key}
                  onClick={() => setStatusFilter(sf.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon size={13} />
                  {sf.label}
                  <span className="opacity-60">({count})</span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 bg-white"
            />
          </div>

          {/* Bulk actions */}
          {statusCounts['Draft'] > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={bulkApproveAll}
              className="text-green-600 hover:text-green-700 hover:border-green-300"
            >
              <CheckCircle size={14} className="mr-1.5" />
              Alle Drafts freigeben ({statusCounts['Draft']})
            </Button>
          )}
        </div>

        {/* Saving indicator */}
        {saving !== null && (
          <div className="flex items-center gap-2 text-sm text-radar-600">
            <Loader2 size={14} className="animate-spin" />
            Speichere...
          </div>
        )}

        {/* Entity table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{activeMeta.label}</CardTitle>
            <p className="text-sm text-gray-400">
              Klicke auf einen Wert um ihn zu bearbeiten
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-radar-600" />
              </div>
            ) : (
              <EntityTable
                entities={searchFiltered}
                keyField={activeMeta.columns[0]}
                columns={activeMeta.columns}
                onStatusChange={handleStatusChange}
                onFieldUpdate={handleFieldUpdate}
                statusFilter={statusFilter}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
