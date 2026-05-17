'use client'

import { useSession } from 'next-auth/react'
import { ArrowUpRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasFeature, requiredPlanFor, type PlanType } from '@/lib/plan-limits'
import Link from 'next/link'

interface UpgradeNudgeProps {
  feature: keyof ReturnType<typeof import('@/lib/plan-limits').getLimitsForUser>['features']
  title?: string
  children?: React.ReactNode
}

/**
 * Wraps content and shows an upgrade prompt if the user's plan doesn't include this feature.
 * For TBN staff / admins, always shows children directly.
 */
export function UpgradeNudge({ feature, title, children }: UpgradeNudgeProps) {
  const { data: session } = useSession()
  const plan = (session?.user as any)?.plan as PlanType
  const role = (session?.user as any)?.role as string

  // TBN staff and admins always have access
  if (role === 'TBN_STAFF' || role === 'ADMIN') {
    return <>{children}</>
  }

  // Check if feature is available
  if (hasFeature(plan, role || 'USER', feature)) {
    return <>{children}</>
  }

  const requiredPlan = requiredPlanFor(feature)

  return (
    <div className="relative">
      {/* Blurred content */}
      {children && (
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>
      )}

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-radar-100 text-radar-600 mb-3">
            <Lock size={24} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            {title || 'Feature nicht verfügbar'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Diese Funktion ist ab dem <strong>{requiredPlan}</strong>-Plan verfügbar.
          </p>
          <Link href="/register">
            <Button className="bg-radar-600 hover:bg-radar-700" size="sm">
              Upgrade auf {requiredPlan}
              <ArrowUpRight size={16} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Simple inline upgrade badge for feature labels.
 */
export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-radar-100 text-radar-700">
      <Lock size={10} />
      {plan}
    </span>
  )
}
