'use client'

import { Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SchoolTabletDevice, TabletConnectionStatus } from '@/lib/admin/api/dashboard.api'
import { TABLET_STATUS_LABEL } from '@/lib/admin/admin-ops-messages'

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolveStatus(device: SchoolTabletDevice): TabletConnectionStatus {
  if (device.status) return device.status
  return device.online ? 'ONLINE' : 'OFFLINE'
}

const STATUS_STYLE: Record<TabletConnectionStatus, string> = {
  ONLINE: 'bg-emerald-50 text-emerald-700',
  OFFLINE: 'bg-slate-100 text-slate-500',
  SYNCING: 'bg-amber-50 text-amber-800',
}

const STATUS_DOT: Record<TabletConnectionStatus, string> = {
  ONLINE: 'bg-emerald-500',
  OFFLINE: 'bg-slate-400',
  SYNCING: 'bg-amber-500 animate-pulse',
}

export function TabletDevicesTable({
  devices,
  loading,
  error,
}: {
  devices: SchoolTabletDevice[]
  loading?: boolean
  error?: string | null
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <Smartphone size={16} className="text-slate-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Tablettes</h3>
          <p className="text-xs text-slate-500">
            Statut de connexion, dernier sync et volume encore en file locale
          </p>
        </div>
      </div>
      {error && !loading ? (
        <p className="px-5 py-6 text-sm text-rose-700">{error}</p>
      ) : loading ? (
        <div className="p-4 space-y-2" aria-busy="true">
          <div className="h-10 bg-slate-100 animate-pulse rounded" />
          <div className="h-10 bg-slate-100 animate-pulse rounded" />
        </div>
      ) : devices.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 text-center">Aucune tablette n’a encore synchronisé.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-5 py-2 font-medium">Appareil</th>
                <th className="px-5 py-2 font-medium">Connexion</th>
                <th className="px-5 py-2 font-medium">Dernier sync</th>
                <th className="px-5 py-2 font-medium text-right">En attente</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const status = resolveStatus(device)
                return (
                  <tr key={device.deviceId} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{device.deviceId}</td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                          STATUS_STYLE[status],
                        )}
                        title={`Code ${status}`}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
                        {TABLET_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatWhen(device.lastSyncAt ?? device.lastSeenAt)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-800">
                      {device.pendingCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
