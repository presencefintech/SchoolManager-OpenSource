'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useRecordPresence, useStudents, useClasses } from '@/lib/hooks/use-admin'
import type { RecordPresencePayload } from '@/types/admin'
import { isSingleDuplicateResult, presenceStatusLabel } from '@/lib/presence/presence-response.utils'
import {
  defaultReasonCodeForStatus,
  validatePresenceReason,
  type PresenceReasonCode,
} from '@/lib/presence/presence-reason-codes'
import { PresenceReasonFields } from '@/components/admin/presences/PresenceReasonFields'
import { AdminModal } from '@/components/admin/presences/AdminModal'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'

function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

const selectCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-zinc-50 disabled:text-zinc-400'

export function ManualRecordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<RecordPresencePayload>({
    studentId: 0,
    classId: 0,
    status: 'PRESENT',
    reasonCode: 'PRESENT_ON_TIME',
  })
  const [submitting, setSubmitting] = useState(false)
  const record = useRecordPresence()

  const { data: classesData, isFetching: classesLoading } = useClasses()
  const { data: studentsData, isFetching: studentsLoading } = useStudents(
    form.classId ? { classId: form.classId, limit: 200 } : undefined,
  )

  const classes = classesData ?? []
  const students = studentsData?.data ?? []
  const busy = submitting || record.isPending

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId || !form.classId || submitting) return

    const reasonError = validatePresenceReason(form.status, form.reasonCode, form.note)
    if (reasonError) {
      toast.warning('Motif requis', reasonError)
      return
    }

    setSubmitting(true)
    try {
      const { data: result, statusCode } = await record.mutateAsync({
        ...form,
        idempotencyKey: createIdempotencyKey(),
      })

      if (isSingleDuplicateResult(result) || statusCode === 202) {
        toast.warning(
          'Déjà enregistré',
          `${result.studentName} a déjà une présence aujourd'hui (${presenceStatusLabel(result.status)}).`,
        )
      } else {
        toast.success(
          'Présence enregistrée',
          `${result.studentName} — ${presenceStatusLabel(result.status)}`,
        )
        onClose()
      }
    } catch (err) {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminModal
      title="Enregistrement manuel"
      subtitle="Pointage unitaire hors cahier — une présence par élève et par jour"
      icon={UserPlus}
      size="md"
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <form onSubmit={submit} className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-white disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy || !form.studentId || !form.classId}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      }
    >
      <div className="space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-600">
            Classe {classesLoading && <span className="text-zinc-400">(chargement…)</span>}
          </label>
          {classesLoading ? (
            <div className="h-10 animate-pulse rounded-lg bg-zinc-100" />
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
          <label className="mb-1.5 block text-xs font-medium text-zinc-600">
            Élève {form.classId && studentsLoading && <span className="text-zinc-400">(chargement…)</span>}
          </label>
          {form.classId && studentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-zinc-100" />
              ))}
            </div>
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
                  {formatStudentFullName(s) || `Élève #${s.id}`}
                  {s.matricule ? ` (${s.matricule})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-600">Statut</label>
          <select
            value={form.status}
            onChange={(e) => {
              const status = e.target.value as RecordPresencePayload['status']
              setForm((f) => ({
                ...f,
                status,
                reasonCode: defaultReasonCodeForStatus(status),
                note: undefined,
              }))
            }}
            disabled={busy}
            className={selectCls}
          >
            <option value="PRESENT">Présent</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Retard</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-600">
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

        <PresenceReasonFields
          status={form.status}
          reasonCode={(form.reasonCode as PresenceReasonCode) || defaultReasonCodeForStatus(form.status)}
          note={form.note}
          disabled={busy}
          selectClassName={selectCls}
          onReasonCodeChange={(code) => setForm((f) => ({ ...f, reasonCode: code || undefined }))}
          onNoteChange={(note) => setForm((f) => ({ ...f, note }))}
        />
      </div>
    </AdminModal>
  )
}
