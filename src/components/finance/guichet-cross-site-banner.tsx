'use client'

import { Building2 } from 'lucide-react'
import { useNetworkContext, useStudentWallet } from '@/lib/hooks/use-finance'

/** Bandeau guichet — encaissement inter-sites (élève d’un autre campus du réseau). */
export function GuichetCrossSiteBanner({
  studentId,
  schoolNameFallback,
}: {
  studentId: number
  /** Nom campus d’inscription (ex. résultat recherche réseau). */
  schoolNameFallback?: string | null
}) {
  const { data: wallet } = useStudentWallet(studentId)
  const { data: network } = useNetworkContext()

  const enrollmentName =
    wallet?.enrollmentSchoolName ?? schoolNameFallback ?? null
  const isCross = Boolean(wallet?.isCrossSite) || Boolean(schoolNameFallback)

  if (!isCross || !enrollmentName) return null

  const collectionName =
    wallet?.collectionSchoolName ??
    network?.collectionSiteName ??
    'ce guichet'

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 size={14} className="text-amber-700 shrink-0" />
        <p className="text-xs font-semibold text-amber-950">Encaissement réseau / inter-sites</p>
        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-200">
          Élève de : {enrollmentName}
        </span>
      </div>
      <p className="text-[11px] text-amber-900/90 leading-relaxed">
        Dette et reçu au branding de{' '}
        <span className="font-medium">{enrollmentName}</span>
        {' '}— espèces / float sur{' '}
        <span className="font-medium">{collectionName}</span>
        . Pied de reçu : « Encaissé au guichet inter-sites : {collectionName} ».
      </p>
    </div>
  )
}
