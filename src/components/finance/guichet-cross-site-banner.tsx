'use client'

import { Building2 } from 'lucide-react'
import { useNetworkContext, useStudentWallet } from '@/lib/hooks/use-finance'

/** Bandeau guichet — encaissement hub pour élève inscrit sur un autre site du réseau. */
export function GuichetCrossSiteBanner({ studentId }: { studentId: number }) {
  const { data: wallet } = useStudentWallet(studentId)
  const { data: network } = useNetworkContext()

  if (!wallet?.isCrossSite) return null

  const collectionName =
    wallet.collectionSchoolName ??
    network?.collectionSiteName ??
    'votre caisse hub'

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 space-y-1">
      <div className="flex items-center gap-2">
        <Building2 size={14} className="text-amber-700 shrink-0" />
        <p className="text-xs font-semibold text-amber-950">Encaissement réseau</p>
      </div>
      <p className="text-[11px] text-amber-900/90 leading-relaxed">
        Élève inscrit à{' '}
        <span className="font-medium">{wallet.enrollmentSchoolName ?? 'un autre site'}</span>
        {' '}— encaissement sur{' '}
        <span className="font-medium">{collectionName}</span>
        . Le solde sera crédité sur le site d&apos;inscription ; la session caisse reste sur le hub.
      </p>
    </div>
  )
}
