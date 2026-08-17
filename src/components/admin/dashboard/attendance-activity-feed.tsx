'use client'

import Link from 'next/link'
import { Radio, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  PRESENT: { label: 'Présent', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  ABSENT: { label: 'Absent', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700' },
  LATE: { label: 'Retard', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  EXITED: { label: 'Sorti', dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
}

const METHOD_LABELS: Record<string, string> = {
  QR_CODE: 'QR',
  MANUAL: 'Manuel',
  MANUAL_ADMIN: 'Admin',
  NFC: 'NFC',
  FACIAL: 'Facial',
  BIOMETRIC: 'Bio',
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

export function AttendanceActivityFeed() {
  const { status, recentActivity } = useAdminRealtimeStatus()

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/85 backdrop-blur-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              status === 'live' ? 'bg-violet-500 animate-pulse' : 'bg-zinc-400',
            )}
          />
          <span className="text-sm font-semibold text-slate-800">Pointages en direct</span>
        </div>
        <span className="text-[10px] text-slate-400">
          {status === 'live' ? 'Temps réel' : 'Hors ligne'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-52">
        {recentActivity.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Radio size={20} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Aucun pointage reçu pour l&apos;instant</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Les arrivées s&apos;afficheront ici dès qu&apos;un scan est enregistré.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recentActivity.map((item) => {
              const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.ABSENT
              const method = METHOD_LABELS[item.method] ?? item.method
              return (
                <li key={item.id} className="flex items-center justify-between px-5 py-2 hover:bg-slate-50/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.studentName}</p>
                      <p className="text-[10px] text-slate-400">{method}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.badge)}>
                      {cfg.label}
                    </span>
                    {(item.direction === 'ARRIVAL' || item.direction === 'EXIT') && (
                      <span
                        className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          item.direction === 'ARRIVAL'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-violet-50 text-violet-700',
                        )}
                      >
                        {item.direction === 'ARRIVAL' ? 'Arrivée' : 'Sortie'}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 tabular-nums">{fmtTime(item.scannedAt)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Link
        href="/admin/presences"
        className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-indigo-600 border-t border-slate-100 hover:bg-slate-50"
      >
        Voir présences <ArrowRight size={12} />
      </Link>
    </div>
  )
}
