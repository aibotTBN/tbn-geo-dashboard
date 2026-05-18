'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, Globe, ExternalLink } from 'lucide-react'

interface GoogleAiOverviewData {
  brand_cited: boolean
  brand_mentioned_in_text: boolean
  total_sources: number
  brand_urls: string[]
  cited_domains: string[]
  search_queries: string[]
  brand_support_texts: string[]
}

/**
 * Google AI Overview card — shows whether the brand appears
 * in Google's search-grounded AI responses.
 */
export function GoogleAiOverviewCard({ data }: { data: GoogleAiOverviewData }) {
  const isCited = data.brand_cited || data.brand_mentioned_in_text
  const citedInSources = data.brand_cited

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={cn(
        'rounded-lg border p-4 flex items-start gap-3',
        isCited
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      )}>
        {isCited ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <div>
          <h4 className={cn(
            'text-sm font-semibold',
            isCited ? 'text-green-800' : 'text-red-800'
          )}>
            {isCited
              ? citedInSources
                ? 'In Google AI Overviews als Quelle zitiert'
                : 'In Google AI Antworten erwähnt'
              : 'Nicht in Google AI Overviews vertreten'
            }
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            {isCited
              ? `Ihre Website wird bei branchenrelevanten Fragen von Googles KI als ${citedInSources ? 'Quelle zitiert' : 'Marke erwähnt'}. ${data.brand_urls.length > 0 ? `${data.brand_urls.length} Ihrer Seiten werden referenziert.` : ''}`
              : 'Bei branchenrelevanten Fragen wird Ihre Website von Googles KI-Überblicken nicht als Quelle herangezogen. Strukturierte Daten, FAQ-Schema und aktuelle Inhalte können die Sichtbarkeit verbessern.'
            }
          </p>
        </div>
      </div>

      {/* Grounding stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-gray-50">
          <p className="text-lg font-bold text-gray-900">{data.total_sources}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Quellen gesamt</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-gray-50">
          <p className="text-lg font-bold text-gray-900">{data.brand_urls.length}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Eigene URLs</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-gray-50">
          <p className="text-lg font-bold text-gray-900">{data.cited_domains.length}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Domains zitiert</p>
        </div>
      </div>

      {/* Brand URLs if cited */}
      {data.brand_urls.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Ihre zitierten Seiten:</p>
          <div className="space-y-1">
            {data.brand_urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
              >
                <ExternalLink size={10} />
                {url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 60)}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Brand support texts (grounded quotes) */}
      {data.brand_support_texts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Google AI zitiert:</p>
          <div className="space-y-1.5">
            {data.brand_support_texts.map((text, i) => (
              <blockquote
                key={i}
                className="text-xs text-gray-600 italic border-l-2 border-green-300 pl-2"
              >
                „{text}"
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Competitor domains */}
      {data.cited_domains.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Stattdessen zitierte Domains:</p>
          <div className="flex flex-wrap gap-1">
            {data.cited_domains.slice(0, 8).map(domain => (
              <span
                key={domain}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 border border-gray-200"
              >
                <Globe size={9} />
                {domain}
              </span>
            ))}
            {data.cited_domains.length > 8 && (
              <span className="text-[11px] text-gray-400">
                +{data.cited_domains.length - 8} weitere
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search queries used */}
      {data.search_queries.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Getestete Suchanfragen</p>
          <div className="flex flex-wrap gap-1">
            {data.search_queries.map((q, i) => (
              <span
                key={i}
                className="text-[11px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5 border border-gray-100"
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
