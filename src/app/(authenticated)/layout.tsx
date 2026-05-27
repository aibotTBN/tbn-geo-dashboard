'use client'

import { useSession } from 'next-auth/react'
import { redirect, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { MainContent } from '@/components/layout/main-content'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-radar-600"></div>
      </div>
    )
  }

  if (!session) {
    redirect('/login')
  }

  // Check if user has an active plan (TBN_STAFF and ADMIN always have access)
  const role = (session.user as any)?.role
  const plan = (session.user as any)?.plan
  const isStaff = role === 'TBN_STAFF' || role === 'ADMIN'

  if (!isStaff && !plan) {
    // User registered but has no plan — redirect to plan activation page
    // Allow /dashboard?checkout=success through (webhook might not have fired yet)
    if (pathname !== '/dashboard') {
      redirect('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MainContent>{children}</MainContent>
    </div>
  )
}
