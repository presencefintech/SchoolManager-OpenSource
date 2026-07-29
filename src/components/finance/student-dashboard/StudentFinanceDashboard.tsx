'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, RefreshCw, ArrowLeft, DollarSign, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { FeesTable } from '@/components/finance/student-dashboard/FeesTable/FeesTable'
import { PaymentModal } from '@/components/finance/student-dashboard/PaymentModal/PaymentModal'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import { StudentPaymentHistory } from '@/components/finance/student-dashboard/StudentPaymentHistory'
import {
  FeeAttributionPanel,
  type FeeAttributionValue,
} from '@/components/finance/fee-attribution-picker'
import {
  FinanceCatalogFeePanel,
  validateManualCatalogPeriod,
  type FinanceCatalogSelection,
} from '@/components/finance/finance-catalog-fee-panel'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { useAdminStudentFeeSchedule } from '@/lib/hooks/use-admin'
import { useStudentFeePeriodStatus } from '@/lib/hooks/use-finance'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  buildContiguousSelectionThrough,
  getSelectableFeeLines,
  selectionTotalAmount,
} from '@/lib/finance/fee-schedule.utils'
import type { FeeScheduleLineDto } from '@/types/finance'
import type { StudentFinanceApi } from '@/components/finance/student-dashboard/StudentPaymentHistory'

export type { StudentFinanceApi }

interface StudentFinanceDashboardProps {
  studentId: number
  sessionId?: number
  /** Source API — défaut finance (comptable). */
  api?: StudentFinanceApi
  /**
   * Affiche encaissement + raccourci « Payer ».
   * Défaut : true pour finance, false pour admin (lecture + lien guichet).
   */
  allowPay?: boolean
  /** Masque le fil d’Ariane finance (utile en embed fiche admin). */
  showNav?: boolean
  /** Titre compact pour embed. */
  compactHeader?: boolean
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
      <Skeleton className="h-80 rounded-xl" />
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

  const [attribution, setAttribution] = useState<FeeAttributionValue | null>(null)
  const [useCatalogFallback, setUseCatalogFallback] = useState(false)
  const [catalog, setCatalog] = useState<FinanceCatalogSelection>({ amount: 0 })
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payMode, setPayMode] = useState<'schedule' | 'catalog'>('schedule')
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const { data: catalogPeriodStatus } = useStudentFeePeriodStatus(
    studentId,
    useCatalogFallback && canPay ? catalog.feeStructureId : undefined,
  )

  function openPaymentModal(nextAttribution: FeeAttributionValue | null) {
    if (!canPay || !nextAttribution || nextAttribution.lines.length === 0) return
    setUseCatalogFallback(false)
    setPayMode('schedule')
    setAttribution(nextAttribution)
    setPayModalOpen(true)
  }

  function openCatalogPaymentModal() {
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
    setAttribution(null)
    setPayMode('catalog')
    setPayModalOpen(true)
  }

  function handleQuickPay(line: FeeScheduleLineDto) {
    if (!canPay || !data) return
    setLastPaymentId(null)
    const lines = buildContiguousSelectionThrough(line, data.lines)
    if (lines.length === 0) return
    openPaymentModal({
      sessionId: data.sessionId,
      lines,
      totalAmount: selectionTotalAmount(lines),
    })
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
  const totalBilled = data.lines.reduce((s, l) => s + Number(l.amount || 0), 0)
  const totalPaid = Number(summary.totalAmountPaid || 0)
  const totalRemaining = Number(summary.totalAmountDue || 0)

  return (
    <div className={className ? `space-y-6 ${className}` : 'space-y-6'}>
      {showNav && api === 'finance' ? (
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
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            className={
              compactHeader
                ? 'text-base font-semibold text-zinc-900'
                : 'text-2xl font-semibold text-zinc-900'
            }
          >
            Échéancier financier
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Session {data.sessionLabel}
            {' · '}
            {data.billingStartMonth} → {data.billingEndMonth}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
          {!canPay && (
            <Link
              href={paymentsHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <ExternalLink size={12} />
              Encaisser
            </Link>
          )}
        </div>
      </div>

      {lastPaymentId ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                Paiement enregistré · #{lastPaymentId}
              </p>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">
                Téléchargez le ticket caisse ou le reçu A4
              </p>
            </div>
          </div>
          <PrintReceiptButton paymentId={lastPaymentId} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total facturé"
          value={formatMoney(totalBilled, currency)}
        />
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
          hint={`${summary.dueCount + summary.overdueCount} ligne${summary.dueCount + summary.overdueCount === 1 ? '' : 's'} due${summary.dueCount + summary.overdueCount === 1 ? '' : 's'} / retard`}
        />
        <SummaryCard
          label="Lignes"
          value={String(summary.lineCount)}
          hint={`${summary.upcomingCount} à venir`}
        />
      </div>

      {canPay ? (
        <div className="rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-50/40 via-white to-emerald-50/30 p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900">Encaissement premium</h3>
                <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  Preuve · partiel · hors échéancier
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Échéancier multi-mois ou paiement hors échéancier (catalogue / montant libre)
              </p>
            </div>
            {!useCatalogFallback && attribution && attribution.lines.length > 0 && (
              <button
                type="button"
                onClick={() => openPaymentModal(attribution)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shrink-0 shadow-sm"
              >
                <DollarSign size={14} />
                Encaisser {formatMoney(attribution.totalAmount, currency)}
              </button>
            )}
            {useCatalogFallback && catalog.amount > 0 && (
              <button
                type="button"
                onClick={openCatalogPaymentModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shrink-0 shadow-sm"
              >
                <DollarSign size={14} />
                Encaisser {formatMoney(catalog.amount, currency)}
              </button>
            )}
          </div>

          {api === 'finance' ? (
            <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useCatalogFallback}
                onChange={(e) => {
                  const on = e.target.checked
                  setUseCatalogFallback(on)
                  setCatalogError(null)
                  if (on) {
                    setAttribution(null)
                  } else {
                    setCatalog({ amount: 0 })
                  }
                }}
                className="rounded border-zinc-300"
              />
              Paiement hors échéancier (barème catalogue ou montant libre)
            </label>
          ) : null}

          {api === 'finance' && useCatalogFallback ? (
            <>
              <FinanceCatalogFeePanel
                studentId={studentId}
                value={catalog}
                onChange={(next) => {
                  setCatalog(next)
                  setCatalogError(null)
                }}
              />
              {catalogError ? (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {catalogError}
                </p>
              ) : null}
            </>
          ) : (
            <FeeAttributionPanel
              api={api}
              studentId={studentId}
              sessionId={sessionId}
              value={attribution}
              onChange={setAttribution}
            />
          )}
        </div>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900">Détail des frais</h3>
          <p className="text-xs text-zinc-400">
            {canPay && getSelectableFeeLines(data.lines).length > 0
              ? 'Colonnes Payé / Reste · raccourci Payer inclut les mois précédents'
              : 'Montant · déjà payé · reste impayé par ligne'}
          </p>
        </div>
        <FeesTable
          lines={data.lines}
          currency={currency}
          onPayLine={canPay ? handleQuickPay : undefined}
        />
        {data.lines.length === 0 && (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
            Aucune ligne d&apos;échéancier pour cette session. Créez une catégorie et un barème sur{' '}
            <span className="font-medium">Admin → Finance → Factures & Frais</span> pour la session{' '}
            {data.sessionLabel}.
          </p>
        )}
      </div>

      <StudentPaymentHistory studentId={studentId} api={api} />

      {canPay ? (
        <PaymentModal
          open={payModalOpen}
          onClose={() => {
            setPayModalOpen(false)
            if (payMode === 'schedule') setAttribution(null)
          }}
          studentId={studentId}
          academicSessionId={academicSessionId}
          selection={payMode === 'schedule' ? attribution : null}
          catalog={payMode === 'catalog' ? catalog : null}
          currency={currency}
          onSuccess={(paymentId) => {
            setLastPaymentId(paymentId)
            setAttribution(null)
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
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'danger'
        ? 'text-red-700'
        : 'text-zinc-900'

  return (
    <div className="rounded-xl border border-zinc-200/60 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  )
}
