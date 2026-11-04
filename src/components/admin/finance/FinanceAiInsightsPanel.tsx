'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  MessageCircle,
  Phone,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useFinanceAiInsights } from '@/lib/hooks/use-admin'
import { useFinanceRoleAiInsights } from '@/lib/hooks/use-finance'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { cn } from '@/lib/utils'
import type {
  FinanceAiAgingBuckets,
  FinanceAiHorizon,
  FinanceAiInsightBundle,
} from '@/lib/admin/finance-ai.utils'
import { rewriteFinanceDeepLink } from '@/lib/admin/finance-ai.utils'

const CHANNEL_ICON = {
  WHATSAPP: MessageCircle,
  SMS: MessageCircle,
  CALL: Phone,
  IN_PERSON: Target,
} as const

const PRIORITY_CLS = {
  HIGH: 'bg-rose-50 text-rose-700 ring-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-200',
  LOW: 'bg-slate-50 text-slate-600 ring-slate-200',
} as const

const GRADE_CLS = {
  A: 'bg-emerald-400 text-slate-950',
  B: 'bg-emerald-300/90 text-slate-900',
  C: 'bg-amber-400 text-slate-900',
  D: 'bg-orange-400 text-slate-900',
  F: 'bg-rose-500 text-white',
} as const

const BENCH_CLS = {
  good: 'text-emerald-300',
  watch: 'text-amber-300',
  critical: 'text-rose-300',
} as const

function ExecutiveHeader({ data }: { data: FinanceAiInsightBundle }) {
  const e = data.executive
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-lg',
          GRADE_CLS[e.grade],
        )}
      >
        {e.grade}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">
          Score risque portefeuille {e.healthScore}/100
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          MoM {e.monthOverMonthPct >= 0 ? '+' : ''}
          {e.monthOverMonthPct}% · digital {e.digitalSharePct}% · cure relances{' '}
          {e.reminderCureRatePct}%
        </p>
      </div>
    </div>
  )
}

function BenchmarkStrip({ data }: { data: FinanceAiInsightBundle }) {
  if (data.executive.benchmarks.length === 0) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {data.executive.benchmarks.map((b) => (
        <div key={b.label} className="rounded-lg bg-white/5 px-2 py-2 ring-1 ring-white/10">
          <p className="text-[9px] uppercase tracking-wide text-slate-500 truncate">{b.label}</p>
          <p className={cn('text-xs font-bold tabular-nums mt-0.5', BENCH_CLS[b.status])}>
            {b.value}
            {b.unit}
          </p>
          <p className="text-[9px] text-slate-500">cible {b.target}{b.unit}</p>
        </div>
      ))}
    </div>
  )
}

function ScenarioCards({ data }: { data: FinanceAiInsightBundle }) {
  const { format: formatMoney } = useSchoolMoney()
  const s = data.forecast.scenarios
  if (!s.base && !s.optimistic && !s.pessimistic) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Pessimiste', value: s.pessimistic, cls: 'text-rose-200' },
        { label: 'Central', value: s.base || data.forecast.expectedTotal, cls: 'text-white' },
        { label: 'Optimiste', value: s.optimistic, cls: 'text-emerald-200' },
      ].map((row) => (
        <div key={row.label} className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 text-center">
          <p className="text-[10px] uppercase text-slate-500">{row.label}</p>
          <p className={cn('text-sm font-bold tabular-nums mt-1', row.cls)}>
            {formatMoney(row.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

const AGING_LABELS: Array<{ key: keyof FinanceAiAgingBuckets; label: string }> = [
  { key: 'b0_30', label: '0–30 j' },
  { key: 'b31_60', label: '31–60 j' },
  { key: 'b61_90', label: '61–90 j' },
  { key: 'b90_plus', label: '90+ j' },
]

function ForecastSparkline({
  points,
}: {
  points: FinanceAiInsightBundle['forecast']['points']
}) {
  if (points.length < 2) return null
  const max = Math.max(...points.map((p) => p.high), 1)
  const w = 240
  const h = 48
  const step = w / Math.max(1, points.length - 1)
  const mid = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (p.expectedAmount / max) * (h - 4) - 2}`)
    .join(' ')
  const bandHigh = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (p.high / max) * (h - 4) - 2}`)
    .join(' ')
  const bandLow = [...points]
    .reverse()
    .map(
      (p, i) =>
        `${i === 0 ? 'L' : 'L'}${(points.length - 1 - i) * step},${h - (p.low / max) * (h - 4) - 2}`,
    )
    .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" aria-hidden>
      <path d={`${bandHigh} ${bandLow} Z`} fill="rgba(129,140,248,0.2)" />
      <path d={mid} fill="none" stroke="rgb(167,243,208)" strokeWidth="2" />
    </svg>
  )
}

function AgingBars({ aging, totalDebt }: { aging: FinanceAiAgingBuckets; totalDebt: number }) {
  const { format: formatMoney } = useSchoolMoney()
  const base = totalDebt > 0 ? totalDebt : 1
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Aging créances (DPD)
      </p>
      <div className="space-y-1.5">
        {AGING_LABELS.map(({ key, label }) => {
          const amount = aging[key].amount
          const pct = Math.min(100, (amount / base) * 100)
          return (
            <div key={key} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
              <span className="text-[10px] text-slate-400 tabular-nums">{label}</span>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    key === 'b90_plus'
                      ? 'bg-rose-400'
                      : key === 'b61_90'
                        ? 'bg-amber-400'
                        : key === 'b31_60'
                          ? 'bg-indigo-300'
                          : 'bg-emerald-400',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-300 tabular-nums text-right min-w-[4.5rem]">
                {formatMoney(amount)}
                <span className="text-slate-500"> · {aging[key].count}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PortfolioKpis({ data }: { data: FinanceAiInsightBundle }) {
  const { format: formatMoney } = useSchoolMoney()
  const p = data.portfolio
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {[
        { label: 'Délai d’encaissement', value: `${p.dsoDays} j`, sub: 'jours moyens' },
        { label: 'Impayés 90+ j', value: `${p.nplRatioPct}%`, sub: 'créances longues' },
        { label: 'Perte estimée', value: formatMoney(p.expectedLoss), sub: `couverture ${p.coverageRatioPct}%` },
        {
          label: 'Pression aging',
          value: `${p.agingPressure}/100`,
          sub: `cash ${p.cashSharePct}% · HHI ${p.methodHhi}`,
        },
      ].map((kpi) => (
        <div key={kpi.label} className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {kpi.label}
          </p>
          <p className="mt-1 text-sm font-bold tabular-nums text-white">{kpi.value}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">{kpi.sub}</p>
        </div>
      ))}
    </div>
  )
}

export function FinanceAiInsightsPanel({
  enabled = true,
  source = 'admin',
}: {
  enabled?: boolean
  source?: 'admin' | 'finance'
}) {
  const { format: formatMoney } = useSchoolMoney()
  const [horizon, setHorizon] = useState<FinanceAiHorizon>(30)
  const adminQuery = useFinanceAiInsights(horizon, {
    enabled: enabled && source === 'admin',
  })
  const financeQuery = useFinanceRoleAiInsights(horizon, {
    enabled: enabled && source === 'finance',
  })
  const { data, isLoading, isFetching, refetch, isError } =
    source === 'finance' ? financeQuery : adminQuery

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white shadow-xl shadow-indigo-900/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(129,140,248,0.25),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.15),_transparent_50%)]" />

      <div className="relative px-5 sm:px-6 pt-5 pb-4 border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain size={18} className="text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Intelligence financière</h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Prévisions, risque et scénarios
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
              {([7, 30, 90] as FinanceAiHorizon[]).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors',
                    horizon === h ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white',
                  )}
                >
                  {h}j
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              Recalculer
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-5 sm:px-6 py-5 space-y-5">
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-16 rounded-xl bg-white/5" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 rounded-xl bg-white/5" />
              <div className="h-16 rounded-xl bg-white/5" />
            </div>
          </div>
        )}

        {isError && (
          <p className="text-sm text-rose-200">
            Impossible de charger l&apos;intelligence financière. Réessayez.
          </p>
        )}

        {data && !isLoading && (
          <>
            <ExecutiveHeader data={data} />

            <div>
              <p className="text-base sm:text-lg font-semibold text-white leading-snug">
                {data.headline}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                {data.narrative}
              </p>
              <p className="mt-2 text-[10px] text-slate-400">
                Confiance {data.confidencePct}% · estimation, pas une garantie
              </p>
            </div>

            <BenchmarkStrip data={data} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                {
                  label: `Prévision ${data.forecast.horizonDays}j`,
                  value: formatMoney(data.forecast.expectedTotal),
                  sub: `${formatMoney(data.forecast.lowTotal)} – ${formatMoney(data.forecast.highTotal)}`,
                },
                {
                  label: 'Écart à combler',
                  value: formatMoney(data.forecast.vsTargetGap),
                  sub: `recouvrable ${formatMoney(data.portfolio.collectibleDebt)}`,
                },
                {
                  label: 'EWMA / tendance',
                  value: formatMoney(data.forecast.ewmaLevel),
                  sub:
                    data.forecast.trendPerDay >= 0
                      ? `+${formatMoney(data.forecast.trendPerDay)}/j`
                      : `${formatMoney(data.forecast.trendPerDay)}/j`,
                },
                {
                  label: 'Pending',
                  value: formatMoney(data.portfolio.pendingAmount),
                  sub: `${data.portfolio.pendingCount} · lag ${data.portfolio.medianSettlementHours}h`,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-white">{kpi.value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {data.forecast.points.length > 1 && (
              <div className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Courbe & scénarios {data.forecast.horizonDays}j
                </p>
                <ForecastSparkline points={data.forecast.points} />
                <ScenarioCards data={data} />
              </div>
            )}

            <PortfolioKpis data={data} />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10 space-y-3">
                <AgingBars aging={data.portfolio.aging} totalDebt={data.portfolio.totalDebt} />
                {data.portfolio.contractualOverdueAmount > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                      Contractuel (dueDate)
                    </p>
                    <AgingBars
                      aging={data.portfolio.contractualAging}
                      totalDebt={data.portfolio.contractualOverdueAmount}
                    />
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                  <Activity size={12} />
                  Mix & signaux
                </p>
                {data.portfolio.methodMix.length > 0 ? (
                  <div className="space-y-1">
                    {data.portfolio.methodMix.slice(0, 4).map((m) => (
                      <div
                        key={m.method}
                        className="flex items-center justify-between text-[11px] text-slate-300"
                      >
                        <span>{m.method}</span>
                        <span className="tabular-nums">
                          {m.sharePct}% · {formatMoney(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">Pas assez d’encaissements 30 j.</p>
                )}
                {data.anomalies.length > 0 && (
                  <div className="pt-2 space-y-1 border-t border-white/10">
                    {data.anomalies.map((a) => (
                      <div
                        key={`${a.date}-${a.direction}`}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <AlertTriangle
                            size={11}
                            className={
                              a.direction === 'SPIKE' ? 'text-emerald-300' : 'text-rose-300'
                            }
                          />
                          {a.date} · {a.direction === 'SPIKE' ? 'pic' : 'chute'}
                        </span>
                        <span className="tabular-nums text-slate-200">
                          {formatMoney(a.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 pt-1">
                  Enc. 30 j {formatMoney(data.portfolio.collectedLast30d)}
                  {data.portfolio.moratoriumCount > 0
                    ? ` · ${data.portfolio.moratoriumCount} moratoire(s)`
                    : ''}
                  {data.portfolio.stalePendingCount > 0
                    ? ` · ${data.portfolio.stalePendingCount} en attente > 72 h`
                    : ''}
                </p>
              </div>
            </div>

            {data.portfolio.classHotspots.length > 0 && (
              <div className="rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Classes à surveiller
                </p>
                {data.portfolio.classHotspots.slice(0, 4).map((h) => (
                  <div
                    key={h.className}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="text-slate-200 truncate">{h.className}</span>
                    <span className="tabular-nums text-slate-300 shrink-0">
                      {h.efficiencyPct}% · {formatMoney(h.debt)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {data.opportunities.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {data.opportunities.map((opp) => (
                  <div
                    key={opp.code}
                    className={cn(
                      'rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10',
                      opp.severity === 'critical' && 'ring-rose-400/40',
                      opp.severity === 'warning' && 'ring-amber-400/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-indigo-100">{opp.title}</p>
                      <span className="shrink-0 text-[10px] font-bold text-emerald-300 tabular-nums">
                        {opp.impactLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">{opp.message}</p>
                    {opp.href && (
                      <Link
                        href={rewriteFinanceDeepLink(opp.href, source) ?? opp.href}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
                      >
                        Ouvrir <ArrowRight size={11} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.collectionActions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <TrendingUp size={12} />
                  Priorités scoring risque
                </div>
                {data.collectionActions.slice(0, 6).map((action) => {
                  const Icon = CHANNEL_ICON[action.recommendedChannel]
                  return (
                    <div
                      key={action.studentId}
                      className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">
                            {action.studentName}
                          </p>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                              PRIORITY_CLS[action.priority],
                            )}
                          >
                            {action.priority}
                          </span>
                          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-100 ring-1 ring-indigo-400/30 tabular-nums">
                            risk {action.riskScore}
                          </span>
                          {action.hasActiveMoratorium && (
                            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-100 ring-1 ring-sky-400/30">
                              moratoire
                            </span>
                          )}
                          {action.remindersWithoutPay14d >= 3 && (
                            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-100 ring-1 ring-rose-400/30">
                              fatigue ×{action.remindersWithoutPay14d}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{action.dpdBucket}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {action.className ?? 'Sans classe'} · dette{' '}
                          {formatMoney(action.debtAmount)} · récup.{' '}
                          {formatMoney(action.expectedRecovery)} ({action.recoverabilityPct}%) ·
                          Perte estimée {formatMoney(action.expectedLoss)}
                        </p>
                        <p className="text-[11px] text-indigo-200 mt-0.5 flex items-center gap-1">
                          <Icon size={11} />
                          {action.recommendedAction}
                        </p>
                      </div>
                      <Link
                        href={rewriteFinanceDeepLink(action.href, source) ?? action.href}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-400"
                      >
                        Voir fiche
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
