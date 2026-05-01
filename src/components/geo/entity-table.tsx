'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Eye } from 'lucide-react'

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

export function EntityTable({
  entities,
  keyField,
  columns,
  onStatusChange,
}: {
  entities: Entity[]
  keyField: string
  columns: string[]
  onStatusChange?: (id: number, status: string) => void
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col} className="text-left py-3 px-4 font-medium text-gray-500 uppercase text-xs">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
            <th className="text-left py-3 px-4 font-medium text-gray-500 uppercase text-xs">Status</th>
            <th className="py-3 px-4 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {entities.map((entity) => (
            <>
              <tr
                key={entity.id}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === entity.id ? null : entity.id)}
              >
                {columns.map((col) => (
                  <td key={col} className="py-3 px-4 max-w-xs truncate">
                    {typeof entity[col] === 'object' ? entity[col]?.value || '' : entity[col] || '–'}
                  </td>
                ))}
                <td className="py-3 px-4">
                  <Badge variant={statusColors[entity.status?.value || entity.status || 'Draft'] || 'secondary'}>
                    {entity.status?.value || entity.status || 'Draft'}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {onStatusChange && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={(e) => { e.stopPropagation(); onStatusChange(entity.id, 'Approved') }}
                          title="Freigeben"
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); onStatusChange(entity.id, 'Rejected') }}
                          title="Ablehnen"
                        >
                          <X size={16} />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
              {expandedId === entity.id && (
                <tr key={`${entity.id}-detail`}>
                  <td colSpan={columns.length + 2} className="bg-gray-50 px-6 py-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(entity).map(([k, v]) => {
                        if (['id', 'order'].includes(k) || !v || v === '') return null
                        const displayValue = typeof v === 'object' ? v?.value || JSON.stringify(v) : String(v)
                        if (!displayValue || displayValue === '{}') return null
                        return (
                          <div key={k}>
                            <span className="text-gray-400 text-xs">{k.replace(/_/g, ' ')}</span>
                            <p className="text-gray-700 mt-0.5 line-clamp-3">{displayValue}</p>
                          </div>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
      {entities.length === 0 && (
        <p className="text-center text-gray-400 py-8">Keine Einträge gefunden</p>
      )}
    </div>
  )
}
