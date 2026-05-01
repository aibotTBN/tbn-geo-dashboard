import { cn } from '@/lib/utils'

export function MainContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main className={cn('flex-1 md:ml-64 min-h-screen bg-gray-50', className)}>
      {children}
    </main>
  )
}
