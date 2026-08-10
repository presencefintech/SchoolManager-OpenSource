'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Printer, RefreshCw, ArrowLeft, AlertTriangle, FileText, Info } from 'lucide-react'
import { useMonthlySituationReport } from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type {
  DataBadge,
  KpiMetric,
  ManagementAlert,
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
  if (amount == null) return 'Non tracé'
  return formatMoney(amount, currency)
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
  const map: Record<DataBadge, { label: string; className: string }> = {
    prisma_certified: {
      label: 'Donnée certifiée Prisma',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    catalog_estimate: {
      label: 'Estimation catalogue',
      className: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    untracked: {
      label: 'Non tracé',
      className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    },
    manual_entry: {
      label: 'Saisie manuelle / legacy',
      className: 'bg-sky-50 text-sky-900 border-sky-200',
    },
  }
  const cfg = map[badge]
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
  return (
    <table className="msr-table w-full text-sm">
      <tbody>
        {lines.map((l) => (
          <tr key={l.key}>
            <td className="align-top">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-800">{l.label}</span>
                <ProvenanceBadge badge={l.badge} />
              </div>
              {l.note ? <p className="msr-note mt-0.5">{l.note}</p> : null}
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
          {lines.map((l) => (
            <tr key={l.key}>
              <td>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-zinc-900">{l.label}</span>
                  <ProvenanceBadge badge={l.badgeActual} />
                </div>
                {l.note ? <p className="msr-note mt-0.5">{l.note}</p> : null}
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

export default function SituationMensuellePage() {
  const defaults = useMemo(() => defaultRdcPeriod(), [])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [reportMonth, setReportMonth] = useState(defaults.reportMonth)
  const [applied, setApplied] = useState(defaults)

  const { data, isLoading, isFetching, isError, refetch, error } = useMonthlySituationReport(applied)

  const currency = data?.school.currency ?? 'USD'
  const editedAt = data
    ? new Date(data.generatedAt).toLocaleString('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : ''

  return (
    <FinancePageShell>
      <div className="print:hidden">
        <FinancePageHeader
          title="Synthèse executive — situation mensuelle"
          subtitle="Document de conseil d’administration — données Presence uniquement"
          actions={
            <>
              <Link
                href="/finances/caisse"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                <ArrowLeft size={14} /> Caisse
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
                onClick={() => window.print()}
                disabled={!data}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                <Printer size={14} /> Imprimer / PDF
              </button>
            </>
          }
        />

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 mb-6 flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-zinc-500">
            Du
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-zinc-500">
            Au
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-zinc-500">
            Mois de référence (frais)
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => setApplied({ from, to, reportMonth })}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Générer
          </button>
          <p className="w-full text-[11px] text-zinc-400">
            Défaut RDC : 26 du mois précédent → 25 du mois en cours (ex. Les Érudits).
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-400 animate-pulse">Génération du rapport…</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de générer le rapport.{' '}
          {(error as { message?: string })?.message ?? 'Vérifiez la période.'}
        </div>
      ) : data ? (
        <article className="msr-sheet mx-auto">
          <header className="msr-header">
            <p className="msr-eyebrow">Document de synthèse executive</p>
            <h1 className="msr-school">{data.school.name}</h1>
            {data.school.city ? <p className="msr-meta">{data.school.city}</p> : null}
            <p className="msr-title">{data.period.title}</p>
            <p className="msr-meta">
              Période du {data.period.from.split('-').reverse().join('/')} au{' '}
              {data.period.to.split('-').reverse().join('/')} · Mois de référence{' '}
              {data.period.reportMonthLabel}
            </p>
            <p className="msr-meta">
              Destinataires : {data.document.audience}
            </p>
          </header>

          {data.alerts.length > 0 ? (
            <section className="msr-section break-inside-avoid space-y-2">
              <h2 className="msr-section-title">Alertes de gestion</h2>
              {data.alerts.map((a) => (
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
                    <span className="flex-1">{a.title}</span>
                    {a.blocking ? (
                      <span className="rounded bg-red-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Bloquant signature
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 leading-relaxed">{a.message}</p>
                </div>
              ))}
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
                  <p className="msr-note mt-2">{kpi.formula}</p>
                  <p className="msr-note mt-1">{kpi.note}</p>
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
                  <td>Poids (ant. + antic.) / mois</td>
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
            <p className="msr-note mt-2">{data.arrearsRisk.note}</p>
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
            <p className="msr-note mb-2 font-mono text-[11px]">{data.cashReconciliation.equation}</p>
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
                  <td>− Dépenses affectsCash</td>
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
            <p className="msr-note mt-2">{data.cashReconciliation.note}</p>
          </section>

          <Section n={1} title="Effectifs" badge={data.headcount.badge}>
            <table className="msr-table msr-table-zebra w-full text-sm">
              <tbody>
                <tr>
                  <td>Élèves actifs (privées)</td>
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
            <p className="msr-note mt-2">{data.headcount.note}</p>
          </Section>

          <Section
            n={2}
            title="Analyse de variance (attendu vs réel)"
          >
            <VarianceTable lines={data.variance.lines} currency={currency} />
            <p className="msr-note mt-2">{data.variance.note}</p>
          </Section>

          <Section
            n={3}
            title="Recettes attendues (catalogue)"
            total={data.expectedRevenue.total}
            currency={currency}
          >
            <LineRows lines={data.expectedRevenue.lines} currency={currency} />
            <p className="msr-note mt-2">{data.expectedRevenue.note}</p>
          </Section>

          <Section
            n={4}
            title="Recettes réelles (encaissements)"
            total={data.actualRevenue.total}
            currency={currency}
          >
            <LineRows lines={data.actualRevenue.lines} currency={currency} />
            <p className="msr-note mt-2">
              {data.actualRevenue.paymentCount} paiement(s) confirmé(s) / réconcilié(s) · Encaissé hors
              report caisse : {formatMoney(data.actualRevenue.collectedTotal, currency)}.
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
                          {m.method} · {m.count} txn
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
            <p className="msr-note mt-2">{data.operationalExpenses.note}</p>
          </Section>

          <Section
            n={6}
            title="Dépenses d’investissement"
            total={data.investmentExpenses.total}
            currency={currency}
            badge={data.investmentExpenses.tracked ? 'prisma_certified' : 'untracked'}
          >
            <p className="msr-note">{data.investmentExpenses.note}</p>
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
            {data.cashBalance.closingSource ? (
              <p className="msr-note mt-2">{data.cashBalance.closingSource}</p>
            ) : null}
          </Section>

          <Section n={9} title="Crédits / créances">
            <LineRows lines={data.credits.lines} currency={currency} />
            <p className="msr-note mt-2">{data.credits.note}</p>
            <p className="msr-total">
              <span>Créances totales (soldes élèves)</span>
              <span className="tabular-nums">
                {formatMoney(data.credits.totalOutstanding, currency)}
              </span>
            </p>
          </Section>

          {data.integrity.warnings.length > 0 ? (
            <section className="msr-section break-inside-avoid">
              <h2 className="msr-section-title">Annexe — transparence des sources</h2>
              <ul className="space-y-1 text-xs text-zinc-600">
                {data.integrity.warnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </section>
          ) : null}

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
