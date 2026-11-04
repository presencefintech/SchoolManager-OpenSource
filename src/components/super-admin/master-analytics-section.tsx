'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronRight,
  Crown,
  MapPin,
  Server,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { analyticsApi, type MasterDashboardAnalytics } from '@/lib/superAdmin/api/analytics.api'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/currency'
import { lifecycleStatusLabel } from '@/lib/i18n/display-labels'

function useMasterAnalytics() {
  return useQuery({
    queryKey: ['superadmin', 'analytics', 'master'],
    queryFn: analyticsApi.getMasterDashboard,
    staleTime: 120_000,
  })
}

function PanelShell({
  title,
  subtitle,
  icon: Icon,
  iconClass,
  children,
  footer,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  iconClass?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[280px]">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <Icon size={16} className={iconClass ?? 'text-zinc-500'} />
          {title}
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex-1">{children}</div>
      {footer ? (
        <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">{footer}</div>
      ) : null}
    </div>
  )
}

function InfraStrip({ data }: { data: MasterDashboardAnalytics }) {
  const { summary, infrastructure } = data
  const healthy =
    summary.systemStatus === 'HEALTHY' ||
    summary.systemStatus === 'OK' ||
    summary.systemStatus === 'STABLE'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Statut système</p>
        <p
          className={cn(
            'mt-1 text-lg font-bold',
            healthy ? 'text-emerald-700' : 'text-amber-700',
          )}
        >
          {summary.systemStatus}
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Score infra</p>
        <p className="mt-1 text-lg font-bold text-zinc-900 tabular-nums">{infrastructure.score}</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Taux d&apos;erreur 24h</p>
        <p className="mt-1 text-lg font-bold text-zinc-900 tabular-nums">{infrastructure.errorRate}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">{infrastructure.errors} erreurs</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Revenus confirmés</p>
        <p className="mt-1 text-lg font-bold text-zinc-900 tabular-nums">
          {formatMoney(summary.totalRevenue)}
        </p>
      </div>
    </div>
  )
}

function ChurnPanel({ data }: { data: MasterDashboardAnalytics }) {
  const { summary, churnRisks } = data
  const trendUp = summary.trends.trend === 'UP'

  return (
    <PanelShell
      title="Rétention & churn"
      subtitle="Activité audit 7j vs semaine précédente"
      icon={AlertTriangle}
      iconClass="text-amber-500"
      footer={
        <Link
          href="/super-admin/operations?tab=monitoring"
          className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
        >
          Centre opérations <ChevronRight size={12} />
        </Link>
      }
    >
      <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-zinc-50">
        <div>
          <p className="text-[10px] uppercase text-zinc-400 font-semibold">Croissance revenus</p>
          <p
            className={cn(
              'font-bold tabular-nums flex items-center gap-1',
              trendUp ? 'text-emerald-700' : 'text-red-600',
            )}
          >
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {summary.trends.revenueGrowth}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-zinc-400 font-semibold">À risque</p>
          <p className="font-bold tabular-nums text-amber-700">{summary.criticalAlerts}</p>
        </div>
      </div>
      {churnRisks.length === 0 ? (
        <p className="px-5 py-6 text-sm text-emerald-700 bg-emerald-50/50">
          Aucun établissement en risque de churn détecté cette semaine.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 max-h-[200px] overflow-y-auto">
          {churnRisks.slice(0, 8).map((r) => (
            <li key={r.schoolName} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{r.schoolName}</p>
                <p className="text-xs text-zinc-500">
                  {r.currentActivity} événements · variation {r.dropRate}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {lifecycleStatusLabel('AT_RISK')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  )
}

function VipPanel({ data }: { data: MasterDashboardAnalytics }) {
  const { vips } = data

  return (
    <PanelShell
      title="Top clients VIP"
      subtitle="Classement par revenus confirmés"
      icon={Crown}
      iconClass="text-amber-600"
      footer={
        <Link
          href="/super-admin/schools"
          className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
        >
          Voir les établissements <ChevronRight size={12} />
        </Link>
      }
    >
      {vips.length === 0 ? (
        <p className="px-5 py-8 text-sm text-zinc-400 text-center">Aucun client VIP pour le moment.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 max-h-[240px] overflow-y-auto">
          {vips.slice(0, 8).map((v, i) => (
            <li key={v.id}>
              <Link
                href={`/super-admin/schools/${v.id}`}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-500 flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{v.name}</p>
                    <p className="text-xs text-zinc-500">
                      {v.students.toLocaleString('fr-FR')} élèves · {v.tier}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-zinc-900 tabular-nums shrink-0">{v.revenue}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  )
}

function MarketPanel({ data }: { data: MasterDashboardAnalytics }) {
  const markets = [...data.marketAnalysis].sort((a, b) => b.activeSchools - a.activeSchools)

  return (
    <PanelShell
      title="Couverture marché"
      subtitle="Établissements actifs par ville"
      icon={MapPin}
      iconClass="text-indigo-500"
    >
      {markets.length === 0 ? (
        <p className="px-5 py-8 text-sm text-zinc-400 text-center">Pas encore de données géo.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 max-h-[240px] overflow-y-auto">
          {markets.slice(0, 10).map((m) => (
            <li key={m.province} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{m.province}</p>
                <p className="text-xs text-zinc-500">Pénétration {m.penetration}</p>
              </div>
              <span className="text-sm font-bold text-zinc-900 tabular-nums shrink-0">
                {m.activeSchools}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  )
}

export function MasterAnalyticsSection() {
  const { data, isLoading, isError, refetch } = useMasterAnalytics()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex justify-between items-center">
        <span className="inline-flex items-center gap-2">
          <Server size={14} /> Analytics propriétaire indisponibles.
        </span>
        <button type="button" onClick={() => refetch()} className="underline font-medium">
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Intelligence</p>
          <h2 className="text-base font-semibold text-zinc-900 mt-0.5">Analytics propriétaire</h2>
        </div>
      </div>
      <InfraStrip data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChurnPanel data={data} />
        <VipPanel data={data} />
        <MarketPanel data={data} />
      </div>
    </div>
  )
}
