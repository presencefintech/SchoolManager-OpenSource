'use client'

import { useQuery } from '@tanstack/react-query'
import { parentApi, formatMoney } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, NoStudent, PageHeader, StudentSwitcher } from '@/components/parent/ui'

type Line = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

export default function FeeSchedulePage() {
  const { studentId } = useSelectedStudent()
  const schedule = useQuery({
    queryKey: parentKeys.feeSchedule(studentId ?? 0),
    queryFn: () => parentApi.feeSchedule(studentId as number),
    enabled: studentId != null,
  })

  if (studentId == null) return <NoStudent />
  const lines: Line[] = schedule.data?.lines ?? []
  const currency = schedule.data?.currency ?? 'USD'

  return (
    <>
      <PageHeader title="Échéancier" subtitle={schedule.data?.sessionLabel} />
      <StudentSwitcher />
      {schedule.isLoading ? (
        <ListSkeleton />
      ) : schedule.isError ? (
        <ErrorState onRetry={() => void schedule.refetch()} />
      ) : lines.length === 0 ? (
        <EmptyState title="Aucune échéance" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {lines.map((l, i) => {
            const label = str(l.label) || str(l.categoryName) || str(l.name) || `Échéance ${i + 1}`
            const month = str(l.monthYear) || str(l.dueDate) || str(l.period)
            const amount = Number(l.amount ?? l.remaining ?? l.due ?? 0)
            const status = str(l.status)
            return (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{label}</p>
                  {month && <p className="text-xs text-zinc-500">{month}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatMoney(amount, currency)}</p>
                  {status && <p className="text-xs text-zinc-500">{status}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
