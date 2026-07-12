'use client'

import Link from 'next/link'
import { ClipboardList, Bell, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePendingAttendanceSheets,
  useAttendanceNotificationDeliveries,
} from '@/lib/hooks/use-admin'
import { SHEET_STATUS_LABEL } from '@/lib/presence/attendance-sheet.utils'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-slate-100 animate-pulse', className)} />
}

export function DashboardActionWidgets() {
  const sessionDate = todayIsoDate()
  const { data: sheets, isLoading: sheetsLoading } = usePendingAttendanceSheets({ sessionDate })
  const { data: failedNotifs, isLoading: notifsLoading } = useAttendanceNotificationDeliveries({
    status: 'FAILED',
    limit: 5,
  })

  const pendingSheets = (sheets ?? []).filter((s) => s.status !== 'SEALED')
  const draftCount = pendingSheets.filter((s) => s.status === 'DRAFT').length
  const submittedCount = pendingSheets.filter((s) => s.status === 'SUBMITTED').length
  const failedList = failedNotifs?.deliveries ?? []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">Cahiers du jour</h3>
          </div>
          <Link
            href="/admin/presences?tab=sheets"
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5"
          >
            Ouvrir <ArrowRight size={11} />
          </Link>
        </div>

        {sheetsLoading ? (
          <Sk className="h-16" />
        ) : pendingSheets.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun cahier en attente pour aujourd&apos;hui.</p>
        ) : (
          <>
            <div className="flex gap-3 mb-3">
              {draftCount > 0 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                  {draftCount} brouillon{draftCount > 1 ? 's' : ''}
                </span>
              )}
              {submittedCount > 0 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {submittedCount} à sceller
                </span>
              )}
            </div>
            <ul className="space-y-1.5 max-h-24 overflow-y-auto">
              {pendingSheets.slice(0, 4).map((row) => (
                <li key={row.sheetId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate">{row.className}</span>
                  <span className="text-slate-400 flex-shrink-0 ml-2">{SHEET_STATUS_LABEL[row.status]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className={failedList.length > 0 ? 'text-red-500' : 'text-slate-400'} />
            <h3 className="text-sm font-semibold text-slate-800">Notifs échouées</h3>
          </div>
          <Link
            href="/admin/attendance-notifications?status=FAILED"
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5"
          >
            Tout voir <ArrowRight size={11} />
          </Link>
        </div>

        {notifsLoading ? (
          <Sk className="h-16" />
        ) : failedList.length === 0 ? (
          <p className="text-xs text-slate-400">Aucune livraison en échec récente.</p>
        ) : (
          <ul className="space-y-2">
            {failedList.map((row) => (
              <li key={row.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{row.title}</p>
                  <p className="text-slate-400 truncate">Élève #{row.studentId} · {row.channel ?? '—'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
