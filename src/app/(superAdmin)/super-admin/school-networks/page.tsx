'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Crown, Link2, Plus, Unlink } from 'lucide-react'
import {
  schoolNetworkApi,
  type SchoolNetworkGroup,
} from '@/lib/superAdmin/api/school-network.api'
import { cn } from '@/lib/utils'

export default function SchoolNetworksPage() {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [assignGroupId, setAssignGroupId] = useState<number | ''>('')
  const [assignSchoolId, setAssignSchoolId] = useState<number | ''>('')

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
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks'] })
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'schools'] })
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
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks'] })
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'schools'] })
    },
  })

  const setHub = useMutation({
    mutationFn: (schoolId: number) => schoolNetworkApi.setPaymentHub(schoolId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks'] })
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'schools'] })
    },
  })

  const unassign = useMutation({
    mutationFn: (schoolId: number) => schoolNetworkApi.unassignSchool(schoolId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks'] })
      void qc.invalidateQueries({ queryKey: ['superadmin', 'school-networks', 'schools'] })
    },
  })

  const unassignedSchools = schools.filter((s) => !s.groupId)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Réseaux scolaires</h1>
        <p className="text-sm text-slate-500 mt-1">
          Guichet hub — encaissement cross-site (Excellence 1 → Excellence 2)
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
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
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
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
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={assignSchoolId}
            onChange={(e) => setAssignSchoolId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Établissement…</option>
            {unassignedSchools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ''}</option>
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
      </section>

      {isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          Erreur de chargement.{' '}
          <button type="button" onClick={() => refetch()} className="underline">Réessayer</button>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun réseau configuré.</p>
        ) : (
          groups.map((g) => <GroupCard key={g.id} group={g} onSetHub={(id) => setHub.mutate(id)} onUnassign={(id) => unassign.mutate(id)} />)
        )}
      </div>
    </div>
  )
}

function GroupCard({
  group,
  onSetHub,
  onUnassign,
}: {
  group: SchoolNetworkGroup
  onSetHub: (schoolId: number) => void
  onUnassign: (schoolId: number) => void
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{group.name}</h3>
          <p className="text-xs text-slate-400">{group.slug} · {group.schools.length} site(s)</p>
        </div>
        {group.paymentHubName ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            <Crown size={12} /> Hub : {group.paymentHubName}
          </span>
        ) : (
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
            Aucune caisse hub
          </span>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {group.schools.map((s) => (
          <li key={s.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400">
                  {s.city ?? '—'} · {s.studentCount} élève(s)
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
                  onClick={() => onSetHub(s.id)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Définir hub
                </button>
              )}
              <button
                type="button"
                onClick={() => onUnassign(s.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
                )}
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
