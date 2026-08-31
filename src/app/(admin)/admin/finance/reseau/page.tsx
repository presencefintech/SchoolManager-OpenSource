'use client'

import { useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  Crown,
  Network,
  Radio,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { adminNetworkApi } from '@/lib/superAdmin/api/school-network.api'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { NetworkOpsBriefingPanel } from '@/components/finance/network-ops-briefing-panel'
import { CashLiveTape } from '@/components/finance/cash-live-tape'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
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
  const { status: liveStatus, recentCashActivity } = useAdminRealtimeStatus()

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

  const { data: treasury } = useQuery({
    queryKey: ['admin', 'finance', 'network', 'treasury'],
    queryFn: adminNetworkApi.getTreasury,
    enabled: Boolean(network?.groupId),
    staleTime: 15_000,
    refetchInterval: liveStatus === 'live' ? 60_000 : 20_000,
  })

  const { data: briefing } = useQuery({
    queryKey: ['admin', 'finance', 'network', 'ops-briefing'],
    queryFn: adminNetworkApi.getOpsBriefing,
    enabled: Boolean(network?.groupId),
    staleTime: 20_000,
    refetchInterval: liveStatus === 'live' ? 60_000 : 20_000,
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
  const treasuryById = new Map((treasury?.sites ?? []).map((s) => [s.id, s]))

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Console groupe"
        subtitle="Un logiciel, plusieurs écoles — le promoteur voit le réseau ; chaque caissier reste sur son site"
        accent="slate"
        badge={
          liveStatus === 'live' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              <Radio size={10} className="text-emerald-600" /> Direct
            </span>
          ) : null
        }
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
          <p className="text-sm font-medium text-zinc-600">Aucun groupe multi-écoles</p>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Pour superviser plusieurs établissements comme une entreprise (une console, des caisses
            isolées par site), le Super Admin rattache vos écoles à un même groupe.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-900 px-5 py-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Groupe scolaire
            </p>
            <p className="text-lg font-bold mt-0.5">{network.groupName}</p>
            <p className="text-sm text-slate-300 mt-1">
              Connecté sur{' '}
              <span className="font-medium text-white">{network.collectionSiteName}</span>
              {network.isPaymentHub ? ' · caisse hub' : ''}
              {network.canCollectCrossSite
                ? ' · encaissement multi-sites autorisé'
                : ' · encaissement local uniquement'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-200">
                <ShieldCheck size={12} className="text-emerald-400" />
                Caissier = son école uniquement
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-slate-200">
                <Building2 size={12} className="text-sky-300" />
                Promoteur = toutes les écoles du groupe
              </span>
            </div>
          </div>

          {briefing ? <NetworkOpsBriefingPanel briefing={briefing} /> : null}

          {treasury ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Encaissé groupe (jour)"
                  amount={treasury.totals.collectedToday}
                  count={treasury.totals.paymentCountToday}
                  delta={treasury.totals.vsYesterdayPct}
                />
                <KpiCard
                  label="Reste à payer (groupe)"
                  amount={treasury.totals.feesBalance}
                  count={treasury.totals.debtorCount}
                  tone="amber"
                  countLabel="élève(s) débiteur(s)"
                />
                <KpiCard
                  label="Encaissé mois"
                  amount={treasury.totals.collectedMonth}
                  count={treasury.totals.paymentCountMonth}
                  tone="violet"
                />
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-zinc-400">
                    Recouvrement groupe
                  </p>
                  <p className="text-lg font-bold tabular-nums text-zinc-900 mt-1">
                    {treasury.totals.collectionRate}%
                  </p>
                  <RateBar value={treasury.totals.collectionRate} />
                  <p className="text-xs text-zinc-500 mt-1">
                    Payé {formatMoney(treasury.totals.feesPaid)} · {treasury.totals.studentCount}{' '}
                    élèves
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatChip
                  icon={Wallet}
                  label="Caisses ouvertes"
                  value={`${treasury.totals.sitesOpen} / ${treasury.totals.siteCount}`}
                  hint="sites du groupe"
                />
                <StatChip
                  icon={Users}
                  label="Présents aujourd’hui"
                  value={`${treasury.totals.presentToday}${treasury.totals.attendanceRate != null ? ` · ${treasury.totals.attendanceRate}%` : ''}`}
                  hint={`sur ${treasury.totals.studentCount} élèves`}
                />
                <StatChip
                  icon={Smartphone}
                  label="SMS en attente"
                  value={String(treasury.totals.pendingSms)}
                  hint="déclarations à valider"
                  tone={treasury.totals.pendingSms > 0 ? 'warn' : 'ok'}
                  href={treasury.totals.pendingSms > 0 ? '/admin/finance/declarations' : undefined}
                />
                <StatChip
                  icon={ShieldCheck}
                  label="Santé / mix"
                  value={`${treasury.totals.healthScore ?? '—'} / 100`}
                  hint={`Mobile ${treasury.totals.digitalSharePct ?? 0}% · ticket ${formatMoney(treasury.totals.avgTicketToday ?? 0)}`}
                />
              </div>

              {treasury.totals.focusSchoolName ? (
                <p className="text-xs text-zinc-600 rounded-xl border border-zinc-200 bg-white px-4 py-2">
                  Campus à suivre :{' '}
                  <span className="font-semibold text-zinc-900">{treasury.totals.focusSchoolName}</span>
                  {treasury.totals.oldestPendingSmsMinutes != null && treasury.totals.pendingSms > 0
                    ? ` · SMS le plus ancien ${treasury.totals.oldestPendingSmsMinutes} min`
                    : ''}
                </p>
              ) : null}

              {treasury.methodsToday.length > 0 ? (
                <MethodMixBar methods={treasury.methodsToday} total={treasury.totals.collectedToday} />
              ) : null}

              {treasury.alerts.length > 0 ? (
                <ul className="space-y-2">
                  {treasury.alerts.map((alert, i) => (
                    <li
                      key={`${alert.code}-${alert.schoolId ?? 'g'}-${i}`}
                      className={cn(
                        'rounded-xl border px-4 py-2.5 text-sm flex items-start gap-2',
                        alert.severity === 'critical' && 'border-red-200 bg-red-50 text-red-900',
                        alert.severity === 'warn' && 'border-amber-200 bg-amber-50 text-amber-950',
                        alert.severity === 'info' && 'border-sky-100 bg-sky-50 text-sky-950',
                      )}
                    >
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{alert.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}

          {ops ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 px-0.5">
                Site connecté ({network.collectionSiteName})
              </p>
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
            </div>
          ) : null}

          {treasury && treasury.sites.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {treasury.sites.map((site) => (
                <article
                  key={site.id}
                  className={cn(
                    'rounded-2xl border bg-white px-4 py-4',
                    site.sessionOpen ? 'border-emerald-200' : 'border-zinc-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{site.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {site.city ?? 'Campus'}
                        {site.cashierName ? ` · ${site.cashierName}` : ''}
                        {site.sessionOpen && site.sessionOpenMinutes != null
                          ? ` · ouverte ${site.sessionOpenMinutes} min`
                          : ''}
                        {site.minutesSinceLastPayment != null
                          ? ` · dernier paiement ${site.minutesSinceLastPayment} min`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {site.healthScore != null ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            site.healthScore >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : site.healthScore >= 40
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-red-100 text-red-800',
                          )}
                        >
                          Santé {site.healthScore}
                        </span>
                      ) : null}
                      {site.isPaymentHub ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                          <Crown size={10} /> Hub
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          site.sessionOpen
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {site.sessionOpen ? 'Caisse ouverte' : 'Fermée'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
                        Recouvrement
                      </p>
                      <p className="text-xs font-semibold tabular-nums text-zinc-700">
                        {site.collectionRate}%
                      </p>
                    </div>
                    <RateBar value={site.collectionRate} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <MiniStat
                      label="Encaissé jour"
                      value={formatMoney(site.collectedToday)}
                      hint={`${site.paymentCountToday} px · ${site.shareOfGroupPct}% du groupe${site.vsYesterdayPct != null ? ` · ${site.vsYesterdayPct >= 0 ? '+' : ''}${site.vsYesterdayPct}% vs hier` : ''}`}
                    />
                    <MiniStat label="Reste à payer" value={formatMoney(site.feesBalance)} hint={`${site.debtorCount} débiteur(s)`} />
                    <MiniStat
                      label="Espèces / mobile"
                      value={`${formatMoney(site.cashToday)} / ${formatMoney(site.mobileToday)}`}
                      hint={site.digitalSharePct != null ? `${site.digitalSharePct}% mobile · 7j ${formatMoney(site.collected7d ?? 0)}` : undefined}
                    />
                    <MiniStat
                      label="Présents"
                      value={`${site.presentToday} / ${site.studentCount}`}
                      hint={
                        site.attendanceRate != null
                          ? `${site.attendanceRate}%${site.pendingSms ? ` · ${site.pendingSms} SMS` : ''}`
                          : site.pendingSms > 0
                            ? `${site.pendingSms} SMS en attente`
                            : 'SMS à jour'
                      }
                    />
                  </dl>

                  {site.pendingSms > 0 ? (
                    <Link
                      href="/admin/finance/declarations"
                      className="mt-3 inline-flex text-[11px] font-medium text-amber-800 hover:underline"
                    >
                      Valider les déclarations SMS →
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {treasury && treasury.sites.length > 1 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide border-b border-zinc-100">
                Classement des campus — jour
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2">Campus</th>
                      <th className="text-right font-semibold px-3 py-2">Jour</th>
                      <th className="text-right font-semibold px-3 py-2">Vs hier</th>
                      <th className="text-right font-semibold px-3 py-2">7 j</th>
                      <th className="text-right font-semibold px-3 py-2">Reste</th>
                      <th className="text-right font-semibold px-3 py-2">Taux</th>
                      <th className="text-right font-semibold px-3 py-2">Présence</th>
                      <th className="text-right font-semibold px-3 py-2">Santé</th>
                      <th className="text-right font-semibold px-3 py-2">SMS</th>
                      <th className="text-right font-semibold px-4 py-2">Dernier px</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {[...treasury.sites]
                      .sort((a, b) => b.collectedToday - a.collectedToday)
                      .map((site) => (
                        <tr
                          key={site.id}
                          className={cn(
                            'text-zinc-800',
                            treasury.totals.focusSchoolId === site.id && 'bg-amber-50/70',
                          )}
                        >
                          <td className="px-4 py-2.5 font-medium">
                            {site.name}
                            {site.sessionOpen ? (
                              <span className="ml-2 text-[10px] text-emerald-700">ouverte</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatMoney(site.collectedToday)}
                          </td>
                          <td
                            className={cn(
                              'px-3 py-2.5 text-right tabular-nums',
                              (site.vsYesterdayPct ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700',
                            )}
                          >
                            {site.vsYesterdayPct == null
                              ? '—'
                              : `${site.vsYesterdayPct >= 0 ? '+' : ''}${site.vsYesterdayPct}%`}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatMoney(site.collected7d ?? 0)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatMoney(site.feesBalance)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{site.collectionRate}%</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {site.attendanceRate ?? '—'}%
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{site.healthScore ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{site.pendingSms}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                            {site.minutesSinceLastPayment != null
                              ? `${site.minutesSinceLastPayment} min`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <CashLiveTape
            items={recentCashActivity}
            live={liveStatus === 'live'}
            showSchool
            hrefBase="admin"
            emptyHint="Tous les paiements du groupe (espèces, mobile, SMS) — le caissier ne voit que son site."
          />

          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-3">
              Carte des sites
            </p>
            <div className="flex flex-col items-center gap-3">
              {hub ? (
                <MapNode
                  title={hub.name}
                  subtitle={
                    treasuryById.get(hub.id)
                      ? `${formatMoney(treasuryById.get(hub.id)!.collectedToday)} aujourd’hui`
                      : (hub.city ?? 'Caisse hub')
                  }
                  badge="Hub"
                  tone="hub"
                  current={hub.isCurrentSite}
                  sessionOpen={treasuryById.get(hub.id)?.sessionOpen}
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
                        subtitle={
                          treasuryById.get(site.id)
                            ? `${formatMoney(treasuryById.get(site.id)!.collectedToday)} aujourd’hui`
                            : (site.city ?? 'Campus')
                        }
                        tone="site"
                        current={site.isCurrentSite}
                        sessionOpen={treasuryById.get(site.id)?.sessionOpen}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500 text-center max-w-sm">
                  Un seul site dans le groupe. Ajoutez un campus pour vendre et piloter plusieurs
                  écoles sur le même logiciel.
                </p>
              )}
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
  countLabel = 'paiement(s)',
  delta,
}: {
  label: string
  amount: number
  count: number
  tone?: 'default' | 'neutral' | 'amber' | 'violet'
  countLabel?: string
  delta?: number | null
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
      <p className="text-xs text-zinc-500">
        {count} {countLabel}
      </p>
      {delta != null ? (
        <p className={cn('text-xs mt-0.5 font-medium', delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
          {delta >= 0 ? '+' : ''}
          {delta}% vs hier
        </p>
      ) : null}
    </div>
  )
}

function RateBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full',
          pct < 40 ? 'bg-red-500' : pct < 70 ? 'bg-amber-500' : 'bg-emerald-600',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900">{value}</dd>
      {hint ? <p className="text-[10px] text-zinc-400 mt-0.5">{hint}</p> : null}
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'ok',
  href,
}: {
  icon: ElementType
  label: string
  value: string
  hint: string
  tone?: 'ok' | 'warn'
  href?: string
}) {
  const body = (
    <div
      className={cn(
        'rounded-2xl border bg-white p-4 h-full',
        tone === 'warn' ? 'border-amber-200' : 'border-zinc-200',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide font-semibold text-zinc-400 flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </p>
      <p className="text-lg font-bold tabular-nums text-zinc-900 mt-1">{value}</p>
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  )
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {body}
      </Link>
    )
  }
  return body
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MPESA: 'M-Pesa',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
  BANK: 'Banque',
  CARD: 'Carte',
}

function MethodMixBar({
  methods,
  total,
}: {
  methods: Array<{ method: string; amount: number; count: number }>
  total: number
}) {
  const denom = total > 0 ? total : methods.reduce((s, m) => s + m.amount, 0)
  const colors = ['bg-emerald-600', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500', 'bg-zinc-400']
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">
        Canaux du jour (groupe)
      </p>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
        {methods.map((m, i) => (
          <div
            key={m.method}
            className={colors[i % colors.length]}
            style={{ width: `${denom > 0 ? (m.amount / denom) * 100 : 0}%` }}
            title={`${METHOD_LABELS[m.method] ?? m.method} ${m.amount}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600">
        {methods.map((m, i) => (
          <li key={m.method} className="inline-flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', colors[i % colors.length])} />
            {METHOD_LABELS[m.method] ?? m.method} · {formatMoney(m.amount)} ({m.count})
          </li>
        ))}
      </ul>
    </div>
  )
}

function MapNode({
  title,
  subtitle,
  badge,
  tone,
  current,
  sessionOpen,
}: {
  title: string
  subtitle: string
  badge?: string
  tone: 'hub' | 'site' | 'warn'
  current?: boolean
  sessionOpen?: boolean
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
        {sessionOpen ? (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
            Ouverte
          </span>
        ) : null}
      </div>
    </div>
  )
}
