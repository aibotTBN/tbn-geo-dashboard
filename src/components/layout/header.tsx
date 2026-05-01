'use client'

import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function Header({ title }: { title: string }) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-sm text-gray-500 hidden sm:block">{session.user.name}</span>
          )}
          <Button variant="ghost" size="icon" onClick={() => signOut()} title="Abmelden">
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  )
}
