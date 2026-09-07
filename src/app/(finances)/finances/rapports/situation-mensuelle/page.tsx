'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Printer, RefreshCw, ArrowLeft, AlertTriangle, FileText, Info, Wallet, Download } from 'lucide-react'
import { useMonthlySituationReport } from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { downloadBlob, printPdfBlob } from '@/lib/finance/download-blob'
import { ExpenseLinesForm } from '@/components/finance/expense-lines-form'
import type {
  DataBadge,
  KpiMetric,
  ManagementAlert,
  MonthlySituationReport,
  SituationLine,
  VarianceLine,
} from '@/types/finance'

/** Période RDC type promoteur : 26 du mois précédent → 25 du mois courant. */
function defaultRdcPeriod(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const fromDate = new Date(y, m - 1, 26)
  const toDate = new Date(y, m, 25)
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const reportMonth = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}`
  return { from: iso(fromDate), to: iso(toDate), reportMonth }
}

function formatAmount(amount: number | null | undefined, currency: string): string {
  if (amount == null) return 'Non enregistré'
  return formatMoney(amount, currency)
}

function formatIsoFr(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function formatMonthFr(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function isDevNote(note?: string): boolean {
  if (!note) return false
  return /prisma|paymentfee|posted|feestructure|monthyear|affectscash|expense |catalog_estimate|érudits|ledgerjson|cashmovement|feesbalance|proxy dettes/i.test(
    note,
  )
}

function alertCopy(a: ManagementAlert): { title: string; message: string } {
  const fallback: Record<string, { title: string; message: string }> = {
    OPEX_UNTRACKED: {
      title: 'Charges du mois non encore saisies',
      message:
        'Aucune dépense n’a été enregistrée sur cette période. Les salaires, le fonctionnement et les taxes n’apparaissent donc pas. Saisissez-les dans Dépenses pour compléter le rapport.',
    },
    COLLECTION_LOW: {
      title: 'Peu de frais du mois ont été encaissés',
      message: a.message
        .replace(/\(données[^)]*\)/gi, '')
        .replace(/catalogue mensuel/gi, 'frais scolaires du mois')
        .trim(),
    },
    ARREARS_DOMINANT: {
      title: 'On encaisse surtout des arriérés',
      message: a.message.replace(/PaymentFee|monthYear/gi, '').trim(),
    },
    LIQUIDITY_LOW: {
      title: 'Peu d’argent en caisse face aux impayés',
      message: a.message.replace(/Caisse \/ créances/gi, 'La caisse couvre').trim(),
    },
    CASH_RECON_MISMATCH: {
      title: 'La caisse ne correspond pas aux flux enregistrés',
      message:
        'Le solde en tiroir ne correspond pas aux encaissements et sorties enregistrés. Vérifier le fond d’ouverture, les encaissements, les dépenses payées en caisse et les versements banque avant de viser.',
    },
  }
  if (fallback[a.code] && (isDevNote(a.title) || isDevNote(a.message))) {
    return fallback[a.code]
  }
  return { title: a.title, message: a.message }
}

function displayTitle(apiTitle: string, monthLabel: string): string {
  const month = monthLabel.toUpperCase()
  if (/SITUATION FINANCIÈRE/i.test(apiTitle) && !/SYNTHÈSE/i.test(apiTitle)) return apiTitle
  return `SITUATION FINANCIÈRE ${month}`
}

const HIDE_ZERO_KEYS = new Set([
  'real_staff',
  'real_operating',
  'real_advance',
  'expected_operating',
  'credit_operating',
])

function visibleLines(lines: SituationLine[]): SituationLine[] {
  return lines.filter((l) => {
    if (l.amount === 0 && HIDE_ZERO_KEYS.has(l.key)) return false
    return true
  })
}

function visibleVariance(lines: VarianceLine[]): VarianceLine[] {
  return lines.filter((l) => {
    if (l.key === 'var_operating' && (l.expected ?? 0) === 0 && (l.actual ?? 0) === 0) return false
    if (l.key === 'var_tuition_advance' && (l.actual ?? 0) === 0 && l.expected == null) return false
    if (l.key === 'var_opex' && l.actual == null && l.expected == null) return false
    return true
  })
}

function formatRatio(value: number | null, unit: KpiMetric['unit'], currency?: string): string {
  if (value == null || unit === 'unavailable') return '—'
  if (unit === 'ratio') return `${(value * 100).toFixed(1)} %`
  if (unit === 'percent') return `${value.toFixed(1)} %`
  if (unit === 'currency') return formatMoney(value, currency ?? 'USD')
  return String(value)
}

function formatSignedMoney(amount: number | null, currency: string): string {
  if (amount == null) return '—'
  const abs = formatMoney(Math.abs(amount), currency)
  if (amount > 0) return `+${abs}`
  if (amount < 0) return `−${formatMoney(Math.abs(amount), currency)}`
  return abs
}

function ProvenanceBadge({ badge }: { badge?: DataBadge }) {
  if (!badge) return null
  const map: Record<DataBadge, { label: string; className: string } | null> = {
    prisma_certified: null,
    catalog_estimate: {
      label: 'Estimé',
      className: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    untracked: {
      label: 'Non enregistré',
      className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    },
    manual_entry: {
      label: 'Journal caisse',
      className: 'bg-sky-50 text-sky-900 border-sky-200',
    },
  }
  const cfg = map[badge]
  if (!cfg) return null
  return (
    <span
      className={cn(
        'inline-block rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  )
}

function kpiStatusClass(status: KpiMetric['status']): string {
  switch (status) {
    case 'alert':
      return 'border-red-300 bg-red-50 text-red-900'
    case 'watch':
      return 'border-amber-300 bg-amber-50 text-amber-950'
    case 'unavailable':
      return 'border-zinc-200 bg-zinc-50 text-zinc-600'
    default:
      return 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
  }
}

function alertClass(severity: ManagementAlert['severity']): string {
  switch (severity) {
    case 'critique':
      return 'border-red-400 bg-red-50 text-red-950'
    case 'attention':
      return 'border-amber-400 bg-amber-50 text-amber-950'
    default:
      return 'border-slate-300 bg-slate-50 text-slate-800'
  }
}

function LineRows({ lines, currency }: { lines: SituationLine[]; currency: string }) {
  const shown = visibleLines(lines)
  return (
    <table className="msr-table w-full text-sm">
      <tbody>
        {shown.map((l) => (
          <tr key={l.key}>
            <td className="align-top">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-800">{l.label}</span>
                <ProvenanceBadge badge={l.badge} />
              </div>
              {l.note && !isDevNote(l.note) ? <p className="msr-note mt-0.5">{l.note}</p> : null}
            </td>
            <td
              className={cn(
                'text-right font-semibold tabular-nums whitespace-nowrap',
                l.amount == null && 'text-zinc-400 italic font-medium',
              )}
            >
              {formatAmount(l.amount, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Section({
  n,
  title,
  children,
  total,
  currency,
  badge,
}: {
  n: number | string
  title: string
  children: React.ReactNode
  total?: number | null
  currency?: string
  badge?: DataBadge
}) {
  return (
    <section className="msr-section break-inside-avoid">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h2 className="msr-section-title !mb-0">
          {n}. {title}
        </h2>
        <ProvenanceBadge badge={badge} />
      </div>
      {children}
      {total !== undefined && currency ? (
        <p className="msr-total">
          <span>TOTAL</span>
          <span
            className={cn(
              'tabular-nums',
              total == null && 'text-zinc-400 italic font-medium',
            )}
          >
            {formatAmount(total, currency)}
          </span>
        </p>
      ) : null}
    </section>
  )
}

function VarianceTable({ lines, currency }: { lines: VarianceLine[]; currency: string }) {
  const shown = visibleVariance(lines)
  return (
    <div className="overflow-x-auto">
      <table className="msr-table msr-table-zebra w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Poste</th>
            <th className="text-right">Attendu</th>
            <th className="text-right">Réel</th>
            <th className="text-right">Variance</th>
            <th className="text-right">Var. %</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((l) => (
            <tr key={l.key}>
              <td>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-zinc-900">{l.label}</span>
                  <ProvenanceBadge badge={l.badgeActual} />
                </div>
                {l.note && !isDevNote(l.note) ? <p className="msr-note mt-0.5">{l.note}</p> : null}
              </td>
              <td
                className={cn(
                  'text-right tabular-nums whitespace-nowrap',
                  l.expected == null && 'text-zinc-400 italic',
                )}
              >
                {formatAmount(l.expected, currency)}
              </td>
              <td
                className={cn(
                  'text-right tabular-nums whitespace-nowrap font-semibold',
                  l.actual == null && 'text-zinc-400 italic font-medium',
                )}
              >
                {formatAmount(l.actual, currency)}
              </td>
              <td
                className={cn(
                  'text-right tabular-nums whitespace-nowrap font-semibold',
                  l.varianceAmount != null && l.varianceAmount < 0 && 'text-red-700',
                  l.varianceAmount != null && l.varianceAmount > 0 && 'text-emerald-700',
                )}
              >
                {formatSignedMoney(l.varianceAmount, currency)}
              </td>
              <td
                className={cn(
                  'text-right tabular-nums whitespace-nowrap',
                  l.variancePercent != null && l.variancePercent < 0 && 'text-red-700',
                  l.variancePercent != null && l.variancePercent > 0 && 'text-emerald-700',
                )}
              >
                {l.variancePercent != null
                  ? `${l.variancePercent > 0 ? '+' : ''}${l.variancePercent.toFixed(1)} %`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BriefBox({ data, currency }: { data: MonthlySituationReport; currency: string }) {
  const other = data.actualRevenue.lines.find((l) => l.key === 'real_other')?.amount ?? 0
  const month = data.arrearsRisk.monthFees
  const arrears = data.arrearsRisk.arrearsFees
  const collected = data.actualRevenue.collectedTotal
  const opex = data.operationalExpenses.total
  const cash = data.cashBalance.closingBalance
  const gap = data.cashReconciliation.gap
  const receivables = data.credits.totalOutstanding

  const bullets: string[] = [
    `Recettes encaissées : ${formatMoney(collected, currency)} (hors fond d’ouverture).`,
  ]
  if (other > 0 && collected > 0 && other / collected >= 0.3) {
    bullets.push(
      `Dont ${formatMoney(other, currency)} non classés comme frais du mois (minerval, techniques ou paiements sans mois). Frais du mois : ${formatMoney(month, currency)} · arriérés : ${formatMoney(arrears, currency)}.`,
    )
  } else {
    bullets.push(
      `Frais du mois : ${formatMoney(month, currency)} · arriérés : ${formatMoney(arrears, currency)}.`,
    )
  }
  if (opex == null) {
    bullets.push('Les dépenses (salaires, fonctionnement, taxes) n’ont pas encore été saisies.')
  } else {
    bullets.push(`Dépenses enregistrées : ${formatMoney(opex, currency)}.`)
  }
  bullets.push(
    cash == null
      ? 'Solde de caisse inconnu (aucune session clôturée).'
      : `Solde en caisse : ${formatAmount(cash, currency)}.`,
  )
  if (data.cashReconciliation.status === 'mismatch' && gap != null) {
    bullets.push(
      `La caisse ne correspond pas aux flux enregistrés (écart ${formatSignedMoney(gap, currency)}). Le visa n’est pas recommandé tant que l’écart n’est pas expliqué.`,
    )
  }
  bullets.push(`Créances élèves encore dues : ${formatMoney(receivables, currency)}.`)
  bullets.push(
    `${data.headcount.studentsPrivate} élève(s) inscrits · ${data.headcount.teachers} enseignant(s).`,
  )

  return (
    <section className="msr-section break-inside-avoid">
      <h2 className="msr-section-title">En bref</h2>
      <ul className="msr-brief">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </section>
  )
}

export default function SituationMensuellePage() {
  const defaults = useMemo(() => defaultRdcPeriod(), [])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [reportMonth, setReportMonth] = useState(defaults.reportMonth)
  const [applied, setApplied] = useState(defaults)

  const { data, isLoading, isFetching, isError, refetch, error } = useMonthlySituationReport(applied)
  const [exportBusy, setExportBusy] = useState<'pdf' | 'print' | 'xlsx' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const currency = data?.school.currency ?? 'USD'
  const editedAt = data
    ? new Date(data.generatedAt).toLocaleString('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : ''

  async function fetchPdfBlob(): Promise<{ blob: Blob; filename: string }> {
    const blob = await financeRoleApi.exportMonthlySituationPdf(applied)
    const month = applied.reportMonth.replace('-', '')
    const filename = `situation-financiere-${month}.pdf`
    return { blob, filename }
  }

  async function handleDownloadPdf() {
    if (!data) return
    setExportError(null)
    setExportBusy('pdf')
    try {
      const { blob, filename } = await fetchPdfBlob()
      downloadBlob(blob, filename)
    } catch (err) {
      setExportError(getApiErrorMessage(err))
    } finally {
      setExportBusy(null)
    }
  }

  async function handleDownloadXlsx() {
    if (!data) return
    setExportError(null)
    setExportBusy('xlsx')
    try {
      const { blob, filename } = await financeRoleApi.exportMonthlySituationXlsx(applied)
      downloadBlob(blob, filename)
    } catch (err) {
      setExportError(getApiErrorMessage(err))
    } finally {
      setExportBusy(null)
    }
  }

  async function handlePrintPdf() {
    if (!data) return
    setExportError(null)
    setExportBusy('print')
    try {
      const { blob } = await fetchPdfBlob()
      await printPdfBlob(blob)
    } catch (err) {
      setExportError(getApiErrorMessage(err))
    } finally {
      setExportBusy(null)
    }
  }

  return (
    <FinancePageShell>
      <div className="print:hidden">
        <FinancePageHeader
          title="Situation financière mensuelle"
          subtitle="Document pour le conseil d’administration et le promoteur"
          actions={
            <>
              <Link
                href="/finances/caisse"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <ArrowLeft size={14} /> Caisse
              </Link>
              <Link
                href="/finances/depenses"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <Wallet size={14} /> Dépenses
              </Link>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                Actualiser
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={!data || exportBusy != null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                <Download size={14} className={exportBusy === 'pdf' ? 'animate-pulse' : ''} />
                {exportBusy === 'pdf' ? 'PDF…' : 'PDF'}
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadXlsx()}
                disabled={!data || exportBusy != null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                <Download size={14} className={exportBusy === 'xlsx' ? 'animate-pulse' : ''} />
                {exportBusy === 'xlsx' ? 'Excel…' : 'Excel'}
              </button>
              <button
                type="button"
                onClick={() => void handlePrintPdf()}
                disabled={!data || exportBusy != null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                <Printer size={14} className={exportBusy === 'print' ? 'animate-pulse' : ''} />
                {exportBusy === 'print' ? 'Préparation…' : 'Imprimer'}
              </button>
            </>
          }
        />

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 mb-6 flex flex-wrap items-end gap-3" lang="fr">
          <label className="text-xs font-medium text-zinc-500">
            Du
            <input
              type="date"
              lang="fr"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] font-normal text-zinc-400">{formatIsoFr(from)}</span>
          </label>
          <label className="text-xs font-medium text-zinc-500">
            Au
            <input
              type="date"
              lang="fr"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] font-normal text-zinc-400">{formatIsoFr(to)}</span>
          </label>
          <label className="text-xs font-medium text-zinc-500">
            Mois des frais scolaires
            <input
              type="month"
              lang="fr"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] font-normal text-zinc-400">
              {formatMonthFr(reportMonth)}
            </span>
          </label>
          <button
            type="button"
            onClick={() => setApplied({ from, to, reportMonth })}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Générer
          </button>
          <p className="w-full text-[11px] text-zinc-400">
            Période habituelle RDC : du 26 du mois précédent au 25 du mois en cours.
          </p>
          {exportError ? (
            <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {exportError}
            </p>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-400 animate-pulse">Génération du rapport…</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de générer le rapport. {getApiErrorMessage(error)}
        </div>
      ) : data ? (
        <article className="msr-sheet mx-auto">
          <header className="msr-header">
            <p className="msr-eyebrow">Document pour le conseil d’administration</p>
            <h1 className="msr-school">{data.school.name}</h1>
            {data.school.city ? <p className="msr-meta">{data.school.city}</p> : null}
            <p className="msr-title">{displayTitle(data.period.title, data.period.reportMonthLabel)}</p>
            <p className="msr-meta">
              Période du {formatIsoFr(data.period.from)} au {formatIsoFr(data.period.to)} · Mois des
              frais {data.period.reportMonthLabel}
            </p>
            <p className="msr-meta">Destinataires : {data.document.audience}</p>
          </header>

          <BriefBox data={data} currency={currency} />

          {data.alerts.length > 0 ? (
            <section className="msr-section break-inside-avoid space-y-2">
              <h2 className="msr-section-title">Alertes de gestion</h2>
              {data.alerts.map((a) => {
                const copy = alertCopy(a)
                return (
                <div
                  key={a.code}
                  className={cn('rounded-md border px-3 py-2.5 text-sm', alertClass(a.severity))}
                >
                  <p className="font-bold flex items-start gap-1.5 flex-wrap">
                    {a.severity === 'info' ? (
                      <Info size={14} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    )}
                    <span className="flex-1">{copy.title}</span>
                    {a.blocking ? (
                      <span className="rounded bg-red-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Visa non recommandé
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 leading-relaxed">{copy.message}</p>
                </div>
                )
              })}
            </section>
          ) : null}

          <section className="msr-section break-inside-avoid">
            <h2 className="msr-section-title">Indicateurs de santé financière</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                data.kpis.burnRate,
                data.kpis.liquidityRatio,
                data.kpis.collectionEfficiency,
                data.kpis.revenuePerStudent,
              ] as KpiMetric[]).map((kpi) => (
                <div
                  key={kpi.key}
                  className={cn('rounded-md border px-3 py-3', kpiStatusClass(kpi.status))}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                      {kpi.label}
                    </p>
                    <ProvenanceBadge badge={kpi.badge} />
                  </div>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatRatio(kpi.value, kpi.unit, currency)}
                  </p>
                  {kpi.note && !isDevNote(kpi.note) ? (
                    <p className="msr-note mt-2">{kpi.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="msr-section break-inside-avoid">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="msr-section-title !mb-0">Risque arriérés / anticipatifs</h2>
              <ProvenanceBadge badge={data.arrearsRisk.badge} />
            </div>
            <table className="msr-table msr-table-zebra w-full text-sm">
              <tbody>
                <tr>
                  <td>Frais du mois</td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatMoney(data.arrearsRisk.monthFees, currency)}
                  </td>
                </tr>
                <tr>
                  <td>Frais antérieurs</td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatMoney(data.arrearsRisk.arrearsFees, currency)}
                  </td>
                </tr>
                <tr>
                  <td>Frais anticipatifs</td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatMoney(data.arrearsRisk.advanceFees, currency)}
                  </td>
                </tr>
                <tr>
                  <td>Poids des arriérés et avances</td>
                  <td className="text-right tabular-nums font-semibold">
                    {data.arrearsRisk.weightVsMonth != null
                      ? `${data.arrearsRisk.weightVsMonth.toFixed(2)}×`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Part arriérés / scolarité encaissée</td>
                  <td className="text-right tabular-nums">
                    {data.arrearsRisk.arrearsShareOfTuition != null
                      ? `${(data.arrearsRisk.arrearsShareOfTuition * 100).toFixed(1)} %`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Part anticipatifs / scolarité encaissée</td>
                  <td className="text-right tabular-nums">
                    {data.arrearsRisk.advanceShareOfTuition != null
                      ? `${(data.arrearsRisk.advanceShareOfTuition * 100).toFixed(1)} %`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
            {data.arrearsRisk.note && !isDevNote(data.arrearsRisk.note) ? (
              <p className="msr-note mt-2">{data.arrearsRisk.note}</p>
            ) : null}
          </section>

          <section className="msr-section break-inside-avoid">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="msr-section-title !mb-0">Rapprochement de trésorerie</h2>
              <ProvenanceBadge badge={data.cashReconciliation.badge} />
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  data.cashReconciliation.status === 'balanced' &&
                    'border-emerald-300 bg-emerald-50 text-emerald-800',
                  data.cashReconciliation.status === 'mismatch' &&
                    'border-red-400 bg-red-50 text-red-800',
                  data.cashReconciliation.status === 'incomplete' &&
                    'border-zinc-300 bg-zinc-50 text-zinc-600',
                )}
              >
                {data.cashReconciliation.status === 'balanced'
                  ? 'Équilibré'
                  : data.cashReconciliation.status === 'mismatch'
                    ? 'Écart'
                    : 'Incomplet'}
              </span>
            </div>
            <p className="msr-note mb-2">
              {/affectsCash|Report \+|PaymentFee/i.test(data.cashReconciliation.equation)
                ? 'Ce que la caisse devrait contenir, d’après les encaissements et les sorties enregistrés.'
                : data.cashReconciliation.equation}
            </p>
            <table className="msr-table msr-table-zebra w-full text-sm">
              <tbody>
                <tr>
                  <td>Report caisse</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(data.cashReconciliation.openingCarry, currency)}
                  </td>
                </tr>
                <tr>
                  <td>+ Recettes réelles</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(data.cashReconciliation.collectedRevenue, currency)}
                  </td>
                </tr>
                <tr>
                  <td>+ Renflouements</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(data.cashReconciliation.renflouements, currency)}
                  </td>
                </tr>
                <tr>
                  <td>− Dépenses payées en caisse</td>
                  <td
                    className={cn(
                      'text-right tabular-nums',
                      data.cashReconciliation.expensesCashImpact == null && 'text-zinc-400 italic',
                    )}
                  >
                    {formatAmount(data.cashReconciliation.expensesCashImpact, currency)}
                  </td>
                </tr>
                <tr>
                  <td>− Versements banque</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(data.cashReconciliation.bankDeposits, currency)}
                  </td>
                </tr>
                <tr>
                  <td>− Retraits trésorerie</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(data.cashReconciliation.treasuryWithdrawals, currency)}
                  </td>
                </tr>
                <tr>
                  <td>= Solde théorique</td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatAmount(data.cashReconciliation.expectedClosing, currency)}
                  </td>
                </tr>
                <tr>
                  <td>Solde caisse réel</td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatAmount(data.cashReconciliation.actualClosing, currency)}
                  </td>
                </tr>
                <tr>
                  <td>Écart (réel − théorique)</td>
                  <td
                    className={cn(
                      'text-right tabular-nums font-bold',
                      data.cashReconciliation.blocking && 'text-red-700',
                    )}
                  >
                    {formatSignedMoney(data.cashReconciliation.gap, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
            {data.cashReconciliation.note && !isDevNote(data.cashReconciliation.note) ? (
              <p className="msr-note mt-2">{data.cashReconciliation.note}</p>
            ) : null}
          </section>

          <Section n={1} title="Effectifs" badge={data.headcount.badge}>
            <table className="msr-table msr-table-zebra w-full text-sm">
              <tbody>
                <tr>
                  <td>Élèves inscrits</td>
                  <td className="text-right font-semibold tabular-nums">
                    {data.headcount.studentsPrivate}
                  </td>
                </tr>
                <tr>
                  <td>Enseignants actifs</td>
                  <td className="text-right font-semibold tabular-nums">
                    {data.headcount.teachers}
                  </td>
                </tr>
              </tbody>
            </table>
            {data.headcount.note && !isDevNote(data.headcount.note) ? (
              <p className="msr-note mt-2">{data.headcount.note}</p>
            ) : null}
          </Section>

          <Section
            n={2}
            title="Attendu et réel"
          >
            <VarianceTable lines={data.variance.lines} currency={currency} />
            {data.variance.note && !isDevNote(data.variance.note) ? (
              <p className="msr-note mt-2">{data.variance.note}</p>
            ) : null}
          </Section>

          <Section
            n={3}
            title="Recettes attendues"
            total={data.expectedRevenue.total}
            currency={currency}
          >
            <LineRows lines={data.expectedRevenue.lines} currency={currency} />
            {data.expectedRevenue.note && !isDevNote(data.expectedRevenue.note) ? (
              <p className="msr-note mt-2">{data.expectedRevenue.note}</p>
            ) : null}
          </Section>

          <Section
            n={4}
            title="Recettes encaissées"
            total={data.actualRevenue.total}
            currency={currency}
          >
            <LineRows lines={data.actualRevenue.lines} currency={currency} />
            <p className="msr-note mt-2">
              {data.actualRevenue.paymentCount} paiement(s). Le fond d’ouverture figure au solde
              de caisse, pas dans ces recettes.
            </p>
            {data.actualRevenue.byMethod.length > 0 ? (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                  Ventilation par méthode
                </p>
                <table className="msr-table msr-table-zebra w-full text-xs">
                  <tbody>
                    {data.actualRevenue.byMethod.map((m) => (
                      <tr key={m.method}>
                        <td>
                          {m.method} · {m.count} paiement{m.count > 1 ? 's' : ''}
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {formatMoney(m.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Section>

          <Section
            n={5}
            title="Dépenses opérationnelles"
            total={data.operationalExpenses.total}
            currency={currency}
            badge={data.operationalExpenses.tracked ? 'prisma_certified' : 'untracked'}
          >
            <LineRows lines={data.operationalExpenses.lines} currency={currency} />
            {data.operationalExpenses.note && !isDevNote(data.operationalExpenses.note) ? (
              <p className="msr-note mt-2">{data.operationalExpenses.note}</p>
            ) : null}
            <div className="print:hidden mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <p className="text-xs font-semibold text-zinc-700 mb-3">
                Ajouter des charges sur cette période
              </p>
              <ExpenseLinesForm defaultDate={data.period.to} compact onSaved={() => void refetch()} />
            </div>
          </Section>

          <Section
            n={6}
            title="Dépenses d’investissement"
            total={data.investmentExpenses.total}
            currency={currency}
            badge={data.investmentExpenses.tracked ? 'prisma_certified' : 'untracked'}
          >
            {(data.investmentExpenses.lines?.length ?? 0) > 0 ? (
              <LineRows lines={data.investmentExpenses.lines!} currency={currency} />
            ) : null}
            {data.investmentExpenses.note && !isDevNote(data.investmentExpenses.note) ? (
              <p className="msr-note">{data.investmentExpenses.note}</p>
            ) : null}
          </Section>

          <Section
            n={7}
            title="Versements compte bancaire"
            total={data.bankDeposits.total}
            currency={currency}
            badge={data.bankDeposits.badge}
          >
            {data.bankDeposits.lines.length === 0 ? (
              <p className="text-sm text-zinc-600">
                Aucun versement enregistré sur les sessions de caisse.
              </p>
            ) : (
              <table className="msr-table msr-table-zebra w-full text-sm">
                <tbody>
                  {data.bankDeposits.lines.map((l, i) => (
                    <tr key={`${l.at}-${i}`}>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>
                            {l.label}
                            {l.ref ? <span className="text-zinc-400"> · {l.ref}</span> : null}
                          </span>
                          <ProvenanceBadge badge={l.badge} />
                        </div>
                      </td>
                      <td className="text-right font-semibold tabular-nums whitespace-nowrap">
                        {formatMoney(l.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section n={8} title="Solde de caisse" badge={data.cashBalance.badge}>
            <table className="msr-table msr-table-zebra w-full text-sm">
              <tbody>
                <tr>
                  <td>Report d’ouverture</td>
                  <td className="text-right tabular-nums">
                    {formatMoney(data.cashBalance.openingCarry, currency)}
                  </td>
                </tr>
                <tr>
                  <td>Solde de clôture</td>
                  <td className="text-right font-semibold tabular-nums">
                    {formatAmount(data.cashBalance.closingBalance, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
            {data.cashBalance.closingSource && !isDevNote(data.cashBalance.closingSource) ? (
              <p className="msr-note mt-2">{data.cashBalance.closingSource}</p>
            ) : null}
          </Section>

          <Section n={9} title="Crédits / créances">
            <LineRows lines={data.credits.lines} currency={currency} />
            {data.credits.note && !isDevNote(data.credits.note) ? (
              <p className="msr-note mt-2">{data.credits.note}</p>
            ) : null}
            <p className="msr-total">
              <span>Créances élèves encore dues</span>
              <span className="tabular-nums">
                {formatMoney(data.credits.totalOutstanding, currency)}
              </span>
            </p>
          </Section>

          {data.integrity.warnings.filter((w) => !isDevNote(w)).length > 0 ? (
            <section className="msr-section break-inside-avoid">
              <h2 className="msr-section-title">Notes</h2>
              <ul className="space-y-1 text-xs text-zinc-600">
                {data.integrity.warnings
                  .filter((w) => !isDevNote(w))
                  .map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
              </ul>
            </section>
          ) : null}

          <p
            className={cn(
              'mt-2 text-[11px]',
              data.integrity.coherent === false ? 'font-semibold text-red-800' : 'text-zinc-500',
            )}
          >
            {data.integrity.coherent === false
              ? 'Les totaux de ce document ne se recoupent pas — ne pas viser avant correction.'
              : data.integrity.coherent
                ? 'Les totaux de ce document se recoupent.'
                : null}
          </p>

          <footer className="msr-footer break-inside-avoid">
            <div className="msr-footer-meta">
              <p>
                <strong>Date d’édition :</strong> {editedAt}
              </p>
              <p>
                <strong>Généré par :</strong> {data.document.productName}
              </p>
              <p>
                <strong>Émis par :</strong> {data.generatedBy.name}
              </p>
            </div>
            <div className="msr-signatures">
              {data.document.signatureSlots.map((slot) => (
                <div key={slot.role} className="msr-sign-block">
                  <p className="font-semibold">{slot.label}</p>
                  <div className="msr-sign-line" />
                  <p className="text-[10px] text-zinc-500">Nom & signature</p>
                </div>
              ))}
            </div>
          </footer>
        </article>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center text-sm text-zinc-400">
          <FileText className="mx-auto mb-2 text-zinc-300" size={28} />
          Choisissez une période puis cliquez sur Générer.
        </div>
      )}

      <style jsx global>{`
        .msr-sheet {
          max-width: 210mm;
          background: #fff;
          color: #18181b;
          border: 1px solid #e4e4e7;
          border-radius: 4px;
          padding: 18mm 16mm 14mm;
          font-family: Georgia, 'Times New Roman', 'Liberation Serif', serif;
          box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
        }
        .msr-header {
          text-align: center;
          border-bottom: 1.5px solid #27272a;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .msr-eyebrow {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #3f3f46;
          font-weight: 700;
        }
        .msr-school {
          margin-top: 6px;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .msr-title {
          margin-top: 10px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .msr-meta {
          margin-top: 4px;
          font-size: 12px;
          color: #52525b;
          font-family: 'Segoe UI', Calibri, Candara, sans-serif;
        }
        .msr-section {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e4e4e7;
        }
        .msr-section-title {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: 0.01em;
        }
        .msr-note {
          font-size: 10px;
          line-height: 1.4;
          color: #71717a;
          font-family: 'Segoe UI', Calibri, Candara, sans-serif;
        }
        .msr-brief {
          margin: 0;
          padding-left: 1.1em;
          font-size: 13px;
          line-height: 1.55;
          color: #18181b;
        }
        .msr-brief li {
          margin-bottom: 6px;
        }
        .msr-table th,
        .msr-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #f4f4f5;
          font-family: 'Segoe UI', Calibri, Candara, sans-serif;
          vertical-align: top;
        }
        .msr-table th {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #52525b;
          border-bottom: 1px solid #d4d4d8;
        }
        .msr-table-zebra tbody tr:nth-child(even) {
          background: #fafafa;
        }
        .msr-total {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #d4d4d8;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
        }
        .msr-footer {
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1.5px solid #27272a;
        }
        .msr-footer-meta {
          font-size: 11px;
          color: #3f3f46;
          font-family: 'Segoe UI', Calibri, Candara, sans-serif;
          display: grid;
          gap: 4px;
        }
        .msr-signatures {
          margin-top: 28px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }
        .msr-sign-block {
          text-align: center;
          font-size: 12px;
        }
        .msr-sign-line {
          margin: 36px auto 6px;
          width: 85%;
          border-bottom: 1px solid #52525b;
        }

        @media print {
          aside,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .msr-sheet {
            max-width: none;
            width: 100%;
            border: none;
            border-radius: 0;
            box-shadow: none;
            padding: 12mm 10mm;
          }
          @page {
            size: A4;
            margin: 12mm;
          }
        }
      `}</style>
    </FinancePageShell>
  )
}
