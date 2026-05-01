'use client'

import { cn } from '@/lib/utils'

function getScoreColor(score: number) {
  if (score >= 80) return { bg: 'bg-green-500', text: 'text-green-600', label: 'Excellent' }
  if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'Gut' }
  if (score >= 40) return { bg: 'bg-orange-500', text: 'text-orange-600', label: 'Ausbaufähig' }
  return { bg: 'bg-red-500', text: 'text-red-600', label: 'Kritisch' }
}

export function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = getScoreColor(score)
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  const sizes = {
    sm: { container: 'w-20 h-20', text: 'text-xl', label: 'text-[8px]' },
    md: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-xs' },
    lg: { container: 'w-48 h-48', text: 'text-5xl', label: 'text-sm' },
  }

  return (
    <div className={cn('relative', sizes[size].container)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-1000', color.text)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', sizes[size].text, color.text)}>{score}</span>
        <span className={cn('text-gray-500', sizes[size].label)}>{color.label}</span>
      </div>
    </div>
  )
}

export function ScoreDimension({
  label,
  score,
  maxScore,
}: {
  label: string
  score: number
  maxScore: number
}) {
  const pct = Math.round((score / maxScore) * 100)
  const color = getScoreColor(pct)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={cn('font-semibold', color.text)}>
          {score}/{maxScore}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color.bg)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
