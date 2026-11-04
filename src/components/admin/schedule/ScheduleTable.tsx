'use client'

import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassPeriodItem } from '@/types/admin'
import { DAY_LABELS } from './schedule.utils'

export function ScheduleTable({
  periods,
  overlapIds,
  onEdit,
  onDeactivate,
  busyId,
  readOnly = false,
}: {
  periods: ClassPeriodItem[]
  overlapIds: Set<number>
  onEdit: (p: ClassPeriodItem) => void
  onDeactivate: (p: ClassPeriodItem) => void
  busyId?: number | null
  readOnly?: boolean
}) {
  if (periods.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50/90 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 text-left">Jour</th>
              <th className="px-4 py-3 text-left">Horaire</th>
              <th className="px-4 py-3 text-left">Matière</th>
              <th className="px-4 py-3 text-left">Classe</th>
              <th className="px-4 py-3 text-left">Enseignant</th>
              <th className="px-4 py-3 text-left">Salle</th>
              {!readOnly && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {periods.map((p) => {
              const conflict = overlapIds.has(p.id)
              return (
                <tr
                  key={p.id}
                  className={cn(
                    'hover:bg-zinc-50/70 transition-colors',
                    conflict && 'bg-amber-50/40',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-800">
                        {DAY_LABELS[p.dayOfWeek] ?? p.dayOfWeek}
                      </span>
                      {conflict && (
                        <span
                          title="Chevauchement horaire"
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full"
                        >
                          <AlertTriangle size={10} />
                          Conflit
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-700 font-medium">
                    {p.start} – {p.end}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">{p.subject ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-zinc-800">{p.className ?? `#${p.classId}`}</span>
                    {p.level && (
                      <span className="ml-1.5 text-[11px] text-zinc-400">{p.level}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{p.teacherName ?? `#${p.teacherId}`}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.room ?? '—'}</td>
                  {!readOnly && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Modifier"
                        onClick={() => onEdit(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        <Pencil size={13} />
                        Éditer
                      </button>
                      <button
                        type="button"
                        title="Désactiver"
                        disabled={busyId === p.id}
                        onClick={() => onDeactivate(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 size={13} />
                        Retirer
                      </button>
                    </div>
                  </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
