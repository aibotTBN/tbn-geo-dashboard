'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Eye, Pencil, Save, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

interface Entity {
  id: number
  [key: string]: any
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  Draft: 'secondary',
  Reviewed: 'warning',
  Approved: 'success',
  Rejected: 'destructive',
}

const STATUS_OPTIONS = ['Draft', 'Reviewed', 'Approved', 'Rejected']

function EditableCell({
  value,
  onSave,
  multiline = false,
}: {
  value: string
  onSave: (newValue: string) => void
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (!editing) {
    return (
      <div
        className="group flex items-start gap-1 cursor-pointer min-h-[1.5em]"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        <span className="flex-1 break-words">{value || '–'}</span>
        <Pencil size={12} className="shrink-0 mt-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )
  }

  const save = () => {
    if (draft !== value) onSave(draft)
    setEditing(false)
  }

  if (multiline) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
          className="w-full px-2 py-1 border rounded text-sm resize-y min-h-[60px] focus:ring-2 focus:ring-radar-500 focus:outline-none"
          rows={3}
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={save}>
            <Save size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400" onClick={() => setEditing(false)}>
            <X size={12} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={save}
        className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-radar-500 focus:outline-none"
      />
    </div>
  )
}

export function EntityTable({
  entities,
  keyField,
  columns,
  onStatusChange,
  onFieldUpdate,
  statusFilter,
}: {
  entities: Entity[]
  keyField: string
  columns: string[]
  onStatusChange?: (id: number, status: string) => void
  onFieldUpdate?: (id: number, field: string, value: string) => void
  statusFilter?: string
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Apply status filter
  const filtered = statusFilter
    ? entities.filter((e) => (e.status?.value || e.status || 'Draft') === statusFilter)
    : entities

  // Fields that should be multiline in edit mode
  const multilineFields = new Set(['description', 'answer', 'summary', 'content', 'details'])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 w-8"></th>
            {columns.map((col) => (
              <th key={col} className="text-left py-3 px-4 font-medium text-gray-500 uppercase text-xs">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
            <th className="text-left py-3 px-4 font-medium text-gray-500 uppercase text-xs">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500 uppercase text-xs w-16">Source</th>
            <th className="py-3 px-4 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entity) => {
            const isExpanded = expandedId === entity.id
            const status = entity.status?.value || entity.status || 'Draft'
            const sourceUrl = entity.source_url?.value || entity.source_url || ''
            return (
              <>
                <tr
                  key={entity.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entity.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  {columns.map((col) => {
                    const rawValue = typeof entity[col] === 'object' ? entity[col]?.value || '' : entity[col] || ''
                    return (
                      <td key={col} className="py-3 px-4 max-w-xs">
                        {onFieldUpdate ? (
                          <EditableCell
                            value={rawValue}
                            multiline={multilineFields.has(col)}
                            onSave={(v) => onFieldUpdate(entity.id, col, v)}
                          />
                        ) : (
                          <span className="truncate block">{rawValue || '–'}</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-3 px-4">
                    <select
                      value={status}
                      onChange={(e) => onStatusChange?.(entity.id, e.target.value)}
                      className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-radar-500 ${
                        status === 'Approved' ? 'bg-green-50 text-green-700' :
                        status === 'Rejected' ? 'bg-red-50 text-red-700' :
                        status === 'Reviewed' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-radar-600"
                        title={sourceUrl}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {onStatusChange && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={(e) => { e.stopPropagation(); onStatusChange(entity.id, 'Approved') }}
                            title="Freigeben"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); onStatusChange(entity.id, 'Rejected') }}
                            title="Ablehnen"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${entity.id}-detail`}>
                    <td colSpan={columns.length + 4} className="bg-gray-50/80 px-8 py-5 border-b border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {Object.entries(entity).map(([k, v]) => {
                          if (['id', 'order'].includes(k) || v === null || v === undefined || v === '') return null
                          const displayValue = typeof v === 'object' ? v?.value || JSON.stringify(v) : String(v)
                          if (!displayValue || displayValue === '{}') return null
                          const isLong = displayValue.length > 100
                          return (
                            <div key={k} className={isLong ? 'md:col-span-2' : ''}>
                              <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                                {k.replace(/_/g, ' ')}
                              </span>
                              {onFieldUpdate && !['id', 'order', 'source_url', 'project_domain', 'extracted_at'].includes(k) ? (
                                <div className="mt-1">
                                  <EditableCell
                                    value={displayValue}
                                    multiline={isLong}
                                    onSave={(newVal) => onFieldUpdate(entity.id, k, newVal)}
                                  />
                                </div>
                              ) : (
                                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{displayValue}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          {statusFilter ? `Keine Einträge mit Status "${statusFilter}"` : 'Keine Einträge gefunden'}
        </p>
      )}
    </div>
  )
}
