'use client'

import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react'
import type { BulkJobProgress } from '@/lib/admin/api/deliberations.api'
import {
  humanProgressDetail,
  progressStatusLabel,
} from './deliberation-copy'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  progress: BulkJobProgress | null
  className?: string
  onClose?: () => void
}

export function DeliberationProgressModal({
  open,
  progress,
  className,
  onClose,
}: Props) {
  if (!open) return null

  const percent = Math.min(100, Math.max(0, progress?.percent ?? 0))
  const status = progress?.status ?? 'queued'
  const done = status === 'completed'
  const failed = status === 'failed'
  const canClose = done || failed
  const label = progressStatusLabel(status, done, failed)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delib-progress-title"
        aria-busy={!done && !failed}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h3
              id="delib-progress-title"
              className="text-base font-semibold text-slate-900"
            >
              {className
                ? `Délibération — ${className}`
                : 'Délibération de classe'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Merci de patienter pendant le calcul des résultats
            </p>
          </div>
          {canClose && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="px-5 py-6 space-y-5">
          <div className="flex items-center gap-3">
            {failed ? (
              <XCircle className="h-7 w-7 text-rose-600 shrink-0" />
            ) : done ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
            ) : (
              <Loader2 className="h-7 w-7 text-[#1e3a5f] animate-spin shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {progress
                  ? humanProgressDetail(progress.processed, progress.total)
                  : 'Initialisation…'}
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-2 tabular-nums">
              <span className="font-medium text-slate-600">
                {done
                  ? 'Terminé'
                  : failed
                    ? 'Échec'
                    : 'Progression'}
              </span>
              <span>{(done || failed ? 100 : percent).toFixed(0)} %</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  failed
                    ? 'bg-rose-500'
                    : done
                      ? 'bg-emerald-600'
                      : 'bg-[#1e3a5f]',
                )}
                style={{
                  width: `${done || failed ? 100 : Math.max(percent, 6)}%`,
                }}
              />
            </div>
          </div>

          {failed ? (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              Le traitement n’a pas pu aboutir. Vérifiez que les notes de la
              classe sont complètes, puis réessayez.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
