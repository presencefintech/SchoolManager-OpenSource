'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { analyticsApi } from '@/lib/superAdmin/api/analytics.api'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function ChurnAnalyticsPanel() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['superadmin', 'analytics', 'master'],
    queryFn: analyticsApi.getMasterDashboard,
    staleTime: 120_000,
  })

  if (isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex justify-between items-center">
        <span>Analytics churn indisponibles.</span>
        <button type="button" onClick={() => refetch()} className="underline font-medium">
          Réessayer
        </button>
      </div>
    )
  }

  const { summary, churnRisks } = data
  const trendUp = summary.trends.trend === 'UP'

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Rétention & churn
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Activité audit 7j vs semaine précédente</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-[10px] uppercase text-zinc-400 font-semibold">Croissance revenus</p>
            <p
              className={cn(
                'font-bold tabular-nums flex items-center gap-1 justify-end',
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
      </div>

      {churnRisks.length === 0 ? (
        <p className="px-5 py-6 text-sm text-emerald-700 bg-emerald-50/50">
          Aucun établissement en risque de churn détecté cette semaine.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 max-h-[220px] overflow-y-auto">
          {churnRisks.slice(0, 8).map((r) => (
            <li key={r.schoolName} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{r.schoolName}</p>
                <p className="text-xs text-zinc-500">
                  {r.currentActivity} événements · variation {r.dropRate}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                AT_RISK
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
        <Link
          href="/super-admin/operations?tab=monitoring"
          className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
        >
          Centre opérations <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
