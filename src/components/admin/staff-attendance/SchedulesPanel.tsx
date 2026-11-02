'use client'

import { useState } from 'react'
import { Clock, Plus, Trash2, Pencil, X, Loader2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import type { StaffSchedule, StaffSchedulePayload } from '@/types/staff-attendance'
import { extractValidationMessages, hhmmToMinutes, minutesToHHMM, WORKDAY_LABEL } from '@/lib/admin/staff-attendance.utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormErrorBlock } from './FormErrorBlock'

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

type FormState = {
  name: string
  startTime: string
  endTime: string
  lateToleranceMinutes: string
  workDays: number[]
}

const EMPTY_FORM: FormState = {
  name: '',
  startTime: '07:30',
  endTime: '15:30',
  lateToleranceMinutes: '10',
  workDays: [1, 2, 3, 4, 5],
}

export function SchedulesPanel() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<StaffSchedule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<StaffSchedule | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const schedulesQuery = useQuery({
    queryKey: staffAttendanceKeys.schedules(),
    queryFn: () => staffAttendanceApi.listSchedules(),
    staleTime: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: staffAttendanceKeys.schedules() })

  const createMut = useMutation({
    mutationFn: (payload: StaffSchedulePayload) => staffAttendanceApi.createSchedule(payload),
    onSuccess: invalidate,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<StaffSchedulePayload> }) =>
      staffAttendanceApi.updateSchedule(id, payload),
    onSuccess: invalidate,
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => staffAttendanceApi.deleteSchedule(id),
    onSuccess: invalidate,
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setValidationDetails([])
    setShowForm(true)
  }

  function openEdit(s: StaffSchedule) {
    setEditing(s)
    setForm({
      name: s.name,
      startTime: minutesToHHMM(s.startMinute),
      endTime: minutesToHHMM(s.endMinute),
      lateToleranceMinutes: String(s.lateToleranceMinutes),
      workDays: s.workDays,
    })
    setError('')
    setValidationDetails([])
    setShowForm(true)
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(day) ? f.workDays.filter((d) => d !== day) : [...f.workDays, day].sort(),
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const startMinute = hhmmToMinutes(form.startTime)
    const endMinute = hhmmToMinutes(form.endTime)
    if (startMinute == null || endMinute == null) {
      setError('Heures mal formées (HH:MM).')
      return
    }
    if (startMinute >= endMinute) {
      setError("L'heure de fin doit suivre l'heure de début.")
      return
    }
    const payload: StaffSchedulePayload = {
      name: form.name.trim(),
      startMinute,
      endMinute,
      lateToleranceMinutes: Number(form.lateToleranceMinutes) || 0,
      workDays: form.workDays,
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload })
      } else {
        await createMut.mutateAsync(payload)
      }
      setShowForm(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(getApiErrorMessage(err))
    }
  }

  const schedules = schedulesQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Horaires de l'école</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Heures de travail, tolérance de retard et jours travaillés.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
        >
          <Plus size={14} /> Nouvel horaire
        </button>
      </div>

      {schedulesQuery.isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400 bg-white rounded-2xl border border-zinc-100">
          <Clock size={28} className="text-zinc-200" />
          Aucun horaire — créez-en un pour pouvoir affecter du personnel.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-2">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-zinc-900">{s.name}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteTarget(s); setDeleteError('') }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Clock size={11} />
                {minutesToHHMM(s.startMinute)} → {minutesToHHMM(s.endMinute)} · tolérance {s.lateToleranceMinutes} min
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {ALL_DAYS.map((d) => (
                  <span
                    key={d}
                    className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      s.workDays.includes(d) ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-50 text-zinc-300',
                    )}
                  >
                    {WORKDAY_LABEL[d]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">{editing ? "Modifier l'horaire" : 'Nouvel horaire'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Ex. Personnel administratif"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Début</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Fin</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Tolérance de retard (min)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.lateToleranceMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, lateToleranceMinutes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Jours travaillés</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        form.workDays.includes(d)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50',
                      )}
                    >
                      {WORKDAY_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>
              <FormErrorBlock message={error} details={validationDetails} />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium"
                >
                  {(createMut.isPending || updateMut.isPending) && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Supprimer cet horaire ?"
        description={deleteTarget ? `« ${deleteTarget.name} » sera supprimé. Impossible si du personnel l'utilise encore.` : ''}
        impact={deleteError ? [deleteError] : []}
        variant="danger"
        confirmLabel="Supprimer"
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
    </div>
  )
}
