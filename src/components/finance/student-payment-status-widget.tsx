'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { presentStudentPaymentStatus } from '@/lib/finance/student-payment-status'
import { Skeleton } from '@/components/ui/skeleton'

function formatCount(value: number): string {
  return value.toLocaleString('fr-FR')
}

export function StudentPaymentStatusWidget({ href }: { href: string }) {
  const query = useQuery({
    queryKey: ['finance', 'student-payment-status'],
    queryFn: () => financeRoleApi.listStudentsFinancial({ page: 1, limit: 1 }),
    staleTime: 60_000,
    retry: 1,
  })

  if (query.isPending) {
    return (
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm" aria-busy="true">
        <Skeleton className="h-3 w-28" />
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-16 flex-1" />
          <Skeleton className="h-16 flex-1" />
        </div>
      </section>
    )
  }

  if (query.isError || !query.data) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm text-zinc-500">Compteurs d’élèves indisponibles.</p>
        <button
          type="button"
          onClick={() => {
            void query.refetch()
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-900"
        >
          <RefreshCw size={12} className={query.isFetching ? 'animate-spin' : ''} />
          Réessayer
        </button>
      </section>
    )
  }

  const view = presentStudentPaymentStatus(query.data.meta)

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Scolarité</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {view.sentence ?? 'Aucun élève actif'}
          </p>
        </div>
        <Link href={href} className="shrink-0 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950">
          Voir la liste
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">En ordre</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">{formatCount(view.inOrder)}</p>
        </div>
        <div className="rounded-xl bg-orange-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-800">Débiteurs</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-orange-950">{formatCount(view.debtors)}</p>
        </div>
      </div>
    </section>
  )
}
