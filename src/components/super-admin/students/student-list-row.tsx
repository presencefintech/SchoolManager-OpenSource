'use client'

import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statusBadgeClass } from '@/components/super-admin/students/student-utils'
import type { StudentListItem } from '@/types/super-admin'

export interface StudentListRowProps {
  student: StudentListItem
  selected: boolean
  onSelect: (id: number) => void
  onHover?: (id: number) => void
}

export const StudentListRow = memo(function StudentListRow({
  student,
  selected,
  onSelect,
  onHover,
}: StudentListRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(student.id)}
      onMouseEnter={() => onHover?.(student.id)}
      className={cn(
        'w-full text-left px-5 py-3.5 flex items-center gap-4 transition-colors cursor-pointer group',
        selected
          ? 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-200'
          : 'hover:bg-zinc-50',
      )}
    >
      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-indigo-700">
          {student.firstName[0]}
          {student.lastName[0]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">
          {student.firstName} {student.lastName}
        </p>
        <p className="text-xs text-zinc-400 truncate">
          {student.class?.name ?? '—'} · {student.matricule ?? 'Pas de matricule'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('px-2 py-0.5 text-xs rounded-full ring-1', statusBadgeClass(student.status))}>
          {student.status}
        </span>
        {student.isPaymentLocked && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
            Verrouillé
          </span>
        )}
        <ChevronRight size={14} className="text-zinc-300 group-hover:text-indigo-400 transition-colors" />
      </div>
    </button>
  )
})
