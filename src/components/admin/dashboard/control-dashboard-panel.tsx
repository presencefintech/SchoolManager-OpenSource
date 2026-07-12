'use client'

import { Server, Gauge, Shield, Fingerprint, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useControlStats } from '@/lib/hooks/use-admin'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
import { ScanFlowChart } from '@/components/admin/dashboard/admin-dashboard-charts'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-slate-100 animate-pulse', className)} />
}

const INTEGRITY_STYLE = {
  healthy: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-700 bg-amber-50',
  critical: 'text-red-700 bg-red-50',
  unavailable: 'text-slate-500 bg-slate-100',
} as const

export function ControlDashboardPanel() {
  const { status: realtimeStatus } = useAdminRealtimeStatus()
  const { data: control, isPending } = useControlStats()

  if (isPending || !control) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 space-y-3">
        <Sk className="h-5 w-40" />
        <Sk className="h-32" />
      </div>
    )
  }

  const integrityClass = INTEGRITY_STYLE[control.integrity.status] ?? INTEGRITY_STYLE.unavailable

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Ops contrôle</h3>
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
              control.pipeline.healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
            )}
          >
            Pipeline {control.pipeline.healthy ? 'OK' : 'dégradé'}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {realtimeStatus === 'live' ? 'Socket ~3s' : 'Polling 30s'}
          {control.generatedAt && (
            <> · {new Date(control.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
          )}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Gauge size={12} />
              <span className="text-[10px] uppercase tracking-wide">Scans / min</span>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{control.performance.scansPerMinute}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Zap size={12} />
              <span className="text-[10px] uppercase tracking-wide">API ms</span>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{control.performance.apiAvgMs}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Zap size={12} />
              <span className="text-[10px] uppercase tracking-wide">Worker ms</span>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{control.performance.workerAvgMs}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Server size={12} />
              <span className="text-[10px] uppercase tracking-wide">File</span>
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{control.pipeline.queueDepth}</p>
            <p className="text-[10px] text-slate-400">{control.workers.active} actif(s)</p>
          </div>
        </div>

        <ScanFlowChart data={control.scanFlow} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-100 p-3">
            <div className="flex items-center gap-1.5 text-slate-600 font-medium mb-2">
              <Shield size={13} />
              Gatekeeper (1h)
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold text-slate-800 tabular-nums">{control.security.gatekeeper.livenessFailure}</p>
                <p className="text-[9px] text-slate-400">Liveness</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 tabular-nums">{control.security.gatekeeper.imageQuality}</p>
                <p className="text-[9px] text-slate-400">Qualité</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 tabular-nums">{control.security.gatekeeper.other}</p>
                <p className="text-[9px] text-slate-400">Autre</p>
              </div>
            </div>
            {control.security.fraudAlertActive && (
              <p className="mt-2 text-[10px] font-medium text-red-600">Alerte fraude active</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Fingerprint size={13} />
                Intégrité scans
              </div>
              <span className={cn('text-[9px] font-bold uppercase px-2 py-0.5 rounded-full', integrityClass)}>
                {control.integrity.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold text-emerald-700 tabular-nums">{control.integrity.verified}</p>
                <p className="text-[9px] text-slate-400">Vérifiés</p>
              </div>
              <div>
                <p className="font-bold text-rose-600 tabular-nums">{control.integrity.errors}</p>
                <p className="text-[9px] text-slate-400">Corrompus</p>
              </div>
              <div>
                <p className="font-bold text-slate-600 tabular-nums">{control.integrity.unchecked}</p>
                <p className="text-[9px] text-slate-400">En attente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
