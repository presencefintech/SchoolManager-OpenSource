'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { DECLARATION_STATUS_LABEL, declarationsApi } from '@/lib/parent/declarations.api'
import { formatMoney } from '@/lib/parent/api'
import { useSelectedStudent } from '@/lib/parent/hooks'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  NoStudent,
  PageHeader,
  Pill,
  StudentSwitcher,
  statusTone,
} from '@/components/parent/ui'

export default function DeclarationsPage() {
  const { studentId } = useSelectedStudent()
  const q = useQuery({
    queryKey: ['parent', 'declarations', studentId],
    queryFn: () => declarationsApi.list(studentId as number),
    enabled: studentId != null,
  })

  if (studentId == null) return <NoStudent />

  return (
    <>
      <PageHeader
        title="Déclarations de paiement"
        subtitle="Déclarez un paiement Mobile Money effectué avec la capture du SMS."
        action={
          <Link
            href="/parent/finance/declarations/new"
            className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Déclarer
          </Link>
        }
      />
      <StudentSwitcher />
      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Aucune déclaration"
          hint="Quand vous payez par Mobile Money en dehors de l'application, déclarez-le ici pour que l'école valide votre paiement."
        />
      ) : (
        <ul className="space-y-2">
          {q.data!.items.map((d) => (
            <li key={d.id}>
              <Link href={`/parent/finance/declarations/${d.id}`}>
                <Card className="flex items-center justify-between gap-3 transition hover:border-teal-400">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{formatMoney(d.amount, d.currency)}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {d.providerLabel} · réf. {d.transactionRef} ·{' '}
                      {d.paidAt ? new Date(d.paidAt).toLocaleDateString('fr-FR') : ''}
                    </p>
                  </div>
                  <Pill tone={statusTone(d.status)}>{DECLARATION_STATUS_LABEL[d.status]}</Pill>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
