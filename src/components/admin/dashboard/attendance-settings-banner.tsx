'use client'

import Link from 'next/link'
import { Settings2, MapPin, Bell, Clock, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAttendanceSettings } from '@/lib/hooks/use-admin'

const METHOD_LABELS: Record<string, string> = {
  manual: 'Manuel',
  qrCode: 'QR',
  rfid: 'RFID',
  facialRecognition: 'Facial',
  fingerprint: 'Bio',
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
        ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200',
      )}
    >
      {label}
    </span>
  )
}

export function AttendanceSettingsBanner() {
  const { data: settings, isLoading, isError } = useAttendanceSettings()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/70 h-14 animate-pulse" />
    )
  }

  if (isError || !settings) return null

  const enabledMethods = Object.entries(settings.methods)
    .filter(([, v]) => v)
    .map(([k]) => METHOD_LABELS[k] ?? k)

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <Settings2 size={15} className="text-slate-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-700">Réglages pointage</span>
        {enabledMethods.map((m) => (
          <Chip key={m} ok label={m} />
        ))}
        <Chip ok={settings.geofence.configured} label="Géofence" />
        <Chip ok={settings.validationRules.dualQrRequired} label="Dual-QR" />
        <Chip
          ok={settings.notificationSettings.parentPresenceNotificationsEnabled}
          label="Notifs parents"
        />
        <Chip ok={settings.absenceSettings.autoMarkEnabled} label="Absences auto" />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        {settings.absenceSettings.autoMarkEnabled && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            Cutoff {String(settings.absenceSettings.cutoffHour).padStart(2, '0')}:
            {String(settings.absenceSettings.cutoffMinute).padStart(2, '0')}
          </span>
        )}
        {!settings.geofence.configured && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <MapPin size={12} />
            Géofence à configurer
          </span>
        )}
        {!settings.methods.qrCode && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <QrCode size={12} />
            QR désactivé
          </span>
        )}
        {!settings.notificationSettings.parentPresenceNotificationsEnabled && (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Bell size={12} />
            Notifs off
          </span>
        )}
        <Link
          href="/admin/settings"
          className="font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
        >
          Modifier →
        </Link>
      </div>
    </div>
  )
}
