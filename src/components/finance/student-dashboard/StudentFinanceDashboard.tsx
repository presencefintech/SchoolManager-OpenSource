'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { FeesTable } from '@/components/finance/student-dashboard/FeesTable/FeesTable'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'

interface StudentFinanceDashboardProps {
  studentId: number
  sessionId?: number
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export function StudentFinanceDashboard({ studentId, sessionId }: StudentFinanceDashboardProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useStudentFeeSchedule(
    studentId,
    sessionId,
  )

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-6 py-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-red-800">Impossible de charger l&apos;échéancier</p>
        <p className="mt-1 text-xs text-red-600">
          {getApiErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Réessayer
        </button>
      </div>
    )
  }

  const currency = (data.currency || 'USD') as FinanceCurrencyCode
  const { summary } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Échéancier financier</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Session {data.sessionLabel}
          {' · '}
          {data.billingStartMonth} → {data.billingEndMonth}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Lignes" value={String(summary.lineCount)} />
        <SummaryCard label="Payées" value={String(summary.paidCount)} tone="success" />
        <SummaryCard
          label="Dues / retard"
          value={String(summary.dueCount + summary.overdueCount)}
          tone="danger"
        />
        <SummaryCard
          label="Montant dû"
          value={formatMoney(summary.totalAmountDue, currency)}
          tone="danger"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Détail des frais</h2>
          <p className="text-xs text-zinc-400">
            {summary.totalAmountPaid > 0
              ? `${formatMoney(summary.totalAmountPaid, currency)} encaissés`
              : 'Lecture seule'}
          </p>
        </div>
        <FeesTable lines={data.lines} currency={currency} />
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'danger'
        ? 'text-red-700'
        : 'text-zinc-900'

  return (
    <div className="rounded-xl border border-zinc-200/60 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  )
}
