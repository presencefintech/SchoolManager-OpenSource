'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentModal } from '@/components/finance/student-dashboard/PaymentModal/PaymentModal'
import { StudentPaymentHistory } from '@/components/finance/student-dashboard/StudentPaymentHistory'
import { UnifiedFeeSchedule } from '@/components/finance/student-dashboard/UnifiedFeeSchedule'
import { CashTicketPanel } from '@/components/finance/student-dashboard/CashTicketPanel'
import type { FeeAttributionValue } from '@/components/finance/fee-attribution-picker'
import {
  validateManualCatalogPeriod,
  type FinanceCatalogSelection,
} from '@/components/finance/finance-catalog-fee-panel'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { useAdminStudentFeeSchedule } from '@/lib/hooks/use-admin'
import { useStudentFeePeriodStatus } from '@/lib/hooks/use-finance'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  feeScheduleLineKey,
  lineRemainingAmount,
  selectAllRemainingMonths,
  selectionTotalAmount,
  toggleContiguousFeeSelection,
  type FeeLineSelection,
} from '@/lib/finance/fee-schedule.utils'
import { clampCollectAmount, scheduleTotals } from '@/lib/finance/fee-schedule-view'
import { cn } from '@/lib/utils'
import type { FeeScheduleLineDto } from '@/types/finance'
import type { StudentFinanceApi } from '@/components/finance/student-dashboard/StudentPaymentHistory'

export type { StudentFinanceApi }

interface StudentFinanceDashboardProps {
  studentId: number
  sessionId?: number
  /** Source API — défaut finance (comptable). */
  api?: StudentFinanceApi
  /**
   * Affiche la sélection et le ticket de caisse.
   * Défaut : true pour finance, false pour admin (lecture + lien guichet).
   */
  allowPay?: boolean
  /** Masque le fil d’Ariane finance (utile en embed fiche admin). */
  showNav?: boolean
  /** Titre compact pour embed. */
  compactHeader?: boolean
  /**
   * split : échéancier à gauche, ticket fixe à droite (≥ lg).
   * stacked : ticket sous l’échéancier (conteneurs étroits, ex. tiroir).
   */
  layout?: 'split' | 'stacked'
  className?: string
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

export function StudentFinanceDashboard({
  studentId,
  sessionId,
  api = 'finance',
  allowPay,
  showNav = true,
  compactHeader = false,
  layout = 'split',
  className,
}: StudentFinanceDashboardProps) {
  const canPay = allowPay ?? api === 'finance'
  const qc = useQueryClient()
  const financeQuery = useStudentFeeSchedule(studentId, sessionId, {
    enabled: api === 'finance',
  })
  const adminQuery = useAdminStudentFeeSchedule(studentId, sessionId, {
    enabled: api === 'admin',
  })
  const { data, isLoading, isError, error, refetch, isFetching } =
    api === 'admin' ? adminQuery : financeQuery

  const [selection, setSelection] = useState<FeeLineSelection[]>([])
  const [useCatalogFallback, setUseCatalogFallback] = useState(false)
  const [catalog, setCatalog] = useState<FinanceCatalogSelection>({ amount: 0 })
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payMode, setPayMode] = useState<'schedule' | 'catalog'>('schedule')
  // Figée à l'ouverture de la modale : la sélection reste éditable derrière sans la modifier.
  const [pendingAttribution, setPendingAttribution] = useState<FeeAttributionValue | null>(null)
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const { data: catalogPeriodStatus } = useStudentFeePeriodStatus(
    studentId,
    useCatalogFallback && canPay ? catalog.feeStructureId : undefined,
  )

  function toggleLine(line: FeeScheduleLineDto) {
    if (!data) return
    setLastPaymentId(null)
    setSelection((current) => toggleContiguousFeeSelection(line, current, data.lines))
  }

  function changeLineAmount(line: FeeScheduleLineDto, raw: string) {
    const key = feeScheduleLineKey(line)
    const amount = clampCollectAmount(raw, lineRemainingAmount(line))
    setSelection((current) =>
      current.map((sel) => (feeScheduleLineKey(sel.line) === key ? { ...sel, amount } : sel)),
    )
  }

  function selectYear(feeStructureId: number) {
    if (!data) return
    setLastPaymentId(null)
    setSelection((current) => selectAllRemainingMonths(feeStructureId, current, data.lines))
  }

  function setCatalogMode(on: boolean) {
    setUseCatalogFallback(on)
    setCatalogError(null)
    if (on) setSelection([])
    else setCatalog({ amount: 0 })
  }

  function openSchedulePayment() {
    if (!canPay || !data || selection.length === 0) return
    setPayMode('schedule')
    setPendingAttribution({
      sessionId: data.sessionId,
      lines: selection,
      totalAmount: selectionTotalAmount(selection),
    })
    setPayModalOpen(true)
  }

  function openCatalogPayment() {
    if (!canPay || catalog.amount <= 0) {
      setCatalogError('Indiquez un montant valide.')
      return
    }
    if (catalog.feeStructureId) {
      const periodError = validateManualCatalogPeriod(catalogPeriodStatus, catalog.monthYear)
      if (periodError) {
        setCatalogError(periodError)
        return
      }
    }
    setCatalogError(null)
    setPendingAttribution(null)
    setPayMode('catalog')
    setPayModalOpen(true)
  }

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
  const paymentsHref = api === 'admin' ? '/admin/finance/paiements' : '/finances/paiements'
  const totals = scheduleTotals(data.lines)
  const totalPaid = Number(summary.totalAmountPaid || 0)
  const totalRemaining = Number(summary.totalAmountDue || 0)
  const dueLines = summary.dueCount + summary.overdueCount
  const split = layout === 'split' && canPay

  return (
    <div className={cn('space-y-6', className)}>
      {showNav && api === 'finance' ? (
        <nav className="flex flex-wrap items-center gap-2 text-xs font-light text-zinc-500">
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
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            className={
              compactHeader
                ? 'text-base font-medium text-zinc-900'
                : 'text-xl sm:text-2xl font-medium tracking-tight text-zinc-900'
            }
          >
            Échéancier financier
          </h2>
          <p className="mt-1 text-sm font-light text-zinc-500 break-words">
            Session {data.sessionLabel}
            {' · '}
            {data.billingStartMonth} → {data.billingEndMonth}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-normal text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
          {!canPay && (
            <Link
              href={paymentsHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <ExternalLink size={12} />
              Encaisser
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total facturé" value={formatMoney(totals.billed, currency)} />
        <SummaryCard
          label="Déjà payé"
          value={formatMoney(totalPaid, currency)}
          tone="success"
          hint={`${summary.paidCount} ligne${summary.paidCount === 1 ? '' : 's'} soldée${summary.paidCount === 1 ? '' : 's'}`}
        />
        <SummaryCard
          label="Reste à payer"
          value={formatMoney(totalRemaining, currency)}
          tone="danger"
          hint={`${dueLines} ligne${dueLines === 1 ? '' : 's'} due${dueLines === 1 ? '' : 's'} / retard`}
        />
        <SummaryCard label="Lignes" value={String(summary.lineCount)} hint={`${summary.upcomingCount} à venir`} />
      </div>

      <div className={cn('grid gap-6', split && 'lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start')}>
        <section className="min-w-0 space-y-3">
          <h3 className="text-sm font-medium text-zinc-900">Échéancier</h3>
          <UnifiedFeeSchedule
            lines={data.lines}
            currency={currency}
            selection={canPay && !useCatalogFallback ? selection : null}
            onToggle={toggleLine}
            onAmountChange={changeLineAmount}
            onSelectYear={selectYear}
          />
          {data.lines.length === 0 && (
            <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs font-light text-amber-900">
              Créez une catégorie et un barème sur{' '}
              <span className="font-medium">Admin → Finance → Factures & Frais</span> pour la session{' '}
              {data.sessionLabel}.
            </p>
          )}
        </section>

        {canPay ? (
          <CashTicketPanel
            className={cn(split && 'lg:sticky lg:top-6')}
            studentId={studentId}
            currency={currency}
            selection={selection}
            totalAmount={selectionTotalAmount(selection)}
            onClear={() => setSelection([])}
            onCollect={openSchedulePayment}
            catalogMode={api === 'finance' ? useCatalogFallback : null}
            onCatalogModeChange={setCatalogMode}
            catalog={catalog}
            onCatalogChange={(next) => {
              setCatalog(next)
              setCatalogError(null)
            }}
            catalogError={catalogError}
            onCollectCatalog={openCatalogPayment}
            lastPaymentId={lastPaymentId}
          />
        ) : null}
      </div>

      <StudentPaymentHistory studentId={studentId} api={api} />

      {canPay ? (
        <PaymentModal
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          studentId={studentId}
          academicSessionId={academicSessionId}
          selection={payMode === 'schedule' ? pendingAttribution : null}
          catalog={payMode === 'catalog' ? catalog : null}
          currency={currency}
          onSuccess={(paymentId) => {
            setLastPaymentId(paymentId)
            setSelection([])
            setPendingAttribution(null)
            setCatalog({ amount: 0 })
            setUseCatalogFallback(false)
            void refetch()
            void qc.invalidateQueries({
              queryKey: ['finance', 'student-payments-detailed', studentId],
            })
            void qc.invalidateQueries({
              queryKey: ['admin', 'finance', 'student-payments-detailed', studentId],
            })
            void qc.invalidateQueries({ queryKey: ['finance', 'student-payments', studentId] })
            void qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
            void qc.invalidateQueries({ queryKey: ['finance', 'student', studentId, 'wallet'] })
          }}
        />
      ) : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'danger'
  hint?: string
}) {
  const toneClass =
    tone === 'success' ? 'text-emerald-700' : tone === 'danger' ? 'text-rose-700' : 'text-zinc-900'

  return (
    <div className="rounded-xl border border-zinc-200/70 bg-white px-5 py-4">
      <p className="text-[11px] font-light uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={cn('mt-1.5 font-mono text-lg tabular-nums tracking-tight', toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] font-light text-zinc-400">{hint}</p> : null}
    </div>
  )
}
