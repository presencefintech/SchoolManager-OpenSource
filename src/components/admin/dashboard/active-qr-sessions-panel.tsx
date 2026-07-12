'use client'

import { useMemo } from 'react'
import { QrCode, Ban, RefreshCw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveScanSessions, useRevokeScanSession, useClasses } from '@/lib/hooks/use-admin'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-slate-100 animate-pulse', className)} />
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function minutesUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.round(diff / 60_000))
}

export function ActiveQrSessionsPanel() {
  const toast = useToast()
  const { status: realtimeStatus } = useAdminRealtimeStatus()
  const { data, isLoading, refetch, isFetching } = useActiveScanSessions({ limit: 20 })
  const { data: classes = [] } = useClasses({ isActive: true })
  const revoke = useRevokeScanSession()

  const classNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) map.set(c.id, c.name)
    return map
  }, [classes])

  const sessions = data?.sessions ?? []

  const handleRevoke = (sessionId: string) => {
    revoke.mutate(sessionId, {
      onSuccess: () => toast.success('Session QR révoquée'),
      onError: (err) => toast.error('Révocation impossible', getApiErrorMessage(err)),
    })
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <QrCode size={16} className="text-violet-600" />
          <h3 className="text-sm font-semibold text-slate-800">Sessions QR actives</h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
            {data?.count ?? 0}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-50"
          title="Actualiser"
        >
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-auto max-h-72">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Sk className="h-10" />
            <Sk className="h-10" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Aucune session dual-QR en cours
            {realtimeStatus === 'live' && ' — mise à jour auto sur pointage'}
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2 font-medium">Classe</th>
                <th className="px-4 py-2 font-medium">Scans</th>
                <th className="px-4 py-2 font-medium">Expire</th>
                <th className="px-4 py-2 font-medium w-20" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const mins = minutesUntil(s.expiresAt)
                const urgent = mins <= 5
                return (
                  <tr key={s.sessionId} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">
                        {classNameById.get(s.classId) ?? `Classe #${s.classId}`}
                      </p>
                      <p className="text-[10px] text-slate-400">Ens. #{s.teacherId}</p>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">
                      {s.scanCount}/{s.maxScans}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-flex items-center gap-1', urgent && 'text-amber-700')}>
                        <Clock size={11} />
                        {mins} min · {fmtTime(s.expiresAt)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleRevoke(s.sessionId)}
                        disabled={revoke.isPending}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Ban size={11} />
                        Révoquer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
