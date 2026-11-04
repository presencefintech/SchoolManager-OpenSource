'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, CalendarOff, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { extractValidationMessages, formatDateFr } from '@/lib/admin/staff-attendance.utils'
import { FormErrorBlock } from './FormErrorBlock'

function usePeriodDelete(kind: 'leave' | 'mission', invalidateKey: readonly unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      kind === 'leave' ? staffAttendanceApi.deleteLeave(id) : staffAttendanceApi.deleteMission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: invalidateKey }),
  })
}

export function LeavesMissionsPanel() {
  const qc = useQueryClient()
  const [kind, setKind] = useState<'leave' | 'mission'>('leave')
  const [form, setForm] = useState({ staffMemberId: '', fromDate: '', toDate: '', reason: '' })
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const staffQuery = useQuery({
    queryKey: staffAttendanceKeys.staffList(true),
    queryFn: () => staffAttendanceApi.listStaff(true),
    staleTime: 30_000,
  })

  const leavesQuery = useQuery({
    queryKey: staffAttendanceKeys.leaves(),
    queryFn: () => staffAttendanceApi.listLeaves(),
    staleTime: 15_000,
    enabled: kind === 'leave',
  })

  const missionsQuery = useQuery({
    queryKey: staffAttendanceKeys.missions(),
    queryFn: () => staffAttendanceApi.listMissions(),
    staleTime: 15_000,
    enabled: kind === 'mission',
  })

  function invalidateAfterCreate() {
    qc.invalidateQueries({ queryKey: staffAttendanceKeys.leaves() })
    qc.invalidateQueries({ queryKey: staffAttendanceKeys.missions() })
    qc.invalidateQueries({ queryKey: staffAttendanceKeys.day() })
  }

  const createLeaveMut = useMutation({
    mutationFn: () =>
      staffAttendanceApi.createLeave({
        staffMemberId: Number(form.staffMemberId),
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
      }),
    onSuccess: invalidateAfterCreate,
  })
  const createMissionMut = useMutation({
    mutationFn: () =>
      staffAttendanceApi.createMission({
        staffMemberId: Number(form.staffMemberId),
        fromDate: form.fromDate,
        toDate: form.toDate,
        purpose: form.reason.trim(),
      }),
    onSuccess: invalidateAfterCreate,
  })
  const createMut = kind === 'leave' ? createLeaveMut : createMissionMut

  const deleteLeaveMut = usePeriodDelete('leave', staffAttendanceKeys.leaves())
  const deleteMissionMut = usePeriodDelete('mission', staffAttendanceKeys.missions())

  const staff = staffQuery.data ?? []
  const leaves = leavesQuery.data ?? []
  const missions = missionsQuery.data ?? []
  const staffNameById = (id: number) => {
    const s = staff.find((m) => m.id === id)
    return s ? `${s.firstName} ${s.lastName}` : `Employé #${id}`
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setValidationDetails([])
    if (!form.staffMemberId || !form.fromDate || !form.toDate || form.reason.trim().length < 3) {
      setError(kind === 'leave' ? 'Employé, dates et motif sont requis.' : 'Employé, dates et objet/lieu sont requis.')
      return
    }
    try {
      await createMut.mutateAsync()
      setForm({ staffMemberId: '', fromDate: '', toDate: '', reason: '' })
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      if (kind === 'leave') await deleteLeaveMut.mutateAsync(deleteTarget.id)
      else await deleteMissionMut.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 p-1 bg-zinc-100 rounded-xl">
        {(['leave', 'mission'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setKind(k); setError('') }}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              kind === k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            {k === 'leave' ? 'Congés' : 'Missions'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <form onSubmit={onSubmit} className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <Plus size={14} className="text-emerald-600" />
            {kind === 'leave' ? 'Saisir un congé' : 'Saisir une mission'}
          </h2>
          <div>
            <label className="text-xs font-medium text-zinc-600">Employé</label>
            <select
              value={form.staffMemberId}
              onChange={(e) => setForm((f) => ({ ...f, staffMemberId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
            >
              <option value="">— Sélectionner —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600">Du</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Au</label>
              <input
                type="date"
                value={form.toDate}
                onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">{kind === 'leave' ? 'Motif' : 'Objet et lieu'}</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              placeholder={kind === 'leave' ? 'Maladie, événement familial…' : 'Ex. formation à Lubumbashi'}
            />
          </div>
          <FormErrorBlock message={error} details={validationDetails} />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
          >
            {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </form>

        <div className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-800">
              {kind === 'leave' ? `Congés (${leaves.length})` : `Missions (${missions.length})`}
            </h2>
          </div>
          {(kind === 'leave' ? leavesQuery.isLoading : missionsQuery.isLoading) ? (
            <div className="p-6 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : kind === 'leave' ? (
            leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-sm text-zinc-400">
                <CalendarOff size={24} className="text-zinc-200" /> Aucun congé
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 max-h-[32rem] overflow-y-auto">
                {leaves.map((l) => (
                  <li key={l.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{staffNameById(l.staffMemberId)}</p>
                      <p className="text-xs text-zinc-400">{formatDateFr(l.fromDate)} → {formatDateFr(l.toDate)}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{l.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setDeleteTarget({ id: l.id, label: `le congé de ${staffNameById(l.staffMemberId)}` }); setDeleteError('') }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : missions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-sm text-zinc-400">
              <Briefcase size={24} className="text-zinc-200" /> Aucune mission
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-[32rem] overflow-y-auto">
              {missions.map((m) => (
                <li key={m.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{staffNameById(m.staffMemberId)}</p>
                    <p className="text-xs text-zinc-400">{formatDateFr(m.fromDate)} → {formatDateFr(m.toDate)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{m.purpose}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDeleteTarget({ id: m.id, label: `la mission de ${staffNameById(m.staffMemberId)}` }); setDeleteError('') }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Supprimer cette période ?"
        description={deleteTarget ? `Vous êtes sur le point de supprimer ${deleteTarget.label}.` : ''}
        impact={deleteError ? [deleteError] : []}
        variant="danger"
        confirmLabel="Supprimer"
        loading={deleteLeaveMut.isPending || deleteMissionMut.isPending}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
    </div>
  )
}
