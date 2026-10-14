'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  Landmark,
  Network,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { adminNetworkApi } from '@/lib/admin/network.api'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

export default function NetworkDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'network', 'consolidated-dashboard'],
    queryFn: adminNetworkApi.getConsolidatedDashboard,
    enabled: Boolean(user),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="h-28 animate-pulse rounded-3xl bg-zinc-100" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Network size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Tableau de bord réseau indisponible</p>
          <p className="mt-1 text-xs text-zinc-500">
            Vérifiez que votre compte est promoteur d’un groupe multi-campus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }

  const maxRevenue = Math.max(...data.campuses.map((c) => c.revenueUsd), 1)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-5 py-6 sm:px-7">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-200/30 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
              <Network size={12} />
              Réseau scolaire
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {data.networkName}
            </h1>
            <p className="max-w-xl text-sm text-zinc-600">
              Vue consolidée multi-campus · {data.campuses.length} établissement
              {data.campuses.length > 1 ? 's' : ''}
              {data.networkCode ? ` · code ${data.networkCode}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
            >
              <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
              Actualiser
            </button>
            <Link
              href="/admin/network/cfo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              <Landmark size={13} />
              Direction Générale
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/admin/network/transfers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
            >
              Registre des transferts
            </Link>
            <Link
              href="/admin/finance/reseau"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              Caisse & rapprochement
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          icon={TrendingUp}
          label="Recettes mois"
          value={formatMoney(data.totals.revenueUsd, 'USD')}
          tone="emerald"
        />
        <Kpi
          icon={Users}
          label="Effectif actif"
          value={String(data.totals.activeEnrollment)}
          hint={`Recouvrement ${data.totals.collectionRate}%`}
          tone="sky"
        />
        <Kpi
          icon={Building2}
          label="Présence globale"
          value={`${data.totals.attendanceRate}%`}
          tone="amber"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Campuses du groupe</h2>
            <p className="text-xs text-zinc-500">
              Recettes, recouvrement et présence — basculez via le sélecteur en tête de page.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.campuses.map((c) => (
            <article
              key={c.schoolId}
              className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-zinc-900">{c.schoolName}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.isPaymentHub ? (
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        Caisse hub
                      </span>
                    ) : (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        Campus
                      </span>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {formatMoney(c.revenueUsd, 'USD')}
                </p>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-500/90 transition-all"
                  style={{ width: `${Math.min(100, (c.revenueUsd / maxRevenue) * 100)}%` }}
                />
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Recouvrement" value={`${c.collectionRate}%`} />
                <Metric label="Effectif" value={String(c.activeEnrollment)} />
                <Metric
                  label="Présence"
                  value={`${c.attendanceRate}%`}
                  hint={`${c.presentToday} aujourd’hui`}
                />
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wallet size={15} className="text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Cash-flow consolidé</h2>
            <p className="text-[11px] text-zinc-500">6 derniers mois · USD & CDF</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {data.cashFlowByMonth.map((m) => (
            <div
              key={m.month}
              className="rounded-xl border border-zinc-100 bg-zinc-50/90 px-3 py-2.5"
            >
              <p className="text-[11px] font-medium text-zinc-500">{m.month}</p>
              <p className="text-sm font-semibold tabular-nums text-zinc-900">
                {formatMoney(m.usd, 'USD')}
              </p>
              <p className="text-[11px] tabular-nums text-zinc-500">
                {formatMoney(m.cdf, 'CDF')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          href="/admin/finance/reseau"
          title="Clearing inter-sites"
          description="Due-to / due-from, ops briefing et trésorerie groupe"
        />
        <QuickLink
          href="/finances/paiements"
          title="Guichet inter-sites"
          description="Encaisser un élève d’un autre campus du réseau"
        />
      </section>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
  tone: 'emerald' | 'sky' | 'amber'
}) {
  const tones = {
    emerald: 'from-emerald-50 to-white border-emerald-100',
    sky: 'from-sky-50 to-white border-sky-100',
    amber: 'from-amber-50 to-white border-amber-100',
  }
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-4', tones[tone])}>
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon size={14} />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-2 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-zinc-900">{value}</dd>
      {hint ? <p className="text-[10px] text-zinc-400">{hint}</p> : null}
    </div>
  )
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      <ArrowRight
        size={16}
        className="mt-0.5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
      />
    </Link>
  )
}
