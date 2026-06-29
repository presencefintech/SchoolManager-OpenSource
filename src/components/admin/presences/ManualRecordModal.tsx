'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRecordPresence, useStudents, useClasses } from '@/lib/hooks/use-admin'
import type { RecordPresencePayload } from '@/types/admin'
import { isSingleDuplicateResult, presenceStatusLabel } from '@/lib/presence/presence-response.utils'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'

function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

function GridSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
      ))}
    </div>
  )
}

export function ManualRecordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<RecordPresencePayload>({
    studentId: 0,
    classId: 0,
    status: 'PRESENT',
  })
  const [submitting, setSubmitting] = useState(false)
  const record = useRecordPresence()

  const { data: classesData, isFetching: classesLoading } = useClasses()
  const { data: studentsData, isFetching: studentsLoading } = useStudents(
    form.classId ? { classId: form.classId, limit: 200 } : undefined
  )

  const classes = classesData ?? []
  const students = studentsData?.data ?? []
  const selectCls =
    'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-400'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId || !form.classId || submitting) return

    setSubmitting(true)
    try {
      const { data: result, statusCode } = await record.mutateAsync({
        ...form,
        idempotencyKey: createIdempotencyKey(),
      })

      if (isSingleDuplicateResult(result) || statusCode === 202) {
        toast.warning(
          'Déjà enregistré',
          `${result.studentName} a déjà une présence aujourd'hui (${presenceStatusLabel(result.status)}).`
        )
      } else {
        toast.success(
          'Présence enregistrée',
          `${result.studentName} — ${presenceStatusLabel(result.status)}`
        )
        onClose()
      }
    } catch (err) {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || record.isPending

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Enregistrement manuel</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Classe {classesLoading && <span className="text-zinc-400">(chargement…)</span>}
            </label>
            {classesLoading ? (
              <div className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
            ) : (
              <select
                value={form.classId || ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, classId: Number(e.target.value), studentId: 0 }))
                }
                disabled={busy}
                className={selectCls}
              >
                <option value="">— Choisir une classe —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? `Classe #${c.id}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Élève {form.classId && studentsLoading && <span className="text-zinc-400">(chargement…)</span>}
            </label>
            {form.classId && studentsLoading ? (
              <GridSkeleton />
            ) : (
              <select
                value={form.studentId || ''}
                onChange={(e) => setForm((f) => ({ ...f, studentId: Number(e.target.value) }))}
                disabled={!form.classId || busy}
                className={selectCls}
              >
                <option value="">
                  {!form.classId
                    ? '— Choisir d\'abord une classe —'
                    : students.length === 0
                      ? 'Aucun élève dans cette classe'
                      : '— Choisir un élève —'}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || `Élève #${s.id}`}
                    {s.matricule ? ` (${s.matricule})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Statut</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as RecordPresencePayload['status'] }))
              }
              disabled={busy}
              className={selectCls}
            >
              <option value="PRESENT">Présent</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Retard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Date de session (optionnel)
            </label>
            <input
              type="datetime-local"
              value={form.sessionDate ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, sessionDate: e.target.value || undefined }))
              }
              disabled={busy}
              className={selectCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Note (optionnel, max 500 car.)
            </label>
            <textarea
              value={form.note ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value.slice(0, 500) || undefined }))
              }
              disabled={busy}
              rows={2}
              className={selectCls}
              placeholder="Motif d'absence, remarque…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy || !form.studentId || !form.classId}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
