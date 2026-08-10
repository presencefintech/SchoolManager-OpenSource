'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Printer, RefreshCw, ArrowLeft, AlertTriangle, FileText } from 'lucide-react'
import { useMonthlySituationReport } from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type { SituationLine } from '@/types/finance'

/** Période RDC type promoteur : 26 du mois précédent → 25 du mois courant. */
function defaultRdcPeriod(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth() // 0-based
  const fromDate = new Date(y, m - 1, 26)
  const toDate = new Date(y, m, 25)
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const reportMonth = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}`
  return { from: iso(fromDate), to: iso(toDate), reportMonth }
}

function LineRows({
  lines,
  currency,
}: {
  lines: SituationLine[]
  currency: string
}) {
  return (
    <ul className="space-y-1.5">
      {lines.map((l) => (
        <li key={l.key} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="text-zinc-800">
              <span className="text-zinc-400 mr-1.5">•</span>
              {l.label}
            </p>
            {l.note ? <p className="text-[11px] text-zinc-400 ml-3.5 mt-0.5">{l.note}</p> : null}
            {l.source !== 'computed' ? (
              <span
                className={cn(
                  'ml-3.5 mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                  l.source === 'estimated'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-zinc-100 text-zinc-500',
                )}
              >
                {l.source === 'estimated' ? 'estimé' : 'non suivi'}
              </span>
            ) : null}
          </div>
          <p className="shrink-0 font-semibold tabular-nums text-zinc-900">
            {formatMoney(l.amount, currency)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Section({
  n,
  title,
  children,
  total,
  currency,
}: {
  n: number | string
  title: string
  children: React.ReactNode
  total?: number
  currency?: string
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 print:border-zinc-300 print:shadow-none print:break-inside-avoid">
      <h2 className="text-sm font-bold text-zinc-900 mb-3">
        {n}. {title}
      </h2>
      {children}
      {total != null && currency ? (
        <p className="mt-3 pt-3 border-t border-zinc-100 text-sm font-bold text-zinc-900 flex justify-between">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatMoney(total, currency)}</span>
        </p>
      ) : null}
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

  const currency = data?.school.currency ?? 'USD'

  return (
    <FinancePageShell>
      <div className="print:hidden">
        <FinancePageHeader
          title="Situation financière mensuelle"
          subtitle="Rapport promoteur / admin — données Presence uniquement (aucune dépense inventée)"
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
            Défaut RDC : 26 du mois précédent → 25 du mois en cours (ex. Érudits).
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
        <div className="space-y-4 max-w-3xl mx-auto print:max-w-none">
          <header className="text-center space-y-1 pb-4 border-b border-zinc-200">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Guichet · Presence
            </p>
            <h1 className="text-xl font-bold text-zinc-900 uppercase tracking-tight">
              {data.school.name}
            </h1>
            {data.school.city ? (
              <p className="text-sm text-zinc-500">{data.school.city}</p>
            ) : null}
            <p className="text-base font-semibold text-zinc-800 mt-2">{data.period.title}</p>
            <p className="text-sm text-zinc-600">
              du {data.period.from.split('-').reverse().join('/')} au{' '}
              {data.period.to.split('-').reverse().join('/')}
            </p>
            <p className="text-[11px] text-zinc-400">
              Généré le {new Date(data.generatedAt).toLocaleString('fr-FR')} · {data.generatedBy.name}
            </p>
          </header>

          {data.integrity.warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 space-y-1 print:border-amber-300">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle size={13} /> Transparence des données
              </p>
              {data.integrity.warnings.map((w) => (
                <p key={w}>• {w}</p>
              ))}
            </div>
          ) : null}

          <Section n={1} title="Nombre des élèves">
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between">
                <span>• Privées (élèves actifs)</span>
                <span className="font-semibold tabular-nums">{data.headcount.studentsPrivate}</span>
              </li>
              <li className="flex justify-between">
                <span>• Enseignants</span>
                <span className="font-semibold tabular-nums">{data.headcount.teachers}</span>
              </li>
            </ul>
            <p className="text-[11px] text-zinc-400 mt-2">{data.headcount.note}</p>
          </Section>

          <Section
            n={2}
            title="Recettes attendues"
            total={data.expectedRevenue.total}
            currency={currency}
          >
            <LineRows lines={data.expectedRevenue.lines} currency={currency} />
            <p className="text-[11px] text-zinc-400 mt-2">{data.expectedRevenue.note}</p>
          </Section>

          <Section
            n={3}
            title="Recettes réelles"
            total={data.actualRevenue.total}
            currency={currency}
          >
            <LineRows lines={data.actualRevenue.lines} currency={currency} />
            <p className="text-[11px] text-zinc-400 mt-2">
              {data.actualRevenue.paymentCount} paiement(s) confirmé(s) / réconcilié(s) sur la période.
            </p>
            {data.actualRevenue.byMethod.length > 0 ? (
              <div className="mt-3 pt-3 border-t border-zinc-50">
                <p className="text-[10px] font-semibold uppercase text-zinc-400 mb-1.5">
                  Ventilation par méthode
                </p>
                <ul className="space-y-1 text-xs text-zinc-600">
                  {data.actualRevenue.byMethod.map((m) => (
                    <li key={m.method} className="flex justify-between">
                      <span>
                        {m.method} · {m.count} txn
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatMoney(m.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Section>

          <Section
            n={4}
            title="Dépenses opérationnelles"
            total={data.operationalExpenses.total}
            currency={currency}
          >
            <LineRows lines={data.operationalExpenses.lines} currency={currency} />
            <p className="text-[11px] text-zinc-400 mt-2">{data.operationalExpenses.note}</p>
          </Section>

          <Section n={5} title="Dépenses d’investissement">
            <p className="text-sm flex justify-between">
              <span>• Total</span>
              <span className="font-semibold tabular-nums">
                {formatMoney(data.investmentExpenses.total, currency)}
              </span>
            </p>
            <p className="text-[11px] text-zinc-400 mt-2">{data.investmentExpenses.note}</p>
          </Section>

          <Section
            n={6}
            title="Versement compte bancaire"
            total={data.bankDeposits.total}
            currency={currency}
          >
            {data.bankDeposits.lines.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun versement enregistré sur les sessions de caisse.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.bankDeposits.lines.map((l, i) => (
                  <li key={`${l.at}-${i}`} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      • {l.label}
                      {l.ref ? <span className="text-zinc-400"> · {l.ref}</span> : null}
                    </span>
                    <span className="font-semibold tabular-nums shrink-0">
                      {formatMoney(l.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section n={7} title="Solde caisse">
            <p className="text-sm flex justify-between">
              <span>• Solde</span>
              <span className="font-semibold tabular-nums">
                {data.cashBalance.closingBalance != null
                  ? formatMoney(data.cashBalance.closingBalance, currency)
                  : '—'}
              </span>
            </p>
            {data.cashBalance.closingSource ? (
              <p className="text-[11px] text-zinc-400 mt-2">{data.cashBalance.closingSource}</p>
            ) : null}
          </Section>

          <Section n="8–10" title="Crédits / créances">
            <LineRows lines={data.credits.lines} currency={currency} />
            <p className="text-[11px] text-zinc-400 mt-2">{data.credits.note}</p>
            <p className="mt-2 text-sm font-bold flex justify-between border-t border-zinc-100 pt-2">
              <span>Créances totales (soldes élèves)</span>
              <span className="tabular-nums">
                {formatMoney(data.credits.totalOutstanding, currency)}
              </span>
            </p>
          </Section>

          <p className="text-center text-[10px] text-zinc-400 pt-4 print:pt-8">
            Document généré par Presence — sources : paiements confirmés, barèmes, sessions de caisse,
            effectifs. Les postes non suivis (salaires, IPR…) restent à 0 volontairement.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center text-sm text-zinc-400">
          <FileText className="mx-auto mb-2 text-zinc-300" size={28} />
          Choisissez une période puis cliquez sur Générer.
        </div>
      )}

      <style jsx global>{`
        @media print {
          aside,
          nav,
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </FinancePageShell>
  )
}
