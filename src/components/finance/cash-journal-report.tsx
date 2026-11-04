'use client'

import { useMemo, useState } from 'react'
import { Minus, Printer, TrendingDown, TrendingUp } from 'lucide-react'
import { useCashJournal, useUpdateCashJournalVisibility } from '@/lib/hooks/use-finance'
import {
  formatGeneratedAt,
  formatJournalAmount,
  formatJournalTime,
  JOURNAL_ROLE_LABEL,
  METHOD_LABEL,
  presentJournalPace,
  todayInputValue,
  type CashJournalReport,
  type CashJournalVisibility,
  type JournalPeriod,
  type JournalRole,
} from '@/lib/finance/cash-journal'
import type { CashPaceTrend } from '@/lib/finance/cash-pace'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { hasWebRole, isWebRole } from '@/types/auth'

/** Rôle renvoyé par le serveur (MANAGER compris) : la vue comptable suit le métier FINANCE. */
function viewerHasFinanceRole(role: string): boolean {
  return isWebRole(role) && hasWebRole(role, 'FINANCE')
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  .cash-journal-sheet, .cash-journal-sheet * { visibility: visible; }
  .cash-journal-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: #fff;
    box-shadow: none !important;
  }
  .cash-journal-no-print { display: none !important; }
  .cash-journal-sheet table { width: 100%; border-collapse: collapse; }
  .cash-journal-sheet thead { display: table-header-group; }
  .cash-journal-sheet tr, .cash-journal-sheet .cash-journal-sign { break-inside: avoid; }
  @page { margin: 12mm; }
}
`

function TrendMark({ trend }: { trend: CashPaceTrend | null }) {
  if (trend === 'up') {
    return <TrendingUp size={13} className="text-emerald-600" aria-label="Au-dessus d'hier" />
  }
  if (trend === 'down') {
    return <TrendingDown size={13} className="text-red-500" aria-label="En dessous d'hier" />
  }
  if (trend === 'flat') {
    return <Minus size={13} className="text-zinc-400" aria-label="Identique à hier" />
  }
  return null
}

function MoneyCells({ usd, cdf }: { usd: number | null; cdf: number | null }) {
  return (
    <>
      <td className="pf-money pf-usd py-1.5 pr-3 text-right">{usd == null ? '—' : formatMoney(usd, 'USD')}</td>
      <td className="pf-money pf-cdf py-1.5 text-right">{cdf == null ? '—' : formatMoney(cdf, 'CDF')}</td>
    </>
  )
}

const BADGE_CLASS = {
  validated: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  reconciled: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
} as const

function PaceLine({ report }: { report: CashJournalReport }) {
  const view = presentJournalPace(report.pace)
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-600">
      <span>
        {view.todayLabel} <span className="font-semibold tabular-nums text-zinc-900">{view.today}</span>
      </span>
      <TrendMark trend={view.trend} />
      <span className="text-zinc-300" aria-hidden>,</span>
      <span>
        {view.yesterdayLabel} <span className="font-semibold tabular-nums text-zinc-900">{view.yesterday}</span>
      </span>
      {view.layout === 'trio' ? (
        <>
          <span className="text-zinc-300" aria-hidden>,</span>
          <span>
            {view.weekLabel} <span className="font-semibold tabular-nums text-zinc-900">{view.week}</span>
          </span>
        </>
      ) : null}
    </p>
  )
}

function VisibilitySwitches({
  visibility,
  pending,
  onChange,
}: {
  visibility: CashJournalVisibility
  pending: boolean
  onChange: (next: CashJournalVisibility) => void
}) {
  const roles: JournalRole[] = ['FINANCE', 'IT', 'DIRECTOR']

  function toggle(role: JournalRole, key: 'hideAmounts' | 'hideTotals') {
    const next: CashJournalVisibility = {
      hideAmounts: { ...visibility.hideAmounts },
      hideTotals: { ...visibility.hideTotals },
    }
    const value = !next[key][role]
    next[key][role] = value
    if (key === 'hideAmounts' && value) next.hideTotals[role] = true
    if (key === 'hideAmounts' && !value) next.hideTotals[role] = false
    onChange(next)
  }

  return (
    <div className="cash-journal-no-print rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Visibilité des montants
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {roles.map((role) => (
          <div key={role} className="rounded-lg bg-white px-2.5 py-2 text-xs">
            <p className="font-medium text-zinc-800">{JOURNAL_ROLE_LABEL[role]}</p>
            <label className="mt-1.5 flex items-center justify-between gap-2 text-zinc-600">
              Masquer les montants
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={visibility.hideAmounts[role]}
                disabled={pending}
                onChange={() => toggle(role, 'hideAmounts')}
              />
            </label>
            <label className="mt-1 flex items-center justify-between gap-2 text-zinc-600">
              Masquer les totaux
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={visibility.hideTotals[role]}
                disabled={pending || visibility.hideAmounts[role]}
                onChange={() => toggle(role, 'hideTotals')}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CashJournalReport({ className }: { className?: string }) {
  const [period, setPeriod] = useState<JournalPeriod>('day')
  const [date, setDate] = useState(todayInputValue)
  const [from, setFrom] = useState(todayInputValue)
  const [to, setTo] = useState(todayInputValue)
  const [sectionId, setSectionId] = useState<number | undefined>()
  const [optionId, setOptionId] = useState<number | undefined>()
  const [classId, setClassId] = useState<number | undefined>()

  const params = useMemo(
    () => ({
      period,
      date,
      ...(period === 'range' ? { from, to } : {}),
      ...(sectionId ? { sectionId } : {}),
      ...(optionId ? { optionId } : {}),
      ...(classId ? { classId } : {}),
    }),
    [period, date, from, to, sectionId, optionId, classId],
  )

  const journal = useCashJournal(params)
  const saveVisibility = useUpdateCashJournalVisibility()
  const report = journal.data

  const filterCaption = report
    ? [
        report.filters.from === report.filters.to
          ? report.filters.from
          : `${report.filters.from} → ${report.filters.to}`,
        report.filters.section,
        report.filters.option,
        report.filters.className,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <section className={cn('space-y-3', className)}>
      <style>{PRINT_CSS}</style>

      <div className="cash-journal-no-print flex flex-wrap items-end gap-2">
        <label className="text-xs text-zinc-500">
          Période
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as JournalPeriod)}
            className="mt-1 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800"
          >
            <option value="day">Journalier</option>
            <option value="week">Hebdomadaire</option>
            <option value="month">Mensuel</option>
            <option value="quarter">Trimestriel</option>
            <option value="semester">Semestriel</option>
            <option value="year">Annuel</option>
            {report && viewerHasFinanceRole(report.viewer.role) ? (
              <option value="cashier">Situation mensuelle</option>
            ) : null}
            <option value="range">Intervalle</option>
          </select>
        </label>
        {period !== 'range' ? (
          <label className="text-xs text-zinc-500">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800"
            />
          </label>
        ) : (
          <>
            <label className="text-xs text-zinc-500">
              Du
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Au
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 block rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
          </>
        )}
        <label className="text-xs text-zinc-500">
          Section
          <select
            value={sectionId ?? ''}
            onChange={(event) => {
              setSectionId(event.target.value ? Number(event.target.value) : undefined)
              setOptionId(undefined)
              setClassId(undefined)
            }}
            className="mt-1 block max-w-[11rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Toutes</option>
            {(report?.catalogs.sections ?? []).map((section) => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Option
          <select
            value={optionId ?? ''}
            onChange={(event) => {
              setOptionId(event.target.value ? Number(event.target.value) : undefined)
              setClassId(undefined)
            }}
            className="mt-1 block max-w-[11rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Toutes</option>
            {(report?.catalogs.options ?? []).map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Classe
          <select
            value={classId ?? ''}
            onChange={(event) => setClassId(event.target.value ? Number(event.target.value) : undefined)}
            className="mt-1 block max-w-[11rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Toutes</option>
            {(report?.catalogs.classes ?? []).map((room) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700"
        >
          <Printer size={13} />
          Imprimer
        </button>
      </div>

      {report?.viewer.canConfigure ? (
        <VisibilitySwitches
          visibility={report.visibility}
          pending={saveVisibility.isPending}
          onChange={(next) => saveVisibility.mutate(next)}
        />
      ) : null}

      {journal.isError ? (
        <p className="cash-journal-no-print rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {getApiErrorMessage(journal.error)}
          <button type="button" className="ml-2 underline" onClick={() => void journal.refetch()}>
            Réessayer
          </button>
        </p>
      ) : null}

      <article className="cash-journal-sheet rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800">
        <header className="border-b border-slate-200 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">PresenceFintech · Document de caisse</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{report?.schoolName ?? 'Rapport de caisse'}</p>
          <h2 className="text-xs text-zinc-700">
            Rapport de Caisse &amp; {report?.reportTitle ?? 'Journalier'} — Généré le {report ? formatGeneratedAt(report.generatedAt) : '…'}
          </h2>
          {filterCaption ? <p className="mt-1 text-[11px] text-zinc-500">{filterCaption}</p> : null}
        </header>

        <div className="mt-2">
          {journal.isPending || !report ? (
            <div className="space-y-2">
              <div className="pf-skeleton h-4 w-2/3 rounded-md" />
              <div className="pf-skeleton h-16 rounded-lg" />
            </div>
          ) : (
            <PaceLine report={report} />
          )}
          <p className="mt-1 text-[11px] text-zinc-400">
            Dollars et francs séparés. Seuls les paiements confirmés entrent dans les totaux.
            La période choisie, la section, l&apos;option et la classe sont les mêmes
            pour cette ligne, la ventilation et le journal.
          </p>
        </div>

        {report?.monthlySituation ? (
          <>
            <h3 className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Situation mois par mois — exercice {report.monthlySituation.exercise}
            </h3>
            <div className="overflow-x-auto">
              <table className="pf-ledger w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-1.5 pr-2 font-medium">Mois</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Opérations</th>
                    <th className="pf-usd py-1.5 pr-3 text-right font-medium">USD</th>
                    <th className="pf-cdf py-1.5 text-right font-medium">CDF</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlySituation.months.map((month) => (
                    <tr key={month.label} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 text-slate-800">{month.label}</td>
                      <td className="pf-money py-1.5 pr-2 text-right text-slate-600">{month.count}</td>
                      <MoneyCells usd={month.usd} cdf={month.cdf} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <h3 className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Entrées confirmées
        </h3>
        <div className="overflow-x-auto">
          <table className="pf-ledger w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-2 font-medium">Mode</th>
                <th className="py-1.5 pr-2 text-right font-medium">Opérations</th>
                <th className="pf-usd py-1.5 pr-3 text-right font-medium">USD</th>
                <th className="pf-cdf py-1.5 text-right font-medium">CDF</th>
              </tr>
            </thead>
            <tbody>
              {(report?.methods ?? []).map((row) => (
                <tr key={row.method} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 text-slate-800">{row.label || METHOD_LABEL[row.method] || row.method}</td>
                  <td className="pf-money py-1.5 pr-2 text-right text-slate-600">{row.count}</td>
                  <MoneyCells usd={row.usd} cdf={row.cdf} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Journal des opérations
        </h3>
        <div className="overflow-x-auto">
          <table className="pf-ledger w-full min-w-[860px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-2 font-medium">Heure</th>
                <th className="py-1.5 pr-2 font-medium">N° Reçu / Réf</th>
                <th className="py-1.5 pr-2 font-medium">Élève &amp; Classe</th>
                <th className="py-1.5 pr-2 font-medium">Payeur</th>
                <th className="py-1.5 pr-2 font-medium">Motif</th>
                <th className="py-1.5 pr-2 font-medium">Mode</th>
                <th className="py-1.5 pr-2 text-right font-medium">Montant</th>
                <th className="py-1.5 pr-2 text-right font-medium">Reste à payer</th>
                <th className="py-1.5 pr-2 font-medium">Caissier</th>
                <th className="py-1.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(report?.transactions ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-middle">
                  <td className="pf-money py-1.5 pr-2 text-slate-700">{formatJournalTime(row.createdAt)}</td>
                  <td className="py-1.5 pr-2 font-medium text-slate-900">{row.receipt}</td>
                  <td className="py-1.5 pr-2 text-zinc-800">
                    {row.student}
                    <span className="block text-zinc-500">
                      {[row.className, row.option, row.section].filter((part) => part && part !== '—').join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-zinc-700">{row.payer}</td>
                  <td className="py-1.5 pr-2 text-zinc-700">{row.motive}</td>
                  <td className="py-1.5 pr-2 text-zinc-700">{METHOD_LABEL[row.method] ?? row.method}</td>
                  <td className="pf-money py-1.5 pr-2 text-right text-slate-900">
                    <span className={cn(
                      'mr-1 font-sans text-[9px] font-semibold uppercase',
                      row.amount.currency === 'CDF' ? 'text-emerald-700' : 'text-slate-500',
                    )}>
                      {row.amount.currency}
                    </span>
                    {formatJournalAmount(row.amount)}
                  </td>
                  <td className="pf-money py-1.5 pr-2 text-right text-slate-700">
                    {row.balanceUsd == null ? '—' : formatMoney(row.balanceUsd, 'USD')}
                  </td>
                  <td className="py-1.5 pr-2 text-zinc-700">{row.cashier}</td>
                  <td className="py-1.5">
                    <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none', BADGE_CLASS[row.badge])}>
                      {row.badgeLabel}
                    </span>
                  </td>
                </tr>
              ))}
              {report && report.transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-4 text-center text-zinc-400">
                    Aucune opération sur cette période.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {report?.truncated ? (
          <p className="mt-2 text-[11px] text-zinc-500">400 dernières opérations affichées.</p>
        ) : null}
        {report?.filters.capped ? (
          <p className="mt-1 text-[11px] text-zinc-500">Intervalle limité à 31 jours.</p>
        ) : null}

        <div className="cash-journal-sign mt-8 grid grid-cols-2 gap-10 text-xs text-zinc-600">
          <div>
            <p className="font-medium uppercase tracking-wide">Caissier</p>
            <div className="mt-10 border-t border-zinc-300" />
          </div>
          <div>
            <p className="font-medium uppercase tracking-wide">Comptable</p>
            <div className="mt-10 border-t border-zinc-300" />
          </div>
        </div>
      </article>
    </section>
  )
}
