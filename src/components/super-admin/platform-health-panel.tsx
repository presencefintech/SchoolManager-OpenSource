'use client'

import Link from 'next/link'
import { CheckCircle2, AlertCircle, XCircle, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlatformHealth } from '@/types/super-admin'
import {
  environmentLabel,
  healthStatusLabel,
  serviceLabel,
} from '@/lib/i18n/display-labels'

const CARD = 'bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6'
const SKELETON = 'bg-zinc-100 rounded-xl animate-pulse'

function formatUptime(seconds?: number) {
  if (seconds == null || seconds < 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}j ${h % 24}h`
  }
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function messagingLabel(ready: boolean, forceMock: boolean) {
  if (ready) return 'Prêt'
  if (forceMock) return 'Mode test'
  return 'Non configuré'
}

function StatusBadge({ status }: { status: PlatformHealth['status'] }) {
  const map = {
    ok: { className: 'text-emerald-700 bg-emerald-50', Icon: CheckCircle2 },
    degraded: { className: 'text-amber-700 bg-amber-50', Icon: AlertCircle },
    down: { className: 'text-red-700 bg-red-50', Icon: XCircle },
  } as const
  const { className, Icon } = map[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg', className)}>
      <Icon size={12} />
      {healthStatusLabel(status)}
    </span>
  )
}

function ServiceChip({ id, ok }: { id: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-100 px-3 py-2.5">
      <p className="text-[11px] text-zinc-400">{serviceLabel(id)}</p>
      <p className={cn('text-sm font-medium', ok ? 'text-emerald-700' : 'text-amber-700')}>
        {ok ? 'Opérationnel' : 'Dégradé'}
      </p>
    </div>
  )
}

type Props = {
  data?: PlatformHealth
  loading?: boolean
  error?: boolean
}

/** Carte santé plateforme — Ops Superadmin (réutilise l’API monitoring). */
export function PlatformHealthPanel({ data, loading, error }: Props) {
  return (
    <div className={CARD}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <Server size={16} className="text-zinc-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Santé plateforme</h2>
            {data ? <StatusBadge status={data.status} /> : null}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Services critiques, observabilité et signaux de sécurité
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn(SKELETON, 'h-14')} />
          ))}
        </div>
      ) : error || !data ? (
        <p className="text-sm text-zinc-400">Impossible de charger la santé plateforme.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
            <span>
              Surveillance erreurs{' '}
              <span className={data.observability.sentryEnabled ? 'text-emerald-700 font-medium' : ''}>
                {data.observability.sentryEnabled ? 'active' : 'inactive'}
              </span>
            </span>
            <span>{environmentLabel(data.observability.environment)}</span>
            <span>Disponibilité {formatUptime(data.observability.uptimeSeconds)}</span>
            {data.observability.release ? (
              <span title={data.observability.release} className="font-mono">
                version {data.observability.release.slice(0, 8)}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ServiceChip id="db" ok={data.services.db} />
            <ServiceChip id="redis" ok={data.services.redis} />
            <ServiceChip id="notifications" ok={data.services.notifications} />
            <ServiceChip id="biometrics" ok={data.services.biometrics} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-zinc-400">Refus d’accès (24 h)</p>
              <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
                {data.security.accessDenied24h}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Alertes sécurité (24 h)</p>
              <p className="text-2xl font-semibold text-zinc-900 tabular-nums">
                {data.security.securityEvents24h}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Messagerie</p>
              <p className="text-sm font-medium text-zinc-800 mt-1">
                SMS {messagingLabel(data.sms.ready, data.sms.forceMock)}
                {' · '}
                WhatsApp {messagingLabel(data.whatsapp.ready, data.whatsapp.forceMock)}
              </p>
            </div>
          </div>

          {data.boot?.alerts && data.boot.alerts.length > 0 ? (
            <ul className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 space-y-1">
              {data.boot.alerts.slice(0, 3).map((alert) => (
                <li key={alert} className="text-[11px] text-amber-800">
                  {alert}
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            href="/super-admin/audit-logs?tab=security"
            className="inline-flex text-xs font-medium text-zinc-600 hover:text-zinc-900 underline-offset-2 hover:underline"
          >
            Journal d’audit — sécurité →
          </Link>
        </div>
      )}
    </div>
  )
}
