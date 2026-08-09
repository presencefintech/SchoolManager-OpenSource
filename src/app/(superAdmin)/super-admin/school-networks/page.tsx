'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Crown,
  Link2,
  Network,
  Pencil,
  Plus,
  Power,
  Unlink,
} from 'lucide-react'
import {
  schoolNetworkApi,
  type SchoolNetworkGroup,
  type SchoolNetworkMember,
} from '@/lib/superAdmin/api/school-network.api'
import { cn } from '@/lib/utils'

export default function SchoolNetworksPage() {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [assignGroupId, setAssignGroupId] = useState<number | ''>('')
  const [assignSchoolId, setAssignSchoolId] = useState<number | ''>('')

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks'] })
    void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'schools'] })
  }

  const { data: groups = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['superadmin', 'school-networks'],
    queryFn: schoolNetworkApi.listGroups,
  })

  const { data: schools = [] } = useQuery({
    queryKey: ['superadmin', 'school-networks', 'schools'],
    queryFn: schoolNetworkApi.listSchoolOptions,
  })

  const createGroup = useMutation({
    mutationFn: () => schoolNetworkApi.createGroup({ name: newName.trim() }),
    onSuccess: () => {
      setNewName('')
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
  const totals = useMemo(() => {
    const sites = groups.reduce((n, g) => n + g.schools.length, 0)
    const students = groups.reduce(
      (n, g) => n + g.schools.reduce((s, school) => s + school.studentCount, 0),
      0,
    )
    const hubs = groups.filter((g) => g.paymentHubId).length
    return { networks: groups.length, sites, students, hubs }
  }, [groups])

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Super Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Réseaux scolaires</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Cartographie multi-sites : une caisse hub peut encaisser pour les élèves inscrits
            sur les autres campus du même groupe.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[280px]">
          <StatChip label="Réseaux" value={totals.networks} />
          <StatChip label="Sites" value={totals.sites} />
          <StatChip label="Hubs" value={totals.hubs} />
          <StatChip label="Élèves" value={totals.students} />
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
                  {s.city ? ` (${s.city})` : ''}
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
          ) : null}
        </div>
      </section>

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
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              busy={
                updateGroup.isPending || setHub.isPending || unassign.isPending
              }
              onRename={(name) => updateGroup.mutate({ groupId: g.id, name })}
              onToggleActive={() =>
                updateGroup.mutate({ groupId: g.id, active: !g.active })
              }
              onSetHub={(id) => setHub.mutate(id)}
              onUnassign={(id) => unassign.mutate(id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
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
  busy,
  onRename,
  onToggleActive,
  onSetHub,
  onUnassign,
}: {
  group: SchoolNetworkGroup
  busy: boolean
  onRename: (name: string) => void
  onToggleActive: () => void
  onSetHub: (schoolId: number) => void
  onUnassign: (schoolId: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(group.name)
  const hub = group.schools.find((s) => s.isPaymentHub)
  const satellites = group.schools.filter((s) => !s.isPaymentHub)

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white overflow-hidden shadow-sm',
        group.active ? 'border-slate-200' : 'border-slate-200 opacity-75',
      )}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {editing ? (
            <div className="flex flex-wrap gap-2">
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
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Renommer"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400">
            {group.slug} · {group.schools.length} site(s) ·{' '}
            {group.schools.reduce((n, s) => n + s.studentCount, 0)} élève(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
              group.active
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-500',
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
      </div>

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
        {tone === 'hub' ? <Crown size={12} className="text-amber-700" /> : <Building2 size={12} className="text-sky-700" />}
        <p className="text-xs font-semibold text-slate-900 truncate">{title}</p>
      </div>
      <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>
    </div>
  )
}
