'use client'

import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'
import { useGuichetDashboard } from '@/lib/hooks/use-finance'

interface StudentFinanceDrawerProps {
  studentId: number
  studentName?: string
  open: boolean
  onClose: () => void
}

export function StudentFinanceDrawer({
  studentId,
  studentName,
  open,
  onClose,
}: StudentFinanceDrawerProps) {
  const { data: guichet } = useGuichetDashboard()
  const academicSessionId = (guichet as { currentAcademicSessionId?: number | null } | undefined)
    ?.currentAcademicSessionId ?? undefined

  if (!open || studentId <= 0) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-3xl flex-col bg-[#f5f7fb] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Fiche financière
            </p>
            <h2 className="truncate text-base font-bold text-zinc-900">
              {studentName ?? `Élève #${studentId}`}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/finances/eleves/${studentId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <ExternalLink size={12} />
              Plein écran
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <StudentFinanceDashboard
            studentId={studentId}
            sessionId={academicSessionId ?? undefined}
            layout="stacked"
          />
        </div>
      </aside>
    </div>
  )
}
