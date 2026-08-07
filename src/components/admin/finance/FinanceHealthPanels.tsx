'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type {
  FinanceDetailedReportView,
  FinanceHealthView,
} from '@/lib/admin/finance-dashboard.utils'

function ScoreRing({ score, healthy }: { score: number; healthy: boolean }) {
  const radius = 36
  const circ = 2 * Math.PI * radius
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ
  const color = healthy ? '#059669' : score >= 50 ? '#d97706' : '#e11d48'

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-slate-900">{score}</span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">/ 100</span>
      </div>
    </div>
  )
}

function MethodBar({
  label,
  amount,
  total,
  tone,
}: {
  label: string
  amount: number
  total: number
  tone: string
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">
          {formatMoney(amount)} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  )
}

export function FinanceHealthPanel({ health }: { health: FinanceHealthView }) {
  const momUp = health.monthOverMonthPct >= 0

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <ScoreRing score={health.healthScore} healthy={health.isHealthy} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                health.isHealthy
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
              )}
            >
              {health.isHealthy ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {health.isHealthy ? 'Établissement sain' : 'Attention requise'}
            </span>
            {health.overCollected && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
                Sur-encaissement
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Score opérationnel (recouvrement, dette, débiteurs, file d&apos;attente) — distinct
            du score risque portefeuille (IA). Objectif recouvrement&nbsp;: {health.targetEfficiency}%.
          </p>
          <div
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
              momUp ? 'text-emerald-700' : 'text-rose-600',
            )}
          >
            {momUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {momUp ? '+' : ''}
            {health.monthOverMonthPct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}% vs mois
            précédent
            <span className="font-normal text-slate-400">
              · {formatMoney(health.collectedThisMonth)} ce mois
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Encaissé', value: formatMoney(health.collected) },
          { label: 'Reste dû', value: formatMoney(health.remaining) },
          {
            label: 'Recouvrement',
            value: `${health.efficiency.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`,
          },
          { label: 'Débiteurs', value: health.debtorsCount.toLocaleString('fr-FR') },
          { label: 'Élèves', value: health.studentCount.toLocaleString('fr-FR') },
          {
            label: 'Ticket / élève',
            value: formatMoney(health.avgPerStudent),
          },
          {
            label: "Seuil d'équilibre",
            value: `${health.breakEvenThreshold.toLocaleString('fr-FR')} él.`,
          },
          {
            label: 'En attente',
            value: health.pendingPayments.toLocaleString('fr-FR'),
          },
        ].map((row) => (
          <div key={row.label} className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{row.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{row.value}</p>
          </div>
        ))}
      </div>

      {health.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Recommandations
          </p>
          {health.recommendations.map((rec) => (
            <div
              key={rec.code}
              className={cn(
                'rounded-xl px-3 py-2.5 text-xs leading-relaxed ring-1',
                rec.severity === 'critical' && 'bg-rose-50 text-rose-900 ring-rose-100',
                rec.severity === 'warning' && 'bg-amber-50 text-amber-900 ring-amber-100',
                rec.severity === 'info' && 'bg-slate-50 text-slate-700 ring-slate-100',
              )}
            >
              <p>{rec.message}</p>
              {rec.href && (
                <Link
                  href={rec.href}
                  className="mt-1.5 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Agir <ArrowRight size={11} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function FinanceDetailedReportPanel({ report }: { report: FinanceDetailedReportView }) {
  const total = report.summary.total

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="font-mono text-[11px] text-slate-600">{report.reportId}</span>
        <span>
          {new Date(report.generatedAt).toLocaleString('fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      </div>

      {report.periodStart && report.periodEnd && (
        <p className="text-[11px] text-slate-400">
          Période&nbsp;:{' '}
          {new Date(report.periodStart).toLocaleDateString('fr-FR')} →{' '}
          {new Date(report.periodEnd).toLocaleDateString('fr-FR')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Total encaissé', value: formatMoney(report.summary.total) },
          {
            label: 'Transactions',
            value: report.totalTransactions.toLocaleString('fr-FR'),
          },
          { label: 'Ticket moyen', value: formatMoney(report.averageTicket) },
          {
            label: 'Part digitale',
            value: `${report.digitalSharePct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`,
          },
        ].map((row) => (
          <div key={row.label} className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{row.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Répartition des modes
        </p>
        <MethodBar label="Espèces" amount={report.summary.cash} total={total} tone="bg-emerald-500" />
        <MethodBar
          label="Mobile money"
          amount={report.summary.mobileMoney}
          total={total}
          tone="bg-sky-500"
        />
        <MethodBar label="Banque" amount={report.summary.bank} total={total} tone="bg-violet-500" />
      </div>

      {report.topClasses.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
            <TrendingUp size={12} /> Top classes
          </p>
          {report.topClasses.map((c, i) => (
            <div
              key={c.name}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100"
            >
              <span className="text-xs text-slate-600 truncate">
                <span className="mr-1.5 font-bold text-slate-400">{i + 1}.</span>
                {c.name}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-900">
                {formatMoney(c.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/admin/finance/rapports"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900"
      >
        <FileText size={12} />
        Voir les rapports complets
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}
