'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Activity, CalendarDays, Clock, Users, Monitor, CalendarOff, BarChart3, Bell, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SchedulesPanel } from './SchedulesPanel'
import { StaffPanel } from './StaffPanel'
import { TerminalsPanel } from './TerminalsPanel'
import { DayBoardPanel } from './DayBoardPanel'
import { MonthCalendarPanel } from './MonthCalendarPanel'
import { LeavesMissionsPanel } from './LeavesMissionsPanel'
import { ReportPanel } from './ReportPanel'
import { AlertSettingsPanel } from './AlertSettingsPanel'

const TABS = [
  { key: 'day', label: 'Jour', icon: Activity },
  { key: 'calendar', label: 'Calendrier', icon: CalendarDays },
  { key: 'report', label: 'Rapport', icon: BarChart3 },
  { key: 'staff', label: 'Personnel', icon: Users },
  { key: 'schedules', label: 'Horaires', icon: Clock },
  { key: 'leaves', label: 'Congés & missions', icon: CalendarOff },
  { key: 'terminals', label: 'Terminaux', icon: Monitor },
  { key: 'alerts', label: 'Alerte matinale', icon: Bell },
] as const

type Tab = (typeof TABS)[number]['key']

function parseTab(raw: string | null): Tab {
  return TABS.some((t) => t.key === raw) ? (raw as Tab) : 'day'
}

function StaffAttendanceModuleContent({ basePath }: { basePath: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qc = useQueryClient()
  const tab = parseTab(searchParams.get('tab'))
  const [staffId, setStaffId] = useState<number | null>(
    searchParams.get('staffId') ? Number(searchParams.get('staffId')) : null,
  )

  function goToTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.push(`${basePath}?${params.toString()}`, { scroll: false })
  }

  function openEmployeeCalendar(id: number) {
    setStaffId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'calendar')
    params.set('staffId', String(id))
    router.push(`${basePath}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-8 py-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Pointage du personnel</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Présence pointée sur les terminaux biométriques</p>
          </div>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ['staff-attendance'] })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 pb-3 overflow-x-auto">
          <div className="inline-flex gap-1 p-1 bg-zinc-100 rounded-xl">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => goToTab(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  tab === key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6">
        {tab === 'day' && <DayBoardPanel onOpenCalendar={openEmployeeCalendar} />}
        {tab === 'calendar' && <MonthCalendarPanel staffId={staffId} onStaffIdChange={openEmployeeCalendar} />}
        {tab === 'report' && <ReportPanel onOpenCalendar={openEmployeeCalendar} />}
        {tab === 'staff' && <StaffPanel onOpenCalendar={openEmployeeCalendar} />}
        {tab === 'schedules' && <SchedulesPanel />}
        {tab === 'leaves' && <LeavesMissionsPanel />}
        {tab === 'terminals' && <TerminalsPanel />}
        {tab === 'alerts' && <AlertSettingsPanel />}
      </div>
    </div>
  )
}

export function StaffAttendanceModule({ basePath }: { basePath: string }) {
  return (
    <Suspense fallback={null}>
      <StaffAttendanceModuleContent basePath={basePath} />
    </Suspense>
  )
}
