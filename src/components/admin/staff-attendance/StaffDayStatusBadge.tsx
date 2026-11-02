'use client'

import { cn } from '@/lib/utils'
import type { StaffDayStatus } from '@/types/staff-attendance'
import { STAFF_DAY_STATUS_LABEL, STAFF_DAY_STATUS_STYLE } from '@/lib/admin/staff-attendance.utils'

export function StaffDayStatusBadge({ status, className }: { status: StaffDayStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STAFF_DAY_STATUS_STYLE[status],
        className,
      )}
    >
      {STAFF_DAY_STATUS_LABEL[status]}
    </span>
  )
}
