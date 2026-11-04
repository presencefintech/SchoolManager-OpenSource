'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HeartPulse, Loader2, Plus } from 'lucide-react'
import {
  infirmaryApi,
  INFIRMARY_OUTCOMES,
  type InfirmaryOutcome,
} from '@/lib/admin/api/infirmary.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

const OUTCOME_TONE: Record<InfirmaryOutcome, string> = {
  REST: 'bg-sky-50 text-sky-700',
  OBSERVED: 'bg-amber-50 text-amber-700',
  MEDICATED: 'bg-emerald-50 text-emerald-700',
  SENT_HOME: 'bg-orange-50 text-orange-700',
  REFERRED: 'bg-red-50 text-red-700',
}

function formatArrivedAt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StudentInfirmaryPanel({ studentId }: { studentId: number }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const queryKey = ['admin', 'infirmary', studentId] as const
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => infirmaryApi.list(studentId),
    enabled: Number.isInteger(studentId) && studentId > 0,
  })

  const [showForm, setShowForm] = useState(false)
  const [complaint, setComplaint] = useState('')
  const [outcome, setOutcome] = useState<InfirmaryOutcome>('REST')
  const [notes, setNotes] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      infirmaryApi.create(studentId, {
        complaint: complaint.trim(),
        outcome,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Passage consigné — le parent est prévenu')
      void queryClient.invalidateQueries({ queryKey })
      setComplaint('')
      setNotes('')
      setOutcome('REST')
      setShowForm(false)
    },
    onError: (err) => toast.error('Enregistrement impossible', getApiErrorMessage(err)),
  })

  const visits = data?.items ?? []

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (complaint.trim().length < 2) {
      toast.error('Décrivez le motif du passage')
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <HeartPulse className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-zinc-700">Infirmerie</h2>
            <p className="text-[11px] text-zinc-500">
              Chaque passage est notifié au parent.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau passage
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Motif</span>
            <input
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              maxLength={500}
              placeholder="Ex. maux de tête, chute à la récréation…"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-600">Suite donnée</span>
            <div className="flex flex-wrap gap-1.5">
              {INFIRMARY_OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs',
                    outcome === o.value
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Notes (facultatif)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Consigner et prévenir le parent
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        </div>
      ) : visits.length === 0 ? (
        <p className="text-xs text-zinc-500">Aucun passage à l’infirmerie.</p>
      ) : (
        <ul className="divide-y divide-zinc-50">
          {visits.map((v) => (
            <li key={v.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800">{v.complaint}</p>
                <p className="text-[11px] text-zinc-500">
                  {formatArrivedAt(v.arrivedAt)}
                  {v.recordedBy ? ` · ${v.recordedBy}` : ''}
                  {v.className ? ` · ${v.className}` : ''}
                </p>
                {v.notes && <p className="mt-1 text-xs text-zinc-600">{v.notes}</p>}
              </div>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', OUTCOME_TONE[v.outcome])}>
                {v.outcomeLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
