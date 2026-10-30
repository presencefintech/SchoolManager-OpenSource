'use client'

import { useQuery } from '@tanstack/react-query'
import { asList, parentApi, formatMoney } from '@/lib/parent/api'
import { useSelectedStudent } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, NoStudent, PageHeader, Pill, StudentSwitcher, statusTone } from '@/components/parent/ui'
import { paymentStatusLabel } from '@/lib/i18n/display-labels'

interface Invoice {
  id?: number | string
  number?: string
  reference?: string
  label?: string
  amount?: number
  total?: number
  status?: string
  dueDate?: string
  issuedAt?: string
}

export default function InvoicesPage() {
  const { studentId } = useSelectedStudent()
  const invoices = useQuery({
    queryKey: ['parent', 'invoices', studentId],
    queryFn: async () => asList<Invoice>(await parentApi.invoices(studentId as number)),
    enabled: studentId != null,
  })

  if (studentId == null) return <NoStudent />

  return (
    <>
      <PageHeader title="Factures" />
      <StudentSwitcher />
      {invoices.isLoading ? (
        <ListSkeleton />
      ) : invoices.isError ? (
        <ErrorState onRetry={() => void invoices.refetch()} />
      ) : (invoices.data ?? []).length === 0 ? (
        <EmptyState title="Aucune facture" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {invoices.data!.map((inv, i) => (
            <li key={inv.id ?? i} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{inv.number ?? inv.reference ?? inv.label ?? `Facture ${i + 1}`}</p>
                <p className="text-xs text-zinc-500">
                  {(inv.dueDate ?? inv.issuedAt) && new Date((inv.dueDate ?? inv.issuedAt) as string).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatMoney(inv.total ?? inv.amount)}</p>
                {inv.status && <Pill tone={statusTone(inv.status)}>{paymentStatusLabel(inv.status)}</Pill>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
