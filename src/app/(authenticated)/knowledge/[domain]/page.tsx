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
  Loader2, Search, CheckCircle, XCircle, Filter, Clock, FileCheck, Plus, X,
} from 'lucide-react'

const ENTITY_META = [
  { key: 'geo_organizations', label: 'Organisationen', icon: Building2, columns: ['name', 'description'], createFields: ['name', 'description', 'location', 'website'] },
  { key: 'geo_services', label: 'Services', icon: Briefcase, columns: ['name', 'description'], createFields: ['name', 'description', 'benefits', 'target_audience', 'category'] },
  { key: 'geo_faq', label: 'FAQ', icon: HelpCircle, columns: ['question', 'answer'], createFields: ['question', 'answer', 'category'] },
  { key: 'geo_persons', label: 'Personen', icon: Users, columns: ['name', 'role'], createFields: ['name', 'role', 'expertise', 'bio'] },
  { key: 'geo_blog_posts', label: 'Blog Posts', icon: FileText, columns: ['title', 'summary'], createFields: ['title', 'summary', 'topic', 'key_points', 'author'] },
  { key: 'geo_case_studies', label: 'Case Studies', icon: Trophy, columns: ['title', 'client_name'], createFields: ['title', 'client_name', 'client_industry', 'challenge', 'solution', 'results'] },
  { key: 'geo_statistics', label: 'Statistiken', icon: BarChart3, columns: ['metric', 'value'], createFields: ['metric_name', 'value', 'unit', 'context', 'category'] },
  { key: 'geo_events', label: 'Events', icon: Calendar, columns: ['name', 'date'], createFields: ['name', 'event_type', 'description', 'event_date', 'location'] },
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormFields, setAddFormFields] = useState<Record<string, string>>({})
  const [addingEntity, setAddingEntity] = useState(false)

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

  async function handleDeleteEntity(rowId: number) {
    if (!confirm('Eintrag wirklich löschen?')) return
    setSaving(rowId)
    try {
      const res = await fetch(`/api/geo/knowledge?type=${activeType}&rowId=${rowId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setEntities((prev) => prev.filter((e) => e.id !== rowId))
        setCounts((prev) => ({
          ...prev,
          [activeType]: Math.max(0, (prev[activeType] || 0) - 1),
        }))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setSaving(null)
    }
  }

  async function handleAddEntity() {
    setAddingEntity(true)
    try {
      const fields = {
        ...addFormFields,
        project_domain: domain,
        extracted_at: new Date().toISOString(),
      }
      const res = await fetch('/api/geo/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, fields }),
      })
      if (res.ok) {
        const data = await res.json()
        setEntities((prev) => [data.result, ...prev])
        setCounts((prev) => ({
          ...prev,
          [activeType]: (prev[activeType] || 0) + 1,
        }))
        setShowAddForm(false)
        setAddFormFields({})
      }
    } catch (err) {
      console.error('Create failed:', err)
    } finally {
      setAddingEntity(false)
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
    ? entities.filter((e: Record<string, any>) =>
        Object.values(e).some((v: any) => {
          const str = typeof v === 'object' ? (v as any)?.value || '' : String(v || '')
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
                onClick={() => { setActiveType(meta.key); setStatusFilter(''); setSearchQuery(''); setShowAddForm(false) }}
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

          {/* Add entry button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowAddForm(!showAddForm); setAddFormFields({}) }}
            className="text-radar-600 hover:text-radar-700 hover:border-radar-300"
          >
            <Plus size={14} className="mr-1.5" />
            Eintrag hinzufügen
          </Button>

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

        {/* Add entity form */}
        {showAddForm && (
          <Card className="border-radar-200 bg-radar-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Neuen {activeMeta.label.replace(/en$/, '').replace(/s$/, '')} Eintrag hinzufügen</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAddForm(false)}>
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeMeta.createFields.map((field) => {
                  const isLong = ['description', 'answer', 'summary', 'bio', 'challenge', 'solution', 'results', 'key_points', 'content', 'details', 'context'].includes(field)
                  return (
                    <div key={field} className={isLong ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {field.replace(/_/g, ' ')}
                      </label>
                      {isLong ? (
                        <textarea
                          value={addFormFields[field] || ''}
                          onChange={(e) => setAddFormFields((prev) => ({ ...prev, [field]: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 bg-white resize-y"
                          placeholder={`${field.replace(/_/g, ' ')} eingeben...`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={addFormFields[field] || ''}
                          onChange={(e) => setAddFormFields((prev) => ({ ...prev, [field]: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-radar-500 bg-white"
                          placeholder={`${field.replace(/_/g, ' ')} eingeben...`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Abbrechen</Button>
                <Button
                  size="sm"
                  onClick={handleAddEntity}
                  disabled={addingEntity || !Object.values(addFormFields).some((v) => v.trim())}
                >
                  {addingEntity ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
                  Erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                onDelete={handleDeleteEntity}
                statusFilter={statusFilter}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
