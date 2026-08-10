'use client'

import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 text-white text-xs font-medium py-1.5 px-4">
      <WifiOff size={13} />
      Vous êtes hors ligne — les données affichées peuvent ne pas être à jour
    </div>
  )
}
