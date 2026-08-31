'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  Link2,
  Network,
  Pencil,
  Plus,
  Power,
  Search,
  Unlink,
  Users,
  Wallet,
} from 'lucide-react'
import {
  schoolNetworkApi,
  type SchoolNetworkGroup,
  type SchoolNetworkMember,
  type SchoolNetworkOverview,
} from '@/lib/superAdmin/api/school-network.api'
import type { NetworkOpsBriefing, NetworkTreasuryLive } from '@/types/finance'
import { NetworkOpsBriefingPanel } from '@/components/finance/network-ops-briefing-panel'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

function money(amount: number, currency = 'USD') {
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`
}

export default function SchoolNetworksPage() {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [assignGroupId, setAssignGroupId] = useState<number | ''>('')
  const [assignSchoolId, setAssignSchoolId] = useState<number | ''>('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState<'all' | 'ready' | 'warn'>('all')
  const [unassignSchoolId, setUnassignSchoolId] = useState<number | null>(null)

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks'] })
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'schools'] })
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'overview'] })
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'treasury'] })
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'ops-briefing'] })
  }

  const { data: groups = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['superadmin', 'school-networks'],
    queryFn: schoolNetworkApi.listGroups,
  })

  const { data: schools = [] } = useQuery({
    queryKey: ['superadmin', 'school-networks', 'schools'],
    queryFn: schoolNetworkApi.listSchoolOptions,
  })

  const overviewGroupId = selectedGroupId ?? groups[0]?.id ?? null
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['superadmin', 'school-networks', 'overview', overviewGroupId],
    queryFn: () => schoolNetworkApi.getOverview(overviewGroupId!),
    enabled: overviewGroupId != null,
  })

  const { data: treasury } = useQuery({
    queryKey: ['superadmin', 'school-networks', 'treasury', overviewGroupId],
    queryFn: () => schoolNetworkApi.getTreasury(overviewGroupId!),
    enabled: overviewGroupId != null,
    staleTime: 15_000,
    refetchInterval: 20_000,
  })

  const { data: briefing } = useQuery({
    queryKey: ['superadmin', 'school-networks', 'ops-briefing', overviewGroupId],
    queryFn: () => schoolNetworkApi.getOpsBriefing(overviewGroupId!),
    enabled: overviewGroupId != null,
    staleTime: 20_000,
    refetchInterval: 30_000,
  })

  const createGroup = useMutation({
    mutationFn: () => schoolNetworkApi.createGroup({ name: newName.trim() }),
    onSuccess: (g) => {
      setNewName('')
      setSelectedGroupId(g.id)
      invalidate()
    },
  })

  const assignSchool = useMutation({
    mutationFn: () =>
      schoolNetworkApi.assignSchool({
        groupId: Number(assignGroupId),
        schoolId: Number(assignSchoolId),
      }),
    onSuccess: () => {
      setAssignSchoolId('')
      invalidate()
    },
  })

  const updateGroup = useMutation({
    mutationFn: (input: { groupId: number; name?: string; active?: boolean }) =>
      schoolNetworkApi.updateGroup(input.groupId, {
        name: input.name,
        active: input.active,
      }),
    onSuccess: invalidate,
  })

  const setHub = useMutation({
    mutationFn: (schoolId: number) => schoolNetworkApi.setPaymentHub(schoolId),
    onSuccess: invalidate,
  })

  const unassign = useMutation({
    mutationFn: (schoolId: number) => schoolNetworkApi.unassignSchool(schoolId),
    onSuccess: invalidate,
  })

  const unassignedSchools = schools.filter((s) => !s.groupId)
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups.filter((g) => {
      if (healthFilter === 'ready' && !g.health.readyForCrossSite) return false
      if (healthFilter === 'warn' && g.health.warnings.length === 0) return false
      if (!q) return true
      const hay = [
        g.name,
        g.slug,
        g.paymentHubName ?? '',
        ...g.schools.map((s) => `${s.name} ${s.city ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [groups, query, healthFilter])

  const totals = useMemo(() => {
    const sites = groups.reduce((n, g) => n + g.schools.length, 0)
    const students = groups.reduce(
      (n, g) => n + g.schools.reduce((s, school) => s + school.studentCount, 0),
      0,
    )
    const hubs = groups.filter((g) => g.paymentHubId).length
    const ready = groups.filter((g) => g.health.readyForCrossSite).length
    const cross30 = groups.reduce((n, g) => n + g.crossSiteLast30d.amount, 0)
    const crossCount = groups.reduce((n, g) => n + g.crossSiteLast30d.count, 0)
    return { networks: groups.length, sites, students, hubs, ready, cross30, crossCount }
  }, [groups])

  const busy = updateGroup.isPending || setHub.isPending || unassign.isPending

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Propriétaire · Super Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Cockpit réseaux</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Rattachez plusieurs écoles à un groupe pour vendre un logiciel unique. Le promoteur
            (ADMIN) voit la trésorerie du réseau en direct dans Admin → Console groupe ; chaque
            caissier reste isolé sur son établissement.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 min-w-[280px]">
          <StatChip label="Réseaux" value={String(totals.networks)} />
          <StatChip label="Prêts" value={String(totals.ready)} tone="ok" />
          <StatChip label="Sites" value={String(totals.sites)} />
          <StatChip label="Hubs" value={String(totals.hubs)} />
          <StatChip label="Élèves" value={String(totals.students)} />
          <StatChip
            label="Cross 30j"
            value={money(totals.cross30)}
            hint={`${totals.crossCount} paiements`}
            tone="amber"
          />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Plus size={16} /> Nouveau réseau
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex. Groupe Excellence"
              className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={newName.trim().length < 2 || createGroup.isPending}
              onClick={() => createGroup.mutate()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Créer
            </button>
          </div>
          {createGroup.isError ? (
            <p className="text-xs text-red-600">Création impossible. Vérifiez le nom.</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Link2 size={16} /> Rattacher un établissement
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={assignGroupId}
              onChange={(e) => setAssignGroupId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Réseau…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              value={assignSchoolId}
              onChange={(e) => setAssignSchoolId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Établissement…</option>
              {unassignedSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` (${s.city})` : ''} · {s.studentCount} él.
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!assignGroupId || !assignSchoolId || assignSchool.isPending}
              onClick={() => assignSchool.mutate()}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
            >
              Rattacher
            </button>
          </div>
          {unassignedSchools.length === 0 ? (
            <p className="text-xs text-slate-400">Tous les établissements sont déjà rattachés.</p>
          ) : (
            <p className="text-xs text-slate-500">
              {unassignedSchools.length} établissement(s) hors réseau
            </p>
          )}
        </div>
      </section>

      {unassignedSchools.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-5 py-4">
          <h2 className="text-sm font-semibold text-amber-950 flex items-center gap-2 mb-3">
            <AlertTriangle size={16} /> Établissements orphelins
          </h2>
          <ul className="flex flex-wrap gap-2">
            {unassignedSchools.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-700"
              >
                <span className="font-medium">{s.name}</span>
                {s.city ? ` · ${s.city}` : ''} · {s.studentCount} élève(s)
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overviewGroupId != null ? (
        <OwnerOverviewPanel
          overview={overview}
          loading={overviewLoading}
          groups={groups}
          selectedId={overviewGroupId}
          onSelect={setSelectedGroupId}
          treasury={treasury}
          briefing={briefing}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par nom, slug, site…"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              ['all', 'Tous'],
              ['ready', 'Prêts'],
              ['warn', 'Alertes'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setHealthFilter(id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium',
                healthFilter === id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          Erreur de chargement.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Réessayer
          </button>
        </div>
      )}

      <div className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-slate-400 animate-pulse">Chargement des réseaux…</p>
        ) : filteredGroups.length === 0 ? (
          groups.length === 0 ? (
            <EmptyState />
          ) : (
            <p className="text-sm text-slate-500">Aucun réseau ne correspond au filtre.</p>
          )
        ) : (
          filteredGroups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              selected={g.id === overviewGroupId}
              busy={busy}
              onSelect={() => setSelectedGroupId(g.id)}
              onRename={(name) => updateGroup.mutate({ groupId: g.id, name })}
              onToggleActive={() => updateGroup.mutate({ groupId: g.id, active: !g.active })}
              onSetHub={(id) => setHub.mutate(id)}
              onUnassign={(id) => setUnassignSchoolId(id)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={unassignSchoolId != null}
        title="Retirer du réseau ?"
        description="Cet établissement sera détaché du groupe. Le hub éventuel sera réinitialisé."
        impact={["L'établissement redevient autonome", "Les règles réseau ne s'appliquent plus"]}
        confirmLabel="Retirer"
        variant="danger"
        loading={unassign.isPending}
        onConfirm={() => {
          if (unassignSchoolId == null) return
          unassign.mutate(unassignSchoolId, { onSuccess: () => setUnassignSchoolId(null) })
        }}
        onCancel={() => setUnassignSchoolId(null)}
      />
    </div>
  )
}

function StatChip({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'amber'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white px-3 py-2 text-center',
        tone === 'ok' && 'border-emerald-200',
        tone === 'amber' && 'border-amber-200',
        !tone && 'border-slate-200',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-bold tabular-nums text-slate-900 leading-tight mt-0.5">{value}</p>
      {hint ? <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p> : null}
    </div>
  )
}

function OwnerOverviewPanel({
  overview,
  loading,
  groups,
  selectedId,
  onSelect,
  treasury,
  briefing,
}: {
  overview?: SchoolNetworkOverview
  loading: boolean
  groups: SchoolNetworkGroup[]
  selectedId: number
  onSelect: (id: number) => void
  treasury?: NetworkTreasuryLive
  briefing?: NetworkOpsBriefing
}) {
  const clearing = overview?.clearing30d
  const currency = clearing?.currency ?? overview?.group.crossSiteLast30d.currency ?? 'USD'

  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-indigo-950 flex items-center gap-2">
            <Wallet size={16} /> Vue propriétaire
          </h2>
          <p className="text-xs text-indigo-800/70 mt-0.5">
            Trésorerie du jour (groupe sélectionné uniquement) · clearing 30 jours · caissiers hub
          </p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {briefing ? <NetworkOpsBriefingPanel briefing={briefing} /> : null}

      {treasury ? (
        <div className="rounded-xl border border-slate-200 bg-slate-900 text-white px-4 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Direct · {treasury.groupName ?? 'Groupe'}
            </p>
            <p className="text-[10px] text-slate-500">
              Isolation : ce groupe seulement, jamais les autres clients
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniKpiDark
              label="Encaissé jour"
              value={money(treasury.totals.collectedToday, currency)}
              hint={
                treasury.totals.vsYesterdayPct != null
                  ? `${treasury.totals.vsYesterdayPct >= 0 ? '+' : ''}${treasury.totals.vsYesterdayPct}% vs hier · ${treasury.totals.paymentCountToday} px`
                  : `${treasury.totals.paymentCountToday} paiement(s)`
              }
            />
            <MiniKpiDark
              label="Reste à payer"
              value={money(treasury.totals.feesBalance, currency)}
              hint={`${treasury.totals.debtorCount} débiteur(s)`}
            />
            <MiniKpiDark
              label="Santé / recouvrement"
              value={`${treasury.totals.healthScore ?? '—'} · ${treasury.totals.collectionRate}%`}
              hint={`Présence ${treasury.totals.attendanceRate ?? 0}% · mobile ${treasury.totals.digitalSharePct ?? 0}%`}
            />
            <MiniKpiDark
              label="7 jours / SMS"
              value={money(treasury.totals.collected7d ?? 0, currency)}
              hint={`${treasury.totals.sitesOpen}/${treasury.totals.siteCount} caisses · ${treasury.totals.pendingSms} SMS`}
            />
          </div>
          {treasury.leaders?.topCollector || treasury.leaders?.weakestRate ? (
            <p className="text-[11px] text-slate-300">
              Meilleur encaissement : {treasury.leaders.topCollector?.schoolName ?? '—'}
              {treasury.leaders.weakestRate
                ? ` · Recouvrement le plus faible : ${treasury.leaders.weakestRate.schoolName} (${treasury.leaders.weakestRate.value}%)`
                : ''}
            </p>
          ) : null}
          {treasury.sites.length > 0 ? (
            <ul className="divide-y divide-white/10 rounded-lg border border-white/10 overflow-hidden">
              {treasury.sites.map((site) => (
                <li
                  key={site.id}
                  className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {site.name}
                      {site.isPaymentHub ? (
                        <span className="ml-2 text-[10px] uppercase text-amber-300">Hub</span>
                      ) : null}
                      {site.healthScore != null ? (
                        <span className="ml-2 text-[10px] text-slate-400">santé {site.healthScore}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {site.sessionOpen ? 'Caisse ouverte' : 'Fermée'}
                      {site.cashierName ? ` · ${site.cashierName}` : ''}
                      {site.attendanceRate != null ? ` · présence ${site.attendanceRate}%` : ''}
                      {site.pendingSms ? ` · ${site.pendingSms} SMS` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums font-semibold">
                      {money(site.collectedToday, currency)}
                      {site.vsYesterdayPct != null ? (
                        <span
                          className={cn(
                            'ml-2 text-[10px] font-medium',
                            site.vsYesterdayPct >= 0 ? 'text-emerald-300' : 'text-red-300',
                          )}
                        >
                          {site.vsYesterdayPct >= 0 ? '+' : ''}
                          {site.vsYesterdayPct}%
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      reste {money(site.feesBalance, currency)} · {site.collectionRate}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">Aucun campus actif dans ce groupe.</p>
          )}
          {treasury.alerts.slice(0, 5).map((alert, i) => (
            <p
              key={`${alert.code}-${alert.schoolId ?? 'g'}-${i}`}
              className={cn(
                'text-[11px] rounded-lg px-3 py-1.5',
                alert.severity === 'critical' && 'bg-red-500/20 text-red-100',
                alert.severity === 'warn' && 'bg-amber-500/20 text-amber-100',
                alert.severity === 'info' && 'bg-white/10 text-slate-200',
              )}
            >
              {alert.message}
            </p>
          ))}
        </div>
      ) : null}

      {loading || !overview ? (
        <p className="text-sm text-indigo-400 animate-pulse">Chargement overview…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniKpi
              label="Local (hub)"
              value={money(clearing?.localCollected.amount ?? 0, currency)}
              hint={`${clearing?.localCollected.count ?? 0} paiements`}
            />
            <MiniKpi
              label="Cross-site"
              value={money(clearing?.crossSiteTotal.amount ?? 0, currency)}
              hint={`${clearing?.crossSiteTotal.count ?? 0} paiements`}
              tone="amber"
            />
            <MiniKpi
              label="Santé"
              value={overview.group.health.readyForCrossSite ? 'Prêt' : 'À compléter'}
              hint={
                overview.group.health.warnings[0] ??
                'Hub + multi-sites + actifs OK'
              }
              tone={overview.group.health.readyForCrossSite ? 'ok' : 'warn'}
            />
          </div>

          {clearing?.positions.length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400 mb-2">
                Dû aux campus (encaissé au hub)
              </p>
              <ul className="divide-y divide-indigo-100 rounded-xl border border-indigo-100 bg-white overflow-hidden">
                {clearing.positions.map((p) => (
                  <li
                    key={p.enrollmentSchoolId}
                    className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{p.enrollmentSchoolName}</span>
                    <span className="tabular-nums text-slate-700">
                      {money(p.amountDueToCampus, currency)}
                      <span className="text-xs text-slate-400 ml-2">
                        {p.paymentCount} paiement(s)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-indigo-700/80 mt-2">{clearing.summaryLabel}</p>
            </div>
          ) : (
            <p className="text-xs text-indigo-700/70">
              {clearing?.summaryLabel ?? 'Définissez une caisse hub pour voir le clearing.'}
            </p>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-400 mb-2 flex items-center gap-1">
              <Users size={12} /> Comptes FINANCE hub
            </p>
            {overview.hubFinanceUsers.length === 0 ? (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Aucun compte FINANCE sur le hub — créez-en un pour activer le guichet.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {overview.hubFinanceUsers.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                  >
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'Caissier'}
                    {u.email ? (
                      <span className="text-slate-400"> · {u.email}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function MiniKpiDark({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
      {hint ? <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{hint}</p> : null}
    </div>
  )
}

function MiniKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'amber' | 'ok' | 'warn'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white px-4 py-3',
        tone === 'amber' && 'border-amber-200',
        tone === 'ok' && 'border-emerald-200',
        tone === 'warn' && 'border-amber-300',
        !tone && 'border-indigo-100',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className="text-base font-bold text-slate-900 mt-0.5">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{hint}</p> : null}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center space-y-2">
      <Network size={32} className="mx-auto text-slate-300" />
      <p className="text-sm font-medium text-slate-600">Aucun réseau configuré</p>
      <p className="text-xs text-slate-400 max-w-md mx-auto">
        Créez un groupe puis rattachez vos établissements. Définissez une caisse hub pour
        activer l&apos;encaissement cross-site.
      </p>
    </div>
  )
}

function GroupCard({
  group,
  selected,
  busy,
  onSelect,
  onRename,
  onToggleActive,
  onSetHub,
  onUnassign,
}: {
  group: SchoolNetworkGroup
  selected: boolean
  busy: boolean
  onSelect: () => void
  onRename: (name: string) => void
  onToggleActive: () => void
  onSetHub: (schoolId: number) => void
  onUnassign: (schoolId: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(group.name)
  const hub = group.schools.find((s) => s.isPaymentHub)
  const satellites = group.schools.filter((s) => !s.isPaymentHub)
  const health = group.health

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white overflow-hidden shadow-sm transition-shadow',
        selected ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200',
        !group.active && 'opacity-75',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50/60"
      >
        <div className="min-w-0 space-y-1">
          {editing ? (
            <div
              className="flex flex-wrap gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm min-w-[220px]"
              />
              <button
                type="button"
                disabled={draftName.trim().length < 2 || busy}
                onClick={() => {
                  onRename(draftName.trim())
                  setEditing(false)
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftName(group.name)
                  setEditing(false)
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-lg truncate">{group.name}</h3>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    setEditing(true)
                  }
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Renommer"
              >
                <Pencil size={14} />
              </span>
            </div>
          )}
          <p className="text-xs text-slate-400">
            {group.slug} · {group.schools.length} site(s) ·{' '}
            {group.schools.reduce((n, s) => n + s.studentCount, 0)} élève(s)
            {group.createdAt
              ? ` · créé ${new Date(group.createdAt).toLocaleDateString('fr-FR')}`
              : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <HealthBadge health={health} />
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
              group.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500',
            )}
          >
            {group.active ? 'Actif' : 'Inactif'}
          </span>
          {group.paymentHubName ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
              <Crown size={12} /> Hub : {group.paymentHubName}
            </span>
          ) : (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
              Aucune caisse hub
            </span>
          )}
          <span className="text-[11px] tabular-nums text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
            Cross 30j : {money(group.crossSiteLast30d.amount, group.crossSiteLast30d.currency)}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={onToggleActive}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Power size={12} />
            {group.active ? 'Désactiver' : 'Activer'}
          </button>
        </div>
      </button>

      {health.warnings.length > 0 ? (
        <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-100">
          <ul className="space-y-1">
            {health.warnings.map((w) => (
              <li key={w} className="text-xs text-amber-900 flex items-start gap-1.5">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <NetworkMap hub={hub} satellites={satellites} />

      <ul className="divide-y divide-slate-100">
        {group.schools.map((s) => (
          <li key={s.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400">
                  {s.city ?? '—'} · {s.studentCount} élève(s)
                  {!s.active ? ' · inactif' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {s.isPaymentHub ? (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  Caisse hub
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSetHub(s.id)}
                  className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                >
                  Définir hub
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onUnassign(s.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
              >
                <Unlink size={12} /> Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}

function HealthBadge({
  health,
}: {
  health: SchoolNetworkGroup['health']
}) {
  if (health.readyForCrossSite && health.hasFinanceOnHub) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
        <CheckCircle2 size={12} /> Prêt cross-site
      </span>
    )
  }
  if (health.readyForCrossSite && !health.hasFinanceOnHub) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
        <AlertTriangle size={12} /> Hub sans FINANCE
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
      <AlertTriangle size={12} /> Config incomplète
    </span>
  )
}

function NetworkMap({
  hub,
  satellites,
}: {
  hub?: SchoolNetworkMember
  satellites: SchoolNetworkMember[]
}) {
  if (!hub && satellites.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-xs text-slate-400 border-b border-slate-100">
        Aucun établissement dans ce réseau.
      </div>
    )
  }

  return (
    <div className="px-5 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
        Carte du réseau
      </p>
      <div className="flex flex-col items-center gap-3">
        {hub ? (
          <SiteNode
            title={hub.name}
            subtitle={`${hub.city ?? 'Hub'} · ${hub.studentCount} élève(s)`}
            tone="hub"
          />
        ) : (
          <SiteNode title="Hub non défini" subtitle="Choisissez une caisse hub" tone="warn" />
        )}
        {satellites.length > 0 ? (
          <>
            <div className="h-6 w-px bg-slate-300" />
            <div className="flex flex-wrap justify-center gap-3 w-full">
              {satellites.map((s) => (
                <SiteNode
                  key={s.id}
                  title={s.name}
                  subtitle={`${s.city ?? 'Campus'} · ${s.studentCount} élève(s)`}
                  tone="site"
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function SiteNode({
  title,
  subtitle,
  tone,
}: {
  title: string
  subtitle: string
  tone: 'hub' | 'site' | 'warn'
}) {
  return (
    <div
      className={cn(
        'min-w-[180px] max-w-[260px] rounded-xl border px-3 py-2.5 text-center shadow-sm',
        tone === 'hub' && 'border-amber-200 bg-amber-50',
        tone === 'site' && 'border-sky-200 bg-sky-50/70',
        tone === 'warn' && 'border-dashed border-amber-300 bg-amber-50/40',
      )}
    >
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        {tone === 'hub' ? (
          <Crown size={12} className="text-amber-700" />
        ) : (
          <Building2 size={12} className="text-sky-700" />
        )}
        <p className="text-xs font-semibold text-slate-900 truncate">{title}</p>
      </div>
      <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>
    </div>
  )
}
