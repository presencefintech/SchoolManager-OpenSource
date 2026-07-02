'use client'

import { useMemo, useState } from 'react'
import {
  Archive,
  ClipboardList,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePendingAttendanceSheets,
  useSealAttendanceSheet,
  useSubmitAttendanceSheet,
} from '@/lib/hooks/use-admin'
import type { AttendanceSheetStatus, PendingAttendanceSheetSummary } from '@/types/admin'
import {
  SHEET_STATUS_BADGE,
  SHEET_STATUS_LABEL,
} from '@/lib/presence/attendance-sheet.utils'
import { todayDateInputValue, toSessionDateApiParam } from '@/lib/presence/datetime-local.utils'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AttendanceSheetExportButtons } from '@/components/admin/presences/AttendanceSheetExportButtons'

function formatSessionDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export type OpenAttendanceSheetParams = {
  classId: number
  sessionDate: string
  sheetId: number
  status: AttendanceSheetStatus
}

type ViewMode = 'workflow' | 'archives'

type Props = {
  classId?: number
  onOpenSheet?: (params: OpenAttendanceSheetParams) => void
}

export function PendingSheetsPanel({ classId, onOpenSheet }: Props) {
  const toast = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('workflow')
  const [sessionDate, setSessionDate] = useState(todayDateInputValue())
  const [filterByDate, setFilterByDate] = useState(true)
  const [submitTarget, setSubmitTarget] = useState<PendingAttendanceSheetSummary | null>(null)
  const [sealTarget, setSealTarget] = useState<PendingAttendanceSheetSummary | null>(null)

  const queryParams = {
    ...(classId ? { classId } : {}),
    ...(viewMode === 'workflow' && filterByDate && sessionDate
      ? { sessionDate: toSessionDateApiParam(sessionDate) }
      : {}),
    ...(viewMode === 'archives' ? { status: 'SEALED' as const } : {}),
  }

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePendingAttendanceSheets(queryParams)
  const submit = useSubmitAttendanceSheet()
  const seal = useSealAttendanceSheet()

  const stats = useMemo(() => {
    const rows = data ?? []
    if (viewMode === 'archives') {
      return {
        total: rows.length,
        draft: 0,
        submitted: 0,
        sealed: rows.length,
        exceptions: rows.reduce((sum, r) => sum + r.exceptionCount, 0),
      }
    }
    return {
      total: rows.length,
      draft: rows.filter((r) => r.status === 'DRAFT').length,
      submitted: rows.filter((r) => r.status === 'SUBMITTED').length,
      sealed: rows.filter((r) => r.status === 'SEALED').length,
      exceptions: rows.reduce((sum, r) => sum + r.exceptionCount, 0),
    }
  }, [data, viewMode])

  async function confirmSubmit() {
    if (!submitTarget) return
    try {
      const { data: submitted, message } = await submit.mutateAsync(submitTarget.sheetId)
      toast.success(
        'Feuille soumise',
        message ?? `Cahier ${submitTarget.className} prêt à clôturer. ${submitted.lineCount} ligne(s).`,
      )
      setSubmitTarget(null)
    } catch (err) {
      toast.error('Soumission impossible', getApiErrorMessage(err))
    }
  }

  async function confirmSeal() {
    if (!sealTarget) return
    try {
      const { data: sealed, message } = await seal.mutateAsync(sealTarget.sheetId)
      const sealHint = sealed.sheetAuditSeal
        ? ` Sceau : ${sealed.sheetAuditSeal.slice(0, 12)}…`
        : ''
      toast.success(
        'Séance clôturée',
        (message ?? `Cahier ${sealTarget.className} scellé.`) +
          sealHint +
          ' Téléchargez le registre ci-dessous ou dans Archives scellées.',
      )
      const sealedDate = sealTarget.sessionDate.slice(0, 10)
      if (sealedDate) setSessionDate(sealedDate)
      setSealTarget(null)
      setViewMode('archives')
    } catch (err) {
      toast.error('Clôture impossible', getApiErrorMessage(err))
    }
  }

  const emptyMessage =
    viewMode === 'archives'
      ? {
          title: 'Aucun registre scellé',
          detail: 'Les cahiers clôturés apparaîtront ici pour téléchargement PDF ou CSV.',
        }
      : {
          title: 'Aucun cahier pour cette sélection',
          detail: filterByDate
            ? 'Aucun cahier pour cette date. Essayez « Toutes les dates » ou ouvrez Archives scellées.'
            : 'Ouvrez un cahier via « Cahier d\'appel » ou changez le filtre classe.',
        }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-indigo-50/40 via-white to-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <ClipboardList size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">Cahiers d&apos;appel</h3>
                  <p className="text-xs text-zinc-500">
                    Workflow DRAFT → SUBMITTED → SEALED · export registre officiel
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('workflow')}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    viewMode === 'workflow'
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-600 hover:bg-zinc-50',
                  )}
                >
                  En cours
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('archives')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    viewMode === 'archives'
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-600 hover:bg-zinc-50',
                  )}
                >
                  <Archive size={12} />
                  Archives scellées
                </button>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
              >
                <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
                Actualiser
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {viewMode === 'archives' ? (
              <>
                {[
                  { label: 'Scellés', value: stats.sealed, tone: 'text-emerald-700' },
                  { label: 'Exceptions', value: stats.exceptions, tone: 'text-amber-700' },
                ].map(({ label, value, tone }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-zinc-100 bg-white/80 px-3 py-2.5 shadow-sm"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                      {label}
                    </p>
                    <p className={cn('text-xl font-bold tabular-nums', tone)}>{value}</p>
                  </div>
                ))}
              </>
            ) : (
              [
                { label: 'Total', value: stats.total, tone: 'text-zinc-900' },
                { label: 'Brouillons', value: stats.draft, tone: 'text-zinc-600' },
                { label: 'À clôturer', value: stats.submitted, tone: 'text-blue-700' },
                { label: 'Scellés', value: stats.sealed, tone: 'text-emerald-700' },
                { label: 'Exceptions', value: stats.exceptions, tone: 'text-amber-700' },
              ].map(({ label, value, tone }) => (
                <div
                  key={label}
                  className="rounded-xl border border-zinc-100 bg-white/80 px-3 py-2.5 shadow-sm"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    {label}
                  </p>
                  <p className={cn('text-xl font-bold tabular-nums', tone)}>{value}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            {viewMode === 'workflow' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Date de session</label>
                  <input
                    type="date"
                    value={sessionDate}
                    disabled={!filterByDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterByDate((v) => !v)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    filterByDate
                      ? 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700',
                  )}
                >
                  {filterByDate ? 'Toutes les dates' : 'Filtrer par date'}
                </button>
              </>
            )}
            {viewMode === 'archives' && (
              <p className="text-xs text-zinc-500">
                Tous les registres scellés sont listés — utilisez le filtre classe si besoin.
              </p>
            )}
            {classId != null && (
              <p className="text-xs text-zinc-400">
                <Search size={12} className="mr-1 inline" />
                Filtre classe actif depuis la barre principale
              </p>
            )}
          </div>
        </div>

        {isError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-red-700">Impossible de charger les cahiers</p>
            <p className="mt-1 text-xs text-zinc-500">{getApiErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Réessayer
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="px-6 py-16 text-center">
            <div
              className={cn(
                'mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl',
                viewMode === 'archives' ? 'bg-emerald-50 text-emerald-500' : 'bg-emerald-50 text-emerald-500',
              )}
            >
              {viewMode === 'archives' ? <Archive size={24} /> : <Lock size={24} />}
            </div>
            <p className="text-sm font-medium text-zinc-700">{emptyMessage.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{emptyMessage.detail}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Classe
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Lignes
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Saisi par
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.map((row) => (
                  <tr key={row.sheetId} className="transition-colors hover:bg-zinc-50/70">
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900">{row.className}</p>
                      <p className="text-[11px] text-zinc-400">#{row.sheetId}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-600">
                      {formatSessionDate(row.sessionDate)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          SHEET_STATUS_BADGE[row.status],
                        )}
                      >
                        {SHEET_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="tabular-nums text-zinc-700">{row.lineCount}</span>
                      {row.exceptionCount > 0 && (
                        <span className="ml-2 text-[11px] font-medium text-amber-700">
                          {row.exceptionCount} except.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-500">
                      {row.createdByName || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {row.status === 'SEALED' && (
                          <AttendanceSheetExportButtons sheetId={row.sheetId} compact />
                        )}
                        {onOpenSheet && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenSheet({
                                classId: row.classId,
                                sessionDate: row.sessionDate,
                                sheetId: row.sheetId,
                                status: row.status,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                          >
                            <ExternalLink size={12} />
                            {viewMode === 'archives' ? 'Consulter' : 'Ouvrir'}
                          </button>
                        )}
                        {viewMode === 'workflow' && row.status === 'DRAFT' && (
                          <button
                            type="button"
                            disabled={submit.isPending}
                            onClick={() => setSubmitTarget(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                          >
                            <Send size={11} />
                            Soumettre
                          </button>
                        )}
                        {viewMode === 'workflow' && row.status === 'SUBMITTED' && (
                          <button
                            type="button"
                            disabled={seal.isPending}
                            onClick={() => setSealTarget(row)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <Lock size={12} />
                            Clôturer
                          </button>
                        )}
                        {viewMode === 'workflow' && row.status === 'SEALED' && (
                          <span className="text-[11px] font-medium text-emerald-700">Registre prêt</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={submitTarget != null}
        title="Soumettre ce cahier d'appel ?"
        description="La feuille passera en statut SUBMITTED et pourra ensuite être clôturée définitivement."
        impact={
          submitTarget
            ? [
                `Classe : ${submitTarget.className}`,
                `Date : ${formatSessionDate(submitTarget.sessionDate)}`,
                `${submitTarget.lineCount} ligne(s) enregistrée(s)`,
              ]
            : []
        }
        confirmLabel="Soumettre la feuille"
        loading={submit.isPending}
        onConfirm={confirmSubmit}
        onCancel={() => setSubmitTarget(null)}
      />

      <ConfirmDialog
        open={sealTarget != null}
        title="Clôturer ce cahier d'appel ?"
        description="La feuille sera scellée et ne pourra plus être modifiée sans correction auditée."
        impact={
          sealTarget
            ? [
                `Classe : ${sealTarget.className}`,
                `Date : ${formatSessionDate(sealTarget.sessionDate)}`,
                `${sealTarget.lineCount} ligne(s), ${sealTarget.exceptionCount} exception(s)`,
              ]
            : []
        }
        confirmLabel="Clôturer la séance"
        loading={seal.isPending}
        onConfirm={confirmSeal}
        onCancel={() => setSealTarget(null)}
      />
    </>
  )
}
