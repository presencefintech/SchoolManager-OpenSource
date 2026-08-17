'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, ClipboardList, Lock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import {
  useBulkRecordPresence,
  useStudents,
  useClasses,
  useAttendanceSheetDraft,
  useSealAttendanceSheet,
} from '@/lib/hooks/use-admin'
import type { AttendanceSheetStatus, BulkPresencePayload } from '@/types/admin'
import { interpretBulkPresenceResult } from '@/lib/presence/presence-response.utils'
import {
  isSheetEditable,
  SHEET_STATUS_BADGE,
  SHEET_STATUS_LABEL,
} from '@/lib/presence/attendance-sheet.utils'
import {
  defaultReasonCodeForStatus,
  validatePresenceReason,
  type PresenceReasonCode,
} from '@/lib/presence/presence-reason-codes'
import { toDatetimeLocalValue } from '@/lib/presence/datetime-local.utils'
import { PresenceReasonFields } from '@/components/admin/presences/PresenceReasonFields'
import { AdminModal } from '@/components/admin/presences/AdminModal'
import { PresenceStatusBadge } from '@/components/admin/presences/PresenceStatusBadge'
import { AttendanceSheetExportButtons } from '@/components/admin/presences/AttendanceSheetExportButtons'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'

type RowStatus = 'PRESENT' | 'ABSENT' | 'LATE'

const ROW_STATUS_OPTIONS: { value: RowStatus; label: string; active: string }[] = [
  { value: 'PRESENT', label: 'Présent', active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm' },
  { value: 'LATE', label: 'Retard', active: 'bg-amber-600 text-white border-amber-600 shadow-sm' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-600 text-white border-red-600 shadow-sm' },
]

const selectCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-zinc-50'

function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

function RowSkeleton() {
  return <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />
}

export type BulkPresenceGridProps = {
  onClose: () => void
  initialClassId?: number
  initialSessionDate?: string
}

export function BulkPresenceGrid({
  onClose,
  initialClassId,
  initialSessionDate,
}: BulkPresenceGridProps) {
  const toast = useToast()
  const bulk = useBulkRecordPresence()
  const [classId, setClassId] = useState(initialClassId ?? 0)
  const [sessionDate, setSessionDate] = useState(
    initialSessionDate ? toDatetimeLocalValue(initialSessionDate) : '',
  )
  const [statusByStudent, setStatusByStudent] = useState<Record<number, RowStatus>>({})
  const [reasonByStudent, setReasonByStudent] = useState<
    Record<number, { reasonCode: PresenceReasonCode; note?: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set())
  const [duplicateIds, setDuplicateIds] = useState<Set<number>>(new Set())
  const [activeSheetId, setActiveSheetId] = useState<number | null>(null)
  const [sheetStatus, setSheetStatus] = useState<AttendanceSheetStatus | undefined>()

  const { data: classesData, isFetching: classesLoading } = useClasses()
  const { data: studentsData, isFetching: studentsLoading } = useStudents(
    classId ? { classId, limit: 200 } : undefined,
  )
  const { data: sheetDraft, isFetching: draftLoading, refetch: refetchDraft } =
    useAttendanceSheetDraft(classId, sessionDate || undefined)
  const sealSheet = useSealAttendanceSheet()

  const classes = classesData ?? []
  const students = studentsData?.data ?? []

  useEffect(() => {
    if (initialClassId) setClassId(initialClassId)
    if (initialSessionDate) setSessionDate(toDatetimeLocalValue(initialSessionDate))
  }, [initialClassId, initialSessionDate])

  useEffect(() => {
    if (!classId) {
      setActiveSheetId(null)
      setSheetStatus(undefined)
      return
    }
    if (students.length === 0) return

    if (sheetDraft) {
      setActiveSheetId(sheetDraft.id)
      setSheetStatus((current) => (current === 'SEALED' ? 'SEALED' : sheetDraft.status))
    }

    if (sheetDraft?.lines?.length) {
      const nextStatus: Record<number, RowStatus> = {}
      const nextReasons: Record<number, { reasonCode: PresenceReasonCode; note?: string }> = {}
      for (const s of students) {
        const line = sheetDraft.lines.find((l) => l.studentId === s.id)
        const status = (line?.status ?? 'PRESENT') as RowStatus
        nextStatus[s.id] = status
        if (status !== 'PRESENT' && line?.reasonCode) {
          nextReasons[s.id] = {
            reasonCode: line.reasonCode as PresenceReasonCode,
            note: line.note ?? undefined,
          }
        }
      }
      setStatusByStudent(nextStatus)
      setReasonByStudent(nextReasons)
    } else if (!sheetDraft?.lines?.length && sheetDraft?.status !== 'SEALED') {
      setStatusByStudent((prev) => {
        const next: Record<number, RowStatus> = {}
        for (const s of students) {
          next[s.id] = prev[s.id] ?? 'PRESENT'
        }
        return next
      })
    }

    setFailedIds(new Set())
    const alreadyRecorded = new Set(
      sheetDraft?.lines?.filter((l) => l.presenceId != null).map((l) => l.studentId) ?? [],
    )
    setDuplicateIds(alreadyRecorded)
  }, [classId, sheetDraft, studentsData?.data])

  const summary = useMemo(() => {
    const values = Object.values(statusByStudent)
    return {
      total: values.length,
      present: values.filter((s) => s === 'PRESENT').length,
      late: values.filter((s) => s === 'LATE').length,
      absent: values.filter((s) => s === 'ABSENT').length,
      recorded: duplicateIds.size,
    }
  }, [statusByStudent, duplicateIds])

  function setAll(status: RowStatus) {
    const next: Record<number, RowStatus> = {}
    const nextReasons: Record<number, { reasonCode: PresenceReasonCode; note?: string }> = {}
    for (const s of students) {
      next[s.id] = status
      if (status !== 'PRESENT') {
        nextReasons[s.id] = { reasonCode: defaultReasonCodeForStatus(status) as PresenceReasonCode }
      }
    }
    setStatusByStudent(next)
    setReasonByStudent(nextReasons)
  }

  function setStudentStatus(studentId: number, status: RowStatus) {
    setStatusByStudent((prev) => ({ ...prev, [studentId]: status }))
    setReasonByStudent((prev) => {
      const next = { ...prev }
      if (status === 'PRESENT') {
        delete next[studentId]
      } else {
        next[studentId] = {
          reasonCode: defaultReasonCodeForStatus(status) as PresenceReasonCode,
          note: undefined,
        }
      }
      return next
    })
    setFailedIds((prev) => {
      const n = new Set(prev)
      n.delete(studentId)
      return n
    })
    setDuplicateIds((prev) => {
      const n = new Set(prev)
      n.delete(studentId)
      return n
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!classId || summary.total === 0 || submitting || !isSheetEditable(sheetStatus)) return

    for (const [studentId, status] of Object.entries(statusByStudent)) {
      const reason = reasonByStudent[Number(studentId)]
      const err = validatePresenceReason(status as RowStatus, reason?.reasonCode, reason?.note)
      if (err) {
        toast.warning('Motif manquant', `Élève #${studentId} : ${err}`)
        return
      }
    }

    const payload: BulkPresencePayload = {
      classId,
      sessionDate: sessionDate || undefined,
      idempotencyKey: createIdempotencyKey(),
      entries: Object.entries(statusByStudent).map(([studentId, status]) => {
        const id = Number(studentId)
        const reason = reasonByStudent[id]
        return {
          studentId: id,
          status,
          ...(status !== 'PRESENT'
            ? {
                reasonCode: reason?.reasonCode ?? defaultReasonCodeForStatus(status),
                note: reason?.note,
              }
            : {}),
        }
      }),
    }

    setSubmitting(true)
    try {
      const { data, message, statusCode } = await bulk.mutateAsync(payload)
      const outcome = interpretBulkPresenceResult(data, statusCode, message)

      setFailedIds(new Set(outcome.failedStudentIds))
      setDuplicateIds(new Set(outcome.duplicateStudentIds))

      if (data.sheetId) {
        setActiveSheetId(data.sheetId)
        setSheetStatus(data.sheetStatus ?? 'SUBMITTED')
      }

      if (outcome.kind === 'full_success') {
        toast.success(outcome.title, outcome.detail)
        void refetchDraft()
        return
      }

      if (outcome.kind === 'all_duplicates') {
        void refetchDraft()
        const sealHint =
          data.sheetStatus === 'SUBMITTED' && data.sheetId
            ? ' Le cahier est à jour — vous pouvez clôturer la séance.'
            : ''
        toast.warning(outcome.title, `${outcome.detail}${sealHint}`)
        return
      }

      if (outcome.kind === 'all_failed') {
        toast.error(outcome.title, outcome.detail)
        return
      }

      toast.warning(outcome.title, outcome.detail)
    } catch (err) {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSeal() {
    if (!activeSheetId || sealSheet.isPending) return
    try {
      const { data, message } = await sealSheet.mutateAsync(activeSheetId)
      setActiveSheetId(data.sheetId ?? activeSheetId)
      setSheetStatus('SEALED')
      void refetchDraft()
      const sealHint = data.sheetAuditSeal ? ` Sceau : ${data.sheetAuditSeal.slice(0, 12)}…` : ''
      toast.success(
        'Séance clôturée',
        (message ?? 'Le cahier d\'appel est scellé.') + sealHint + ' Téléchargez le registre ci-dessous.',
      )
    } catch (err) {
      toast.error('Clôture impossible', getApiErrorMessage(err))
    }
  }

  const busy = submitting || bulk.isPending || sealSheet.isPending
  const sheetLocked = sheetStatus === 'SEALED'
  const sheetSubmitted = sheetStatus === 'SUBMITTED'
  const allLinesRecorded =
    (sheetDraft?.lines?.length ?? 0) > 0 && sheetDraft!.lines.every((l) => l.presenceId != null)
  const canSeal = sheetSubmitted && activeSheetId != null
  const showSubmit = !sheetSubmitted && !sheetLocked
  const hasRowIssues = failedIds.size > 0 || duplicateIds.size > 0
  const readOnly = busy || sheetSubmitted || sheetLocked

  return (
    <AdminModal
      title="Cahier d'appel"
      subtitle="Saisie groupée — une feuille par classe et par jour"
      icon={ClipboardList}
      size="xl"
      onClose={onClose}
      closeDisabled={busy}
      badge={
        sheetStatus ? (
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
              SHEET_STATUS_BADGE[sheetStatus],
            )}
          >
            {SHEET_STATUS_LABEL[sheetStatus]}
          </span>
        ) : draftLoading && classId > 0 ? (
          <span className="text-[10px] text-zinc-400">Chargement…</span>
        ) : null
      }
      footer={
        <div className="flex w-full flex-col gap-3">
          {sheetLocked && activeSheetId != null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
              <p className="mb-2 text-xs font-medium text-emerald-900">
                Registre officiel — téléchargement
              </p>
              <AttendanceSheetExportButtons sheetId={activeSheetId} />
            </div>
          )}
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-white disabled:opacity-50"
            >
              {hasRowIssues || canSeal || sheetLocked ? 'Fermer' : 'Annuler'}
            </button>
            {canSeal && (
              <button
                type="button"
                onClick={handleSeal}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <Lock size={16} />
                Clôturer la séance
              </button>
            )}
            {showSubmit && (
              <button
                type="submit"
                disabled={busy || !classId || summary.total === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? (
                  'Enregistrement…'
                ) : (
                  <>
                    <Check size={16} />
                    Enregistrer ({summary.total})
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      }
    >
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">Classe</label>
            {classesLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-zinc-100" />
            ) : (
              <select
                value={classId || ''}
                onChange={(e) => setClassId(Number(e.target.value))}
                disabled={readOnly}
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
              Date de session (optionnel)
            </label>
            <input
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              disabled={readOnly}
              className={selectCls}
            />
          </div>
        </div>

        {classId > 0 && summary.total > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: 'Élèves', value: summary.total, cls: 'text-zinc-800' },
              { label: 'Présents', value: summary.present, cls: 'text-emerald-700' },
              { label: 'Retards', value: summary.late, cls: 'text-amber-700' },
              { label: 'Absents', value: summary.absent, cls: 'text-red-700' },
              { label: 'Déjà pointés', value: summary.recorded, cls: 'text-blue-700' },
            ].map(({ label, value, cls }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-center"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
                <p className={cn('text-lg font-bold tabular-nums', cls)}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {classId > 0 && students.length > 0 && !sheetSubmitted && !sheetLocked && (
          <div className="flex flex-wrap gap-2">
            {ROW_STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={readOnly}
                onClick={() => setAll(value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                Tout {label.toLowerCase()}
              </button>
            ))}
          </div>
        )}

        {sheetSubmitted && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
            <Check size={14} className="mt-0.5 shrink-0" />
            <p>
              Cahier soumis — les présences sont enregistrées.
              {allLinesRecorded
                ? ' Cliquez sur « Clôturer la séance » pour finaliser.'
                : ' Certaines lignes restent à compléter avant clôture.'}
            </p>
          </div>
        )}

        {sheetLocked && activeSheetId != null && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="mb-3 text-xs font-medium text-emerald-900">
              Registre officiel — prêt pour inspection et archives
            </p>
            <AttendanceSheetExportButtons sheetId={activeSheetId} />
          </div>
        )}

        {sheetLocked && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
            <Lock size={14} className="mt-0.5 shrink-0" />
            <p>Ce cahier est scellé. Aucune modification sans correction auditée.</p>
          </div>
        )}

        {hasRowIssues && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold text-red-700">Rouge</span> = échec serveur ·{' '}
              <span className="font-semibold text-amber-700">Ambre</span> = déjà pointé aujourd&apos;hui
            </p>
          </div>
        )}

        <div className="max-h-[min(50vh,420px)] overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50/30 p-2">
          {!classId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users size={32} className="mb-3 text-zinc-200" />
              <p className="text-sm text-zinc-500">Sélectionnez une classe pour afficher les élèves</p>
            </div>
          ) : studentsLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">Aucun élève dans cette classe.</p>
          ) : (
            <ul className="space-y-2">
              {students.map((student) => {
                const status = statusByStudent[student.id] ?? 'PRESENT'
                const isFailed = failedIds.has(student.id)
                const isDuplicate = duplicateIds.has(student.id)
                const name =
                  formatStudentFullName(student) ||
                  `Élève #${student.id}`
                const reason = reasonByStudent[student.id]

                return (
                  <li
                    key={student.id}
                    className={cn(
                      'rounded-xl border bg-white p-3 shadow-sm transition-colors',
                      isFailed && 'border-red-200 bg-red-50/50',
                      !isFailed && isDuplicate && 'border-amber-200 bg-amber-50/40',
                      !isFailed && !isDuplicate && 'border-zinc-100',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
                          <PresenceStatusBadge status={status} />
                        </div>
                        {student.matricule && (
                          <p className="text-xs text-zinc-400">{student.matricule}</p>
                        )}
                        {isFailed && (
                          <p className="mt-1 text-[10px] font-medium text-red-600">Échec serveur</p>
                        )}
                        {isDuplicate && !isFailed && (
                          <p className="mt-1 text-[10px] font-medium text-amber-700">
                            Déjà pointé aujourd&apos;hui
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {ROW_STATUS_OPTIONS.map(({ value, label, active }) => (
                          <button
                            key={value}
                            type="button"
                            disabled={readOnly}
                            onClick={() => setStudentStatus(student.id, value)}
                            className={cn(
                              'rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 sm:text-xs',
                              status === value
                                ? active
                                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {status !== 'PRESENT' && (
                      <div className="mt-3 border-t border-zinc-100 pt-3">
                        <PresenceReasonFields
                          status={status}
                          reasonCode={
                            (reason?.reasonCode as PresenceReasonCode) ||
                            defaultReasonCodeForStatus(status)
                          }
                          note={reason?.note}
                          disabled={readOnly}
                          selectClassName={selectCls}
                          onReasonCodeChange={(code) =>
                            setReasonByStudent((prev) => ({
                              ...prev,
                              [student.id]: {
                                reasonCode: (code ||
                                  defaultReasonCodeForStatus(status)) as PresenceReasonCode,
                                note: prev[student.id]?.note,
                              },
                            }))
                          }
                          onNoteChange={(note) =>
                            setReasonByStudent((prev) => ({
                              ...prev,
                              [student.id]: {
                                reasonCode:
                                  prev[student.id]?.reasonCode ??
                                  (defaultReasonCodeForStatus(status) as PresenceReasonCode),
                                note,
                              },
                            }))
                          }
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminModal>
  )
}
