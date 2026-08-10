'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuditPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/super-admin/operations?tab=audit')
  }, [router])
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-zinc-400">
      Redirection vers le centre opérations…
    </div>
  )
}
