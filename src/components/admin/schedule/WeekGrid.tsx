'use client'

import { CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassPeriodItem } from '@/types/admin'
import { DAY_LABELS, WEEKDAYS, subjectColor } from './schedule.utils'

const GRID_START = 7 * 60
const GRID_END = 18 * 60
const HOUR_PX = 56

function slotStyle(p: ClassPeriodItem) {
  const top = ((Math.max(p.startMinute, GRID_START) - GRID_START) / 60) * HOUR_PX
  const height = Math.max(
    28,
    ((Math.min(p.endMinute, GRID_END) - Math.max(p.startMinute, GRID_START)) / 60) * HOUR_PX,
  )
  return { top, height }
}

export function WeekGrid({
  periods,
  overlapIds,
  onEdit,
  onDeactivate,
  readOnly = false,
}: {
  periods: ClassPeriodItem[]
  overlapIds: Set<number>
  onEdit: (p: ClassPeriodItem) => void
  onDeactivate: (p: ClassPeriodItem) => void
  readOnly?: boolean
}) {
  const hours = Array.from(
    { length: Math.ceil((GRID_END - GRID_START) / 60) + 1 },
    (_, i) => GRID_START / 60 + i,
  )

  const byDay = WEEKDAYS.map((day) => ({
    day,
    slots: periods
      .filter((p) => p.dayOfWeek === day)
      .sort((a, b) => a.startMinute - b.startMinute),
  }))

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50/70">
        <CalendarClock size={15} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-zinc-800">Grille hebdomadaire</h3>
        <span className="text-[11px] text-zinc-400 ml-auto">Lun – Ven · 07:00–18:00</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px] grid grid-cols-[56px_repeat(5,minmax(0,1fr))]">
          <div className="border-b border-zinc-100 bg-zinc-50/50" />
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center text-xs font-semibold text-zinc-600 border-b border-l border-zinc-100 bg-zinc-50/50"
            >
              {DAY_LABELS[d]}
            </div>
          ))}

          <div className="relative border-r border-zinc-100" style={{ height: (hours.length - 1) * HOUR_PX }}>
            {hours.map((h, i) =>
              i === hours.length - 1 ? null : (
                <div
                  key={h}
                  className="absolute left-0 right-0 text-[10px] text-zinc-400 tabular-nums pr-1.5 text-right"
                  style={{ top: i * HOUR_PX - 6 }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ),
            )}
          </div>

          {byDay.map(({ day, slots }) => (
            <div
              key={day}
              className="relative border-l border-zinc-100 bg-[linear-gradient(to_bottom,transparent_calc(100%-1px),rgba(228,228,231,0.7)_calc(100%-1px))] bg-[length:100%_56px]"
              style={{ height: (hours.length - 1) * HOUR_PX }}
            >
              {slots.map((p) => {
                const { top, height } = slotStyle(p)
                const color = subjectColor(p.subject || p.className || String(p.id))
                const conflict = overlapIds.has(p.id)
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'absolute left-1 right-1 rounded-lg border px-1.5 py-1 overflow-hidden group shadow-sm transition-shadow',
                      !readOnly && 'cursor-pointer hover:shadow-md',
                      color.bg,
                      color.border,
                      conflict && 'ring-2 ring-amber-400 border-amber-300',
                    )}
                    style={{ top, height }}
                    onClick={() => {
                      if (!readOnly) onEdit(p)
                    }}
                    title={`${p.start}–${p.end} · ${p.subject ?? p.className}`}
                  >
                    <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', color.bar)} />
                    <p className={cn('text-[11px] font-semibold truncate pl-1.5', color.text)}>
                      {p.subject || p.className || 'Cours'}
                    </p>
                    {height > 36 && (
                      <p className="text-[10px] text-zinc-500 truncate pl-1.5">
                        {p.start}–{p.end}
                        {p.className ? ` · ${p.className}` : ''}
                      </p>
                    )}
                    {height > 52 && p.room && (
                      <p className="text-[10px] text-zinc-400 truncate pl-1.5">{p.room}</p>
                    )}
                    {!readOnly && (
                    <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                      <button
                        type="button"
                        className="p-0.5 rounded bg-white/90 text-zinc-600 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(p)
                        }}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        className="p-0.5 rounded bg-white/90 text-rose-500 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeactivate(p)
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
