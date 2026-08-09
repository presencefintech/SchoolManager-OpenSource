'use client'

import { useMemo, useState } from 'react'
import { Building2, Crown, Network } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { adminNetworkApi } from '@/lib/superAdmin/api/school-network.api'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function monthBoundsIso(): { from: string; to: string } {
  const now = new Date()
  return {
    from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function lastNDaysBounds(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (days - 1))
  return { from: toIso(from), to: toIso(to) }
}

type PeriodPreset = 'month' | '7d' | '30d' | 'custom'

export default function AdminFinanceNetworkPage() {
  const month = monthBoundsIso()
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [customFrom, setCustomFrom] = useState(month.from)
  const [customTo, setCustomTo] = useState(month.to)

  const period = useMemo(() => {
    if (preset === '7d') return lastNDaysBounds(7)
    if (preset === '30d') return lastNDaysBounds(30)
    if (preset === 'custom') return { from: customFrom, to: customTo }
    return monthBoundsIso()
  }, [preset, customFrom, customTo])

  const { data: network, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'finance', 'network'],
    queryFn: adminNetworkApi.getContext,
    staleTime: 60_000,
  })

  const {
    data: clearing,
    isLoading: clearingLoading,
    isError: clearingError,
    refetch: refetchClearing,
  } = useQuery({
    queryKey: ['admin', 'finance', 'network', 'clearing', period.from, period.to],
    queryFn: () => adminNetworkApi.getClearing(period),
    enabled: Boolean(network?.groupId) && Boolean(period.from) && Boolean(period.to),
    staleTime: 60_000,
  })

  const ops = network?.ops
  const localTodayAmount = ops
    ? Math.max(0, ops.collectedToday.amount - ops.crossSiteToday.amount)
    : 0
  const localTodayCount = ops
    ? Math.max(0, ops.collectedToday.count - ops.crossSiteToday.count)
    : 0
  const hub = network?.sites.find((s) => s.isPaymentHub)
  const satellites = network?.sites.filter((s) => !s.isPaymentHub) ?? []

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Réseau & caisse hub"
        subtitle="Vue multi-sites — collecte locale vs cross-site et clearing inter-campus"
      />

      {isLoading ? (
        <p className="text-sm text-zinc-400 animate-pulse">Chargement du réseau…</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger le réseau.{' '}
          <button type="button" onClick={() => refetch()} className="underline font-medium">
            Réessayer
          </button>
        </div>
      ) : !network?.groupId ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center space-y-2">
          <Network size={32} className="mx-auto text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">Aucun réseau configuré</p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Votre établissement n&apos;appartient pas encore à un groupe multi-sites.
            Contactez le Super Admin.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Réseau</p>
            <p className="text-lg font-bold text-sky-950 mt-0.5">{network.groupName}</p>
            <p className="text-sm text-sky-800/80 mt-1">
              Connecté sur{' '}
              <span className="font-medium">{network.collectionSiteName}</span>
              {network.isPaymentHub ? ' (caisse hub)' : ''}
              {network.canCollectCrossSite
                ? ' — encaissement multi-sites autorisé'
                : ' — encaissement local uniquement'}
            </p>
          </div>

          {ops ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Collecté aujourd'hui"
                amount={ops.collectedToday.amount}
                count={ops.collectedToday.count}
              />
              <KpiCard
                label="Local (jour)"
                amount={localTodayAmount}
                count={localTodayCount}
                tone="neutral"
              />
              <KpiCard
                label="Cross-site (jour)"
                amount={ops.crossSiteToday.amount}
                count={ops.crossSiteToday.count}
                tone="amber"
              />
              <KpiCard
                label="Cross-site (mois)"
                amount={ops.crossSiteMonth.amount}
                count={ops.crossSiteMonth.count}
                tone="violet"
              />
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-3">
              Carte des sites
            </p>
            <div className="flex flex-col items-center gap-3">
              {hub ? (
                <MapNode
                  title={hub.name}
                  subtitle={hub.city ?? 'Caisse hub'}
                  badge="Hub"
                  tone="hub"
                  current={hub.isCurrentSite}
                />
              ) : (
                <MapNode title="Hub non défini" subtitle="Configurer via Super Admin" tone="warn" />
              )}
              {satellites.length > 0 ? (
                <>
                  <div className="h-5 w-px bg-zinc-300" />
                  <div className="flex flex-wrap justify-center gap-3 w-full">
                    {satellites.map((site) => (
                      <MapNode
                        key={site.id}
                        title={site.name}
                        subtitle={site.city ?? 'Campus'}
                        tone="site"
                        current={site.isCurrentSite}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {ops && ops.byEnrollmentCampusToday.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide border-b border-zinc-100">
                Répartition jour par campus d&apos;inscription
              </div>
              <ul className="divide-y divide-zinc-50">
                {ops.byEnrollmentCampusToday.map((row) => (
                  <li
                    key={row.enrollmentSchoolId}
                    className="px-5 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-zinc-800">{row.enrollmentSchoolName}</span>
                    <span className="tabular-nums font-semibold text-zinc-900">
                      {formatMoney(row.amount)}
                      <span className="text-zinc-400 font-normal text-xs ml-1">
                        · {row.count}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-violet-100 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-violet-50 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide">
                    Clearing inter-sites
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Période {period.from} → {period.to} · lecture seule (pas de règlement journalisé)
                  </p>
                </div>
                {clearing ? (
                  <p className="text-xs tabular-nums text-violet-900 font-medium">
                    Cross-site : {formatMoney(clearing.crossSiteTotal.amount, clearing.currency)} ·{' '}
                    {clearing.crossSiteTotal.count} px
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    ['month', 'Mois courant'],
                    ['7d', '7 jours'],
                    ['30d', '30 jours'],
                    ['custom', 'Personnalisé'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium border transition',
                      preset === key
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {preset === 'custom' ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="text-xs text-zinc-500">
                    Du{' '}
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="ml-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    au{' '}
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="ml-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            {clearingLoading ? (
              <p className="px-5 py-4 text-sm text-zinc-400 animate-pulse">Calcul du clearing…</p>
            ) : clearingError ? (
              <div className="px-5 py-4 text-sm text-red-600">
                Clearing indisponible.{' '}
                <button type="button" onClick={() => refetchClearing()} className="underline">
                  Réessayer
                </button>
              </div>
            ) : clearing ? (
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-zinc-700">{clearing.summaryLabel}</p>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div className="rounded-xl bg-zinc-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
                      Local (site de collecte)
                    </p>
                    <p className="font-semibold tabular-nums text-zinc-900 mt-0.5">
                      {formatMoney(clearing.localCollected.amount, clearing.currency)}
                      <span className="text-zinc-400 font-normal text-xs ml-1">
                        · {clearing.localCollected.count}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-violet-50/80 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-violet-700/70 font-semibold">
                      Dû aux campus (hub → sites)
                    </p>
                    <p className="font-semibold tabular-nums text-violet-950 mt-0.5">
                      {formatMoney(clearing.crossSiteTotal.amount, clearing.currency)}
                      <span className="text-violet-700/60 font-normal text-xs ml-1">
                        · {clearing.crossSiteTotal.count}
                      </span>
                    </p>
                  </div>
                </div>
                {clearing.positions.length > 0 ? (
                  <ul className="divide-y divide-zinc-50 rounded-xl border border-zinc-100 overflow-hidden">
                    {clearing.positions.map((row) => (
                      <li
                        key={row.enrollmentSchoolId}
                        className="px-3 py-2.5 flex items-center justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="text-zinc-800 font-medium">{row.enrollmentSchoolName}</p>
                          <p className="text-[11px] text-zinc-400">Hub doit au campus</p>
                        </div>
                        <span className="tabular-nums font-semibold text-zinc-900">
                          {formatMoney(row.amountDueToCampus, row.currency)}
                          <span className="text-zinc-400 font-normal text-xs ml-1">
                            · {row.paymentCount}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">Aucun encaissement cross-site sur la période.</p>
                )}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-zinc-500">Clearing indisponible.</p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white divide-y divide-zinc-100">
            <div className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Sites du réseau ({network.sites.length})
            </div>
            {network.sites.map((site) => (
              <div
                key={site.id}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg bg-zinc-100 p-2">
                    <Building2 size={16} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{site.name}</p>
                    <p className="text-xs text-zinc-400">{site.city ?? 'Ville non renseignée'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {site.isCurrentSite ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      Session actuelle
                    </span>
                  ) : null}
                  {site.isPaymentHub ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900">
                      <Crown size={10} /> Caisse hub
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            Au guichet, seule la caisse hub peut rechercher et encaisser pour les élèves inscrits
            sur un autre site. Le solde est crédité sur le site d&apos;inscription ; le rapport Z
            reste sur le site de collecte. Le clearing indique ce que le hub doit reverser /
            consolider envers chaque campus.
          </p>
        </div>
      )}
    </FinancePageShell>
  )
}

function KpiCard({
  label,
  amount,
  count,
  tone = 'default',
}: {
  label: string
  amount: number
  count: number
  tone?: 'default' | 'neutral' | 'amber' | 'violet'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        tone === 'default' && 'border-zinc-200 bg-white',
        tone === 'neutral' && 'border-zinc-200 bg-zinc-50/70',
        tone === 'amber' && 'border-amber-100 bg-amber-50/50',
        tone === 'violet' && 'border-violet-100 bg-violet-50/40',
      )}
    >
      <p
        className={cn(
          'text-[10px] uppercase tracking-wide font-semibold',
          tone === 'amber' ? 'text-amber-700/70' : tone === 'violet' ? 'text-violet-700/70' : 'text-zinc-400',
        )}
      >
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums text-zinc-900 mt-1">{formatMoney(amount)}</p>
      <p className="text-xs text-zinc-500">{count} paiement(s)</p>
    </div>
  )
}

function MapNode({
  title,
  subtitle,
  badge,
  tone,
  current,
}: {
  title: string
  subtitle: string
  badge?: string
  tone: 'hub' | 'site' | 'warn'
  current?: boolean
}) {
  return (
    <div
      className={cn(
        'min-w-[170px] max-w-[250px] rounded-xl border px-3 py-2.5 text-center',
        tone === 'hub' && 'border-amber-200 bg-amber-50',
        tone === 'site' && 'border-sky-200 bg-sky-50/80',
        tone === 'warn' && 'border-dashed border-amber-300 bg-amber-50/40',
      )}
    >
      <div className="flex items-center justify-center gap-1.5">
        {tone === 'hub' ? <Crown size={12} className="text-amber-700" /> : <Building2 size={12} className="text-sky-700" />}
        <p className="text-xs font-semibold text-zinc-900 truncate">{title}</p>
      </div>
      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-1">
        {badge ? (
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-900">
            {badge}
          </span>
        ) : null}
        {current ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-800">
            Session
          </span>
        ) : null}
      </div>
    </div>
  )
}
