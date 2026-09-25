'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle, ClipboardCopy, Loader2, Stethoscope, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { presenceDiagnosticsApi } from '@/lib/admin/api'
import { formatDetailValue, humanizeEnum } from '@/lib/i18n/display-labels'
import { useToast } from '@/providers/toast-provider'

/** Sondes /admin/presences/health* — à transmettre au support en cas de souci de pointage. */
export function PresenceDiagnosticsPanel() {
  const toast = useToast()
  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'monitoring', 'presence-diagnostics'],
    queryFn: presenceDiagnosticsApi.runAll,
    enabled: false,
    staleTime: Infinity,
  })

  const allOk = data?.every((c) => c.ok)

  async function copyReport() {
    if (!data) return
    const report = JSON.stringify(
      {
        generatedAt: new Date(dataUpdatedAt).toISOString(),
        page: typeof window !== 'undefined' ? window.location.origin : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        checks: data,
      },
      null,
      2,
    )
    try {
      await navigator.clipboard.writeText(report)
      toast.success('Rapport copié', 'Collez-le dans votre message au support.')
    } catch {
      toast.error('Copie impossible', 'Votre navigateur a bloqué le presse-papiers.')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="px-6 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Stethoscope size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Diagnostic présences</h2>
          {data ? (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                allOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
              )}
            >
              {allOk ? 'Tout est OK' : 'Problème détecté'}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          {data ? (
            <button
              type="button"
              onClick={() => void copyReport()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <ClipboardCopy size={14} />
              Copier le rapport
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
            {data ? 'Relancer' : 'Lancer le diagnostic'}
          </button>
        </div>
      </div>

      {!data ? (
        <p className="px-6 py-5 text-sm text-zinc-500">
          Les enseignants n&apos;arrivent pas à pointer ? Lancez le diagnostic : il vérifie le module présences,
          votre session et l&apos;école active, puis produit un rapport à transmettre au support.
        </p>
      ) : (
        <div className="divide-y divide-zinc-50">
          {data.map((check) => {
            const details = check.details
              ? Object.entries(check.details)
                  .slice(0, 8)
                  .map(([k, v]) => `${humanizeEnum(k)} : ${formatDetailValue(v)}`)
                  .join(' · ')
              : ''
            return (
              <div key={check.key} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{check.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{check.ok ? check.hint : check.message ?? 'Échec'}</p>
                  {details ? <p className="text-xs text-zinc-400 mt-1 break-words">{details}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
                      check.ok
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-red-50 text-red-700 border-red-100',
                    )}
                  >
                    {check.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {check.ok ? 'OK' : check.httpStatus ? `Erreur ${check.httpStatus}` : 'Injoignable'}
                  </span>
                  <span className="text-[11px] tabular-nums text-zinc-400">{check.latencyMs} ms</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
