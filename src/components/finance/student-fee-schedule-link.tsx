'use client'

import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudentFeeScheduleLinkProps {
  studentId: number
  className?: string
  variant?: 'button' | 'inline'
  onClick?: (event: React.MouseEvent) => void
}

export function StudentFeeScheduleLink({
  studentId,
  className,
  variant = 'button',
  onClick,
}: StudentFeeScheduleLinkProps) {
  if (!Number.isFinite(studentId) || studentId <= 0) return null

  const href = `/finances/eleves/${studentId}`

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn('text-xs font-medium text-emerald-700 hover:underline', className)}
      >
        Voir l&apos;échéancier complet
      </Link>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1.5',
        'text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors',
        className,
      )}
    >
      <CalendarDays size={13} />
      Échéancier
    </Link>
  )
}
