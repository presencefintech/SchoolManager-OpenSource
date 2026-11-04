'use client'

import { usePathname } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const pathname = usePathname()

  if (isOnline) return null

  const onGate = pathname?.startsWith('/teacher/attendance')

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff size={13} />
      {onGate
        ? 'Hors ligne — guichet local actif (file IndexedDB + référentiel élèves)'
        : 'Vous êtes hors ligne — les données affichées peuvent ne pas être à jour'}
    </div>
  )
}
