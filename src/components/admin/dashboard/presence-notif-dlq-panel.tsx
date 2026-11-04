'use client'

import { RotateCcw, Trash2, MessageCircleWarning } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminNotificationsApi, type PresenceNotifDlqItem } from '@/lib/admin/api/notifications.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { adminOpsMessage, ADMIN_OPS_UI } from '@/lib/admin/admin-ops-messages'
import { sanitizeUserFacingMessage } from '@/lib/auth/security-errors'

export function PresenceNotifDlqPanel() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['admin', 'notif', 'presence-dlq'],
    queryFn: () => adminNotificationsApi.getPresenceDlq({ limit: 50 }),
    staleTime: 15_000,
  })

  const replay = useMutation({
    mutationFn: (jobId: string) => adminNotificationsApi.replayPresenceDlq(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notif', 'presence-dlq'] }),
  })

  const discard = useMutation({
    mutationFn: (jobId: string) => adminNotificationsApi.discardPresenceDlq(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notif', 'presence-dlq'] }),
  })

  const items = query.data?.items ?? []
  const redis = query.data?.redis !== false
  const successHint =
    replay.isSuccess ? ADMIN_OPS_UI.DLQ_JOB_REPLAYED : discard.isSuccess ? ADMIN_OPS_UI.DLQ_JOB_PURGED : null

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 overflow-hidden">
      <div className="flex items-start gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <MessageCircleWarning size={16} className="text-amber-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Notifications de présence non envoyées</h3>
          <p className="text-xs text-slate-500">
            Motifs d’échec passerelle WhatsApp / SMS — relance manuelle confirmée
          </p>
        </div>
      </div>
      {query.isError ? (
        <p className="px-5 py-6 text-sm text-rose-700">
          {adminOpsMessage(undefined, getApiErrorMessage(query.error))}
        </p>
      ) : !redis ? (
        <p className="px-5 py-6 text-sm text-amber-800">{ADMIN_OPS_UI.DLQ_UNAVAILABLE}</p>
      ) : query.isLoading ? (
        <div className="p-4 h-20 bg-slate-50 animate-pulse" aria-busy="true" />
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 text-center">Aucune notification en échec définitif.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item: PresenceNotifDlqItem) => {
            const jobId = String(item.jobId ?? '')
            const reason =
              item.errorMessage ||
              item.data?.failedReason ||
              ADMIN_OPS_UI.GATEWAY_DELIVERY_FAILED
            return (
              <li key={jobId} className="px-5 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    Présence #{item.presenceId ?? item.data?.presenceId ?? '—'} · élève{' '}
                    {item.studentId ?? item.data?.studentId ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sanitizeUserFacingMessage(reason, ADMIN_OPS_UI.GATEWAY_DELIVERY_FAILED)}
                    {item.attemptsMade != null ? ` · ${item.attemptsMade} tentative(s)` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    disabled={!jobId || replay.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Relancer cette notification vers WhatsApp / SMS ?',
                        )
                      ) {
                        replay.mutate(jobId)
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    Relancer
                  </button>
                  <button
                    type="button"
                    disabled={!jobId || discard.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Retirer définitivement cette notification de la file d’échecs ? Cette action est irréversible.',
                        )
                      ) {
                        discard.mutate(jobId)
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    aria-label="Purger le job"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {successHint && (
        <p className="px-5 py-2 text-xs text-emerald-800 border-t border-emerald-100">{successHint}</p>
      )}
      {(replay.error || discard.error) && (
        <p className="px-5 py-2 text-xs text-rose-700 border-t border-rose-100">
          {getApiErrorMessage(replay.error ?? discard.error)}
        </p>
      )}
    </div>
  )
}
