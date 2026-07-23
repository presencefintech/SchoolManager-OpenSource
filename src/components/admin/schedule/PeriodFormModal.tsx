'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassListItem, ClassPeriodItem, CreateClassPeriodPayload } from '@/types/admin'
import {
  DAY_LABELS,
  findTeacherOverlaps,
  timeToMinutes,
  type TeacherOption,
} from './schedule.utils'

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-shadow'

export type PeriodFormState = {
  classId: string
  teacherId: string
  academicYear: string
  dayOfWeek: string
  start: string
  end: string
  subject: string
  room: string
}

export function emptyPeriodForm(academicYear = ''): PeriodFormState {
  return {
    classId: '',
    teacherId: '',
    academicYear,
    dayOfWeek: '1',
    start: '08:00',
    end: '09:00',
    subject: '',
    room: '',
  }
}

export function periodToForm(p: ClassPeriodItem): PeriodFormState {
  return {
    classId: String(p.classId),
    teacherId: String(p.teacherId),
    academicYear: p.academicYear,
    dayOfWeek: String(p.dayOfWeek),
    start: p.start,
    end: p.end,
    subject: p.subject ?? '',
    room: p.room ?? '',
  }
}

export function PeriodFormModal({
  title,
  initial,
  classes,
  teachers,
  existingPeriods,
  excludePeriodId,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  title: string
  initial: PeriodFormState
  classes: ClassListItem[]
  teachers: TeacherOption[]
  existingPeriods: ClassPeriodItem[]
  excludePeriodId?: number
  onClose: () => void
  onSubmit: (payload: CreateClassPeriodPayload) => Promise<void>
  busy: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)

  const selectedClass = classes.find((c) => String(c.id) === form.classId)

  const localOverlaps = useMemo(() => {
    if (!form.teacherId || !form.start || !form.end) return []
    const start = timeToMinutes(form.start)
    const end = timeToMinutes(form.end)
    if (end <= start) return []
    return findTeacherOverlaps(existingPeriods, {
      teacherId: Number(form.teacherId),
      dayOfWeek: Number(form.dayOfWeek),
      start: form.start,
      end: form.end,
      excludeId: excludePeriodId,
    })
  }, [form, existingPeriods, excludePeriodId])

  const durationOk =
    form.start && form.end ? timeToMinutes(form.end) > timeToMinutes(form.start) : true

  function handleClassChange(classId: string) {
    const cls = classes.find((c) => String(c.id) === classId)
    setForm((p) => ({
      ...p,
      classId,
      teacherId: cls?.teacherId ? String(cls.teacherId) : p.teacherId,
      academicYear: cls?.academicYear ?? p.academicYear,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.classId || !form.teacherId || !form.academicYear || !durationOk) return
    if (localOverlaps.length > 0) return
    await onSubmit({
      classId: Number(form.classId),
      teacherId: Number(form.teacherId),
      academicYear: form.academicYear,
      dayOfWeek: Number(form.dayOfWeek),
      start: form.start,
      end: form.end,
      subject: form.subject.trim() || null,
      room: form.room.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col ring-1 ring-zinc-200/80"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/80">
              Emploi du temps
            </p>
            <h2 className="text-lg font-semibold text-zinc-900 mt-0.5">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Classe *</label>
              <select
                required
                value={form.classId}
                onChange={(e) => handleClassChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.level ? ` · ${c.level}` : ''}
                    {c.academicYear ? ` · ${c.academicYear}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Enseignant *</label>
              <select
                required
                value={form.teacherId}
                onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Sélectionner un enseignant</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selectedClass?.teacherName && (
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  Titulaire de la classe : {selectedClass.teacherName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Année scolaire *</label>
              <input
                required
                value={form.academicYear}
                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                className={inputCls}
                placeholder="2025-2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Jour *</label>
              <select
                required
                value={form.dayOfWeek}
                onChange={(e) => setForm((p) => ({ ...p, dayOfWeek: e.target.value }))}
                className={inputCls}
              >
                {Object.entries(DAY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Début *</label>
              <input
                required
                type="time"
                value={form.start}
                onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Fin *</label>
              <input
                required
                type="time"
                value={form.end}
                onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
                className={cn(inputCls, !durationOk && 'border-rose-300 focus:ring-rose-300/40')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Matière</label>
              <input
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                className={inputCls}
                placeholder="Mathématiques"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Salle</label>
              <input
                value={form.room}
                onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
                className={inputCls}
                placeholder="Salle 12"
              />
            </div>
          </div>

          {!durationOk && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              L&apos;heure de fin doit être après l&apos;heure de début.
            </div>
          )}

          {localOverlaps.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} />
                Chevauchement détecté pour cet enseignant
              </div>
              {localOverlaps.slice(0, 3).map((o) => (
                <p key={o.id}>
                  {DAY_LABELS[o.dayOfWeek]} · {o.start}–{o.end} · {o.className ?? `Classe #${o.classId}`}
                  {o.subject ? ` · ${o.subject}` : ''}
                </p>
              ))}
              <p className="text-amber-700/80">Corrigez l&apos;horaire avant d&apos;enregistrer.</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/80 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || !durationOk || localOverlaps.length > 0}
            onClick={(e) => {
              const formEl = (e.target as HTMLElement).closest('[role="dialog"]')?.querySelector('form')
              formEl?.requestSubmit()
            }}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer le créneau'}
          </button>
        </div>
      </div>
    </div>
  )
}
