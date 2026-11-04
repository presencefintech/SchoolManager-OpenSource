'use client'

import Link from 'next/link'
import {
  CheckCircle2, XCircle, AlertTriangle, Rocket, Settings2, RefreshCw, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useAttendanceReadiness,
  useProvisionAttendanceSettings,
} from '@/lib/hooks/use-admin'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import type { AttendanceReadinessChecks } from '@/types/admin'

const CHECK_LABELS: Record<keyof AttendanceReadinessChecks, string> = {
  settingsProvisioned: 'Paramètres initialisés',
  qrCodeEnabled: 'Pointage QR activé',
  geofenceConfigured: 'Zone GPS configurée',
  academicSessionOpen: 'Session académique ouverte',
  dualQrRequired: 'Double QR requis',
  offlineSyncEnabled: 'Hors ligne autorisé',
  parentPresenceNotificationsEnabled: 'Notifications parents',
}

const CHECK_ORDER: (keyof AttendanceReadinessChecks)[] = [
  'settingsProvisioned',
  'qrCodeEnabled',
  'geofenceConfigured',
  'academicSessionOpen',
  'dualQrRequired',
  'offlineSyncEnabled',
  'parentPresenceNotificationsEnabled',
]

function ScoreRing({ score, ready }: { score: number; ready: boolean }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(ready ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-900 tabular-nums">{score}%</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">score</span>
      </div>
    </div>
  )
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
      ) : (
        <XCircle size={14} className="text-rose-400 flex-shrink-0" />
      )}
      <span className={cn(ok ? 'text-slate-600' : 'text-slate-800 font-medium')}>{label}</span>
    </li>
  )
}

export function AttendanceReadinessPanel() {
  const { status: realtimeStatus } = useAdminRealtimeStatus()
  const { data, isLoading, isError, error, refetch, isFetching } = useAttendanceReadiness()
  const provision = useProvisionAttendanceSettings()

  const handleProvision = () => {
    provision.mutate(undefined, {
      onSuccess: (res) => {
        void refetch()
        if (!res.provisioned) return
      },
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-5 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (isError || !data) {
    const detail = isError ? getApiErrorMessage(error) : 'Réponse vide du serveur.'
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-950">Préparation au pointage indisponible</p>
          <p className="text-xs text-amber-800/90 mt-0.5 break-words">{detail}</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs font-semibold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 flex-shrink-0"
        >
          <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
          Réessayer
        </button>
      </div>
    )
  }

  const metrics = data.metricsLastHour
  const failedChecks = CHECK_ORDER.filter((k) => !data.checks[k])

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="flex items-start gap-5 p-5 lg:border-r border-slate-100 min-w-0 flex-1">
          <ScoreRing score={data.score} ready={data.ready} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Rocket size={16} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Préparation au pointage</h2>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full',
                  data.ready
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700',
                )}
              >
                {data.ready ? 'Prêt' : 'En cours'}
              </span>
              {realtimeStatus === 'live' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <Zap size={10} />
                  En direct
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Checklist de configuration du pointage
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {CHECK_ORDER.map((key) => (
                <CheckItem key={key} ok={data.checks[key]} label={CHECK_LABELS[key]} />
              ))}
            </ul>
          </div>
        </div>

        <div className="p-5 bg-slate-50/60 lg:w-72 flex-shrink-0 flex flex-col gap-3">
          {metrics && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white border border-slate-100 px-2 py-2">
                <p className="text-lg font-bold text-slate-800 tabular-nums">{metrics.dualQrValidated}</p>
                <p className="text-[9px] text-slate-400 uppercase">Validés</p>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 px-2 py-2">
                <p className="text-lg font-bold text-rose-600 tabular-nums">{metrics.dualQrRejected}</p>
                <p className="text-[9px] text-slate-400 uppercase">Refusés</p>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 px-2 py-2">
                <p className="text-lg font-bold text-slate-800 tabular-nums">{metrics.syncBatches}</p>
                <p className="text-[9px] text-slate-400 uppercase">Sync. 1 h</p>
              </div>
            </div>
          )}

          {!data.checks.settingsProvisioned && (
            <button
              type="button"
              onClick={handleProvision}
              disabled={provision.isPending}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {provision.isPending ? 'Initialisation…' : 'Initialiser les paramètres'}
            </button>
          )}

          {provision.isError && (
            <p className="text-[11px] text-red-600">{getApiErrorMessage(provision.error)}</p>
          )}
          {provision.isSuccess && provision.data?.message && (
            <p className="text-[11px] text-emerald-600">{provision.data.message}</p>
          )}

          <div className="flex gap-2 mt-auto">
            <Link
              href="/admin/settings"
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Settings2 size={12} />
              Paramètres
            </Link>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {data.recommendations.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-amber-50/50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <ul className="space-y-1">
              {data.recommendations.map((rec) => (
                <li key={rec} className="text-xs text-amber-900">{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {failedChecks.length > 0 && data.ready && (
        <div className="px-5 py-2 border-t border-slate-100 text-[11px] text-slate-400">
          Pointage prêt — {failedChecks.length} point(s) optionnel(s) restant(s).
        </div>
      )}
    </div>
  )
}
