'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface RagReadinessData {
  score: number
  max: number
  details: {
    chunk_quality?: { score: number; max: number; label: string }
    entity_density?: { score: number; max: number; label: string }
    schema_completeness?: {
      score: number
      max: number
      label: string
      present?: string[]
      missing?: string[]
    }
    query_alignment?: { score: number; max: number; label: string }
  }
}

function getColor(pct: number) {
  if (pct >= 70) return { bg: 'bg-green-500', text: 'text-green-600', label: 'Gut', ringColor: 'ring-green-200' }
  if (pct >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Ausbaufähig', ringColor: 'ring-yellow-200' }
  if (pct >= 30) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'Schwach', ringColor: 'ring-orange-200' }
  return { bg: 'bg-red-500', text: 'text-red-600', label: 'Kritisch', ringColor: 'ring-red-200' }
}

/**
 * Single dimension bar for RAG readiness.
 */
function DimensionBar({
  label,
  score,
  max,
  description,
}: {
  label: string
  score: number
  max: number
  description?: string
}) {
  const pct = Math.round((score / max) * 100)
  const color = getColor(pct)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          {pct >= 70 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : pct >= 40 ? (
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className="text-sm text-gray-700 font-medium">{label}</span>
        </div>
        <span className={cn('text-sm font-semibold', color.text)}>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color.bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}
    </div>
  )
}

/**
 * RAG Readiness Score card — evaluates how well website content
 * is structured for retrieval by RAG systems (Google AI Overview, etc.)
 */
export function RagReadinessCard({ data }: { data: RagReadinessData }) {
  const pct = Math.round((data.score / data.max) * 100)
  const color = getColor(pct)
  const details = data.details

  const dimensions = [
    {
      ...details.chunk_quality,
      key: 'chunk_quality',
      description: 'Sind Inhalte in klare, selbstständige Abschnitte (150-300 Wörter) gegliedert?',
    },
    {
      ...details.entity_density,
      key: 'entity_density',
      description: 'Sind Aussagen mit benannten Entitäten (Organisation, Personen, Produkte) verankert?',
    },
    {
      ...details.schema_completeness,
      key: 'schema_completeness',
      description: 'Welche Schema.org-Typen sind vorhanden vs. empfohlen?',
    },
    {
      ...details.query_alignment,
      key: 'query_alignment',
      description: 'Spiegeln H2-Überschriften und Meta-Descriptions echte Suchanfragen wider?',
    },
  ].filter(d => d.max !== undefined)

  // Schema completeness details
  const schemaDetails = details.schema_completeness
  const presentTypes = schemaDetails?.present || []
  const missingTypes = schemaDetails?.missing || []

  return (
    <div className="space-y-5">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            RAG-Readiness
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-bold', color.text)}>
            {data.score}
          </span>
          <span className="text-sm text-gray-400">/ {data.max}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 -mt-2">
        Wie gut sind Ihre Inhalte für die Übernahme durch KI-Systeme (RAG) strukturiert?
        Ein hoher Score bedeutet, dass Google AI Overviews und andere RAG-Systeme Ihre Inhalte
        bevorzugt als Quelle verwenden.
      </p>

      {/* Overall bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color.bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn('text-xs font-medium', color.text)}>{color.label}</p>

      {/* Sub-dimensions */}
      <div className="space-y-4 pt-1">
        {dimensions.map((dim) => (
          <DimensionBar
            key={dim.key}
            label={dim.label || dim.key}
            score={dim.score ?? 0}
            max={dim.max ?? 1}
            description={dim.description}
          />
        ))}
      </div>

      {/* Schema type breakdown */}
      {(presentTypes.length > 0 || missingTypes.length > 0) && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Schema.org Typen</p>
          <div className="flex flex-wrap gap-1.5">
            {presentTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-green-50 text-green-700 border border-green-200"
              >
                ✓ {type}
              </span>
            ))}
            {missingTypes.map(type => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-50 text-gray-400 border border-gray-200"
              >
                ✗ {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actionable hint */}
      {pct < 50 && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          💡 <strong>Tipp:</strong> FAQPage-Schema hinzufügen, Inhalte in klar strukturierte H2-Abschnitte
          mit 150-300 Wörtern gliedern, und Schema.org um Organization, Article und Service erweitern.
        </div>
      )}
    </div>
  )
}
