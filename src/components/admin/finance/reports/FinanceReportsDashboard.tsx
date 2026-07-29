'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion, type Variants } from 'framer-motion'
import {
  BarChart3,
  Banknote,
  CalendarRange,
  Download,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useCreateExchangeRate,
  useFinanceAggregateReport,
  useFinanceCurrencyConfig,
  useFinanceExchangeRates,
  useSchoolBranding,
} from '@/lib/hooks/use-admin'
import { financeApi } from '@/lib/admin/api/finance.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatPaymentMethodLabel } from '@/lib/admin/finance-dashboard.utils'
import {
  REPORT_PERIOD_OPTIONS,
  barShare,
  downloadJson,
  formatExchangeRateSource,
} from '@/lib/admin/finance-reporting.utils'
import { formatMoney } from '@/lib/finance/currency'
import { useToast } from '@/providers/toast-provider'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import type { ReportPeriodCode } from '@/types/finance-reporting'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
} satisfies Variants

function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-white/95 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100',
        className,
      )}
    >
      {children}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  tone?: 'emerald' | 'sky' | 'violet'
}) {
  const styles = {
    emerald: {
      wrap: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/80',
      icon: 'bg-emerald-500/15 text-emerald-700',
      value: 'text-emerald-950',
    },
    sky: {
      wrap: 'border-sky-100 bg-gradient-to-br from-sky-50 to-white',
      icon: 'bg-sky-500/15 text-sky-700',
      value: 'text-sky-950',
    },
    violet: {
      wrap: 'border-violet-100 bg-gradient-to-br from-violet-50 to-white',
      icon: 'bg-violet-500/15 text-violet-700',
      value: 'text-violet-950',
    },
  }[tone]

  return (
    <div className={cn('rounded-2xl border p-5', styles.wrap)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          <p className={cn('mt-2 text-2xl font-bold tabular-nums tracking-tight', styles.value)}>{value}</p>
          {sub ? <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{sub}</p> : null}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', styles.icon)}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function BreakdownBars({
  title,
  icon: Icon,
  rows,
  formatValue,
  emptyLabel,
}: {
  title: string
  icon: React.ElementType
  rows: Array<{ key: string; label: string; amount: number; count: number }>
  formatValue: (n: number) => string
  emptyLabel: string
}) {
  const total = rows.reduce((acc, r) => acc + r.amount, 0)

  return (
    <Panel>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={15} />
        </div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{emptyLabel}</p>
        ) : (
          rows.map((row) => (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-700 truncate">{row.label}</span>
                <span className="shrink-0 tabular-nums text-slate-900">
                  {formatValue(row.amount)}
                  <span className="ml-1 text-xs text-slate-400">({row.count})</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${barShare(row.amount, total)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  )
}

function ExchangeRateForm({
  defaultRate,
  displayCurrency,
  onSubmit,
  isPending,
}: {
  defaultRate: number
  displayCurrency: string
  onSubmit: (rate: number, notes?: string) => void
  isPending: boolean
}) {
  const [rate, setRate] = useState(String(defaultRate || ''))
  const [notes, setNotes] = useState('')

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        const parsed = Number(rate.replace(/\s/g, '').replace(',', '.'))
        if (!Number.isFinite(parsed) || parsed <= 0) return
        onSubmit(parsed, notes.trim() || undefined)
        setNotes('')
      }}
    >
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Nouveau taux USD → {displayCurrency}</span>
        <input
          type="text"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="2850"
          required
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Note audit (optionnel)</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          placeholder="Ex. taux BCC janvier 2026"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? 'Enregistrement…' : 'Publier le taux'}
      </button>
    </form>
  )
}

export function FinanceReportsDashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const { data: branding } = useSchoolBranding()

  const [period, setPeriod] = useState<ReportPeriodCode>('M')
  const [anchor, setAnchor] = useState(format(new Date(), 'yyyy-MM-dd'))

  const reportQuery = useFinanceAggregateReport({ period, anchor })
  const currencyQuery = useFinanceCurrencyConfig()
  const ratesQuery = useFinanceExchangeRates()
  const createRate = useCreateExchangeRate()

  const report = reportQuery.data
  const currency = currencyQuery.data
  const displayCurrency = (report?.metrics.displayCurrency ?? currency?.displayCurrency ?? 'CDF') as 'USD' | 'CDF'

  const methodRows = useMemo(() => {
    if (!report) return []
    return Object.entries(report.metrics.byMethod)
      .map(([key, row]) => ({
        key,
        label: formatPaymentMethodLabel(key),
        amount: Number(row.amountDisplay),
        count: row.count,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [report])

  const feeRows = useMemo(() => {
    if (!report) return []
    return Object.entries(report.metrics.byFeeCategory)
      .map(([key, row]) => ({
        key,
        label: key,
        amount: Number(row.amountBase),
        count: row.count,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [report])

  const persistSnapshot = useMutation({
    mutationFn: () => financeApi.getAggregateReport({ period, anchor, persist: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'finance', 'aggregate-report'] })
      toast.success('Snapshot figé', 'Ce rapport ne changera plus, même si le taux évolue.')
    },
    onError: (err) => toast.error('Impossible de figer', getApiErrorMessage(err)),
  })

  const exportAi = useMutation({
    mutationFn: () => {
      const to = anchor
      const fromDate = new Date(`${anchor}T12:00:00`)
      fromDate.setMonth(fromDate.getMonth() - 3)
      return financeApi.exportAiDataset({
        from: format(fromDate, 'yyyy-MM-dd'),
        to,
        granularity: 'DAILY',
      })
    },
    onSuccess: (data) => {
      downloadJson(`presencefintech-ai-${anchor}.json`, data)
      toast.success('Export prêt', 'Dataset IA téléchargé (3 mois glissants).')
    },
    onError: (err) => toast.error('Export impossible', getApiErrorMessage(err)),
  })

  const periodLabel = REPORT_PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-6 py-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
              {branding?.name ? `${branding.name} · Reporting` : 'Reporting financier'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Rapports financiers</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300 leading-relaxed">
              Base comptable <strong className="text-white">USD</strong> · affichage{' '}
              <strong className="text-white">{displayCurrency}</strong> · snapshots auditables multi-échelles
            </p>
          </div>
          {currency ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                Taux actuel : {currency.legacyRate.toLocaleString('fr-FR')} {displayCurrency}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                Tolérance ±{(currency.exchangeToleranceBps / 100).toFixed(2)} %
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filtres */}
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Granularité</p>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                    period === p.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                  title={p.label}
                >
                  {p.short}
                  <span className="hidden sm:inline ml-1 font-normal opacity-80">· {p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Date de référence</span>
              <input
                type="date"
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <button
              type="button"
              onClick={() => reportQuery.refetch()}
              disabled={reportQuery.isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(reportQuery.isFetching && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        </div>
      </Panel>

      {/* Erreur */}
      {reportQuery.isError ? (
        <Panel className="border-red-200 bg-red-50/50 p-5 text-sm text-red-800">
          Impossible de charger le rapport. {getApiErrorMessage(reportQuery.error)}
        </Panel>
      ) : null}

      {/* KPIs */}
      {reportQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : report ? (
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                report.fromCache
                  ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                  : 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',
              )}
            >
              {report.fromCache ? <Lock size={11} /> : <Zap size={11} />}
              {report.fromCache ? 'Snapshot figé' : 'Calcul live'}
            </span>
            <span className="text-xs text-slate-500">
              {periodLabel} · clé <code className="font-mono text-slate-700">{report.periodKey}</code>
            </span>
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Encaissements"
              value={formatMoney(Number(report.metrics.totalAmountDisplay), displayCurrency)}
              sub={`${report.metrics.transactionCount} opération(s) · ${formatMoney(Number(report.metrics.totalAmountBase), 'USD')} base USD`}
              icon={Banknote}
              tone="emerald"
            />
            <KpiCard
              label="Période analysée"
              value={report.periodKey}
              sub={`${format(new Date(report.periodStart), 'd MMM yyyy', { locale: fr })} → ${format(new Date(report.periodEnd), 'd MMM yyyy', { locale: fr })}`}
              icon={CalendarRange}
              tone="sky"
            />
            <KpiCard
              label="Taux de conversion"
              value={`${Number(report.exchangeRate.rate).toLocaleString('fr-FR')}`}
              sub={`1 ${report.exchangeRate.fromCurrency} = ${Number(report.exchangeRate.rate).toLocaleString('fr-FR')} ${report.exchangeRate.toCurrency} · ${formatExchangeRateSource(report.exchangeRate.source)}`}
              icon={TrendingUp}
              tone="violet"
            />
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
            <BreakdownBars
              title="Répartition par mode de paiement"
              icon={BarChart3}
              rows={methodRows}
              formatValue={(n) => formatMoney(n, displayCurrency)}
              emptyLabel="Aucun encaissement sur cette période."
            />
            <BreakdownBars
              title="Répartition par type de frais"
              icon={Sparkles}
              rows={feeRows}
              formatValue={(n) => formatMoney(n, 'USD')}
              emptyLabel="Aucune ligne de frais associée."
            />
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            {isAdmin ? (
              <button
                type="button"
                disabled={persistSnapshot.isPending}
                onClick={() => persistSnapshot.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <Lock size={15} />
                Figer ce rapport
              </button>
            ) : null}
            <button
              type="button"
              disabled={exportAi.isPending}
              onClick={() => exportAi.mutate()}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
            >
              <Download size={15} />
              Export dataset IA
            </button>
          </motion.div>
        </motion.div>
      ) : null}

      {/* Taux de change */}
      <Panel>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Politique de change & audit</h2>
          <p className="mt-1 text-xs text-slate-500">
            Historique immuable — chaque taux publié est conservé pour traçabilité multi-écoles RDC.
          </p>
        </div>
        <div className="space-y-5 p-5">
          {isAdmin && currency ? (
            <ExchangeRateForm
              defaultRate={currency.legacyRate}
              displayCurrency={currency.displayCurrency}
              isPending={createRate.isPending}
              onSubmit={(rate, notes) =>
                createRate.mutate({
                  rate,
                  toCurrency: currency.displayCurrency,
                  notes,
                  syncLegacyField: true,
                })
              }
            />
          ) : (
            <p className="text-xs text-slate-500 rounded-xl bg-slate-50 px-3 py-2">
              Seuls les administrateurs peuvent publier un nouveau taux officiel.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Date effective</th>
                  <th className="px-4 py-3 font-semibold">Taux</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {ratesQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Chargement…
                    </td>
                  </tr>
                ) : (ratesQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Aucun taux historisé — le système utilise le paramètre école (
                      {currency?.legacyRate.toLocaleString('fr-FR')} {displayCurrency}).
                    </td>
                  </tr>
                ) : (
                  (ratesQuery.data ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {format(new Date(row.effectiveAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900">
                        1 {row.fromCurrency} = {Number(row.rate).toLocaleString('fr-FR')} {row.toCurrency}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {formatExchangeRateSource(row.source)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                        {row.notes ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  )
}
