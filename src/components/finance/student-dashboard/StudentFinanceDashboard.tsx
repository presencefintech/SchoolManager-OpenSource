'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { FeesTable } from '@/components/finance/student-dashboard/FeesTable/FeesTable'
import { PaymentModal } from '@/components/finance/student-dashboard/PaymentModal/PaymentModal'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import { StudentPaymentHistory } from '@/components/finance/student-dashboard/StudentPaymentHistory'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import type { FeeScheduleLineDto } from '@/types/finance'

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
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch, isFetching } = useStudentFeeSchedule(
    studentId,
    sessionId,
  )

  const [payLine, setPayLine] = useState<FeeScheduleLineDto | null>(null)
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null)

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200/60 bg-red-50/50 px-6 py-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-red-800">Impossible de charger l&apos;échéancier</p>
        <p className="mt-1 text-xs text-red-600">{getApiErrorMessage(error)}</p>
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
  const academicSessionId = sessionId ?? data.sessionId

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <Link
          href="/finances/debiteurs"
          className="inline-flex items-center gap-1 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft size={12} />
          Débiteurs
        </Link>
        <span className="text-zinc-300">·</span>
        <Link href="/finances/suivi-financier" className="hover:text-emerald-700 transition-colors">
          Suivi financier
        </Link>
        <span className="text-zinc-300">·</span>
        <Link href="/finances/paiements" className="hover:text-emerald-700 transition-colors">
          Paiements rapides
        </Link>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Échéancier financier</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Session {data.sessionLabel}
          {' · '}
          {data.billingStartMonth} → {data.billingEndMonth}
        </p>
      </div>

      {lastPaymentId ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-900">
              Paiement enregistré · #{lastPaymentId}
            </p>
          </div>
          <PrintReceiptButton paymentId={lastPaymentId} />
        </div>
      ) : null}

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
            {summary.dueCount + summary.overdueCount > 0
              ? 'Cliquez Payer sur une ligne due ou en retard'
              : summary.totalAmountPaid > 0
                ? `${formatMoney(summary.totalAmountPaid, currency)} encaissés`
                : 'Aucune ligne payable'}
          </p>
        </div>
        <FeesTable
          lines={data.lines}
          currency={currency}
          onPayLine={(line) => {
            setLastPaymentId(null)
            setPayLine(line)
          }}
        />
      </div>

      <StudentPaymentHistory studentId={studentId} />

      <PaymentModal
        open={payLine != null}
        onClose={() => setPayLine(null)}
        studentId={studentId}
        academicSessionId={academicSessionId}
        line={payLine}
        currency={currency}
        onSuccess={(paymentId) => {
          setLastPaymentId(paymentId)
          void refetch()
          void qc.invalidateQueries({ queryKey: ['finance', 'student-payments-detailed', studentId] })
        }}
      />
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
