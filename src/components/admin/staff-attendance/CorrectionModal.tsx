'use client'

import { useState } from 'react'
import { X, Loader2, Trash2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { staffAttendanceApi } from '@/lib/admin/api/staff-attendance.api'
import type { CorrectionPayload, StaffDay } from '@/types/staff-attendance'
import { extractValidationMessages, formatDateFr } from '@/lib/admin/staff-attendance.utils'
import { StaffDayStatusBadge } from './StaffDayStatusBadge'
import { FormErrorBlock } from './FormErrorBlock'

export function CorrectionModal({
  staffId,
  staffName,
  date,
  day,
  onClose,
  onSaved,
}: {
  staffId: number
  staffName: string
  date: string
  day: StaffDay
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'TIMES' | 'PRESENT'>('TIMES')
  const [arrivalTime, setArrivalTime] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [reason, setReason] = useState(day.correction?.reason ?? '')
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])

  const putMut = useMutation({
    mutationFn: (payload: CorrectionPayload) => staffAttendanceApi.putCorrection(staffId, date, payload),
  })
  const deleteMut = useMutation({
    mutationFn: () => staffAttendanceApi.deleteCorrection(staffId, date),
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (reason.trim().length < 3) {
      setError('Motif requis (3 caractères minimum).')
      return
    }
    const payload: CorrectionPayload =
      mode === 'TIMES'
        ? {
            mode: 'TIMES',
            reason: reason.trim(),
            ...(arrivalTime ? { arrivalTime } : {}),
            ...(departureTime ? { departureTime } : {}),
          }
        : { mode: 'PRESENT', reason: reason.trim() }
    try {
      await putMut.mutateAsync(payload)
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  async function onDelete() {
    setError('')
    try {
      await deleteMut.mutateAsync()
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Corriger la journée</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{staffName} · {formatDateFr(date)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-4 flex items-center gap-2">
          <span className="text-xs text-zinc-400">Statut actuel :</span>
          <StaffDayStatusBadge status={day.status} />
          {day.corrected && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
              déjà corrigé — {day.correction?.reason}
            </span>
          )}
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="inline-flex gap-1 p-1 bg-zinc-100 rounded-xl">
            {(['TIMES', 'PRESENT'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  mode === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
                )}
              >
                {m === 'TIMES' ? 'Heures saisies' : 'Présence attestée'}
              </button>
            ))}
          </div>

          {mode === 'TIMES' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Arrivée</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Départ</label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                />
              </div>
              <p className="col-span-2 text-[11px] text-zinc-400">
                Si seule l'arrivée est saisie, le dernier badge du jour sert de départ.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
              Sans heures — pour une panne de terminal ou un jour où personne ne connaît les heures exactes.
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Motif</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Ex. oubli de badge, panne terminal…"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
            />
          </div>

          <FormErrorBlock message={error} details={validationDetails} />

          <div className="flex gap-3 pt-2">
            {day.corrected && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteMut.isPending}
                title="Annuler la correction"
                className="px-3 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={putMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium"
            >
              {putMut.isPending && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
