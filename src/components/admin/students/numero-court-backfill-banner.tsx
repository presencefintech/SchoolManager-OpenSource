'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Hash, Loader2 } from 'lucide-react'
import { studentsApi } from '@/lib/admin/api/students.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'

const STATUS_KEY = ['admin', 'students', 'numero-court-status'] as const

/**
 * Rattrapage des élèves saisis avant la numérotation courte.
 * Invisible tant que tout le monde a un N° (ou si l'utilisateur n'a pas le droit — 403 silencieux).
 */
export function NumeroCourtBackfillBanner() {
  const toast = useToast()
  const qc = useQueryClient()

  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: studentsApi.numeroCourtStatus,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })

  const backfill = useMutation({
    mutationFn: studentsApi.numeroCourtBackfill,
    onSuccess: (result) => {
      if (result.remaining > 0) {
        // Restants : fiche en cours d'édition au même instant (réessayer) ou plage 100–9999 saturée
        toast.error(
          `${result.assigned} N° court(s) attribué(s)`,
          `${result.remaining} élève(s) encore sans N° — réessayez ; si cela persiste, la plage 100–9999 est saturée.`,
        )
      } else {
        toast.success('N° courts attribués', `${result.assigned} élève(s) numéroté(s).`)
      }
      void qc.invalidateQueries({ queryKey: STATUS_KEY })
      void qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
    onError: (err) => toast.error('Attribution impossible', getApiErrorMessage(err)),
  })

  const missing = status.data?.missing ?? 0
  if (!status.isSuccess || missing === 0) return null

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <Hash size={15} />
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {missing} élève{missing > 1 ? 's' : ''} sans N° court
          </p>
          <p className="text-xs text-amber-800/80">
            Saisis avant la numérotation : recherche guichet par N°, carte et photos {'{N°}.jpg'} indisponibles
            pour eux. Les N° sont attribués à la suite, par ancienneté — les N° existants ne changent pas.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => backfill.mutate()}
        disabled={backfill.isPending}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
      >
        {backfill.isPending ? <Loader2 size={13} className="animate-spin" /> : <Hash size={13} />}
        {backfill.isPending ? 'Attribution…' : 'Attribuer les N° manquants'}
      </button>
    </div>
  )
}
