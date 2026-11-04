'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, FileText, Hourglass, Receipt, FileCheck2 } from 'lucide-react'
import { parentApi, formatMoney } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
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

const TX_LABEL: Record<string, string> = { PAID: 'Payé', PENDING: 'En attente', REJECTED: 'Rejeté' }

export default function ParentFinancePage() {
  const { studentId, isLoading: studentsLoading } = useSelectedStudent()
  const finances = useQuery({
    queryKey: parentKeys.finances(studentId ?? 0),
    queryFn: () => parentApi.finances(studentId as number),
    enabled: studentId != null,
  })

  if (studentsLoading) return <ListSkeleton />
  if (studentId == null) return <NoStudent />

  const data = finances.data
  const currency = data?.currency ?? 'USD'
  const summary = data?.summary
  const progress = Math.min(100, Math.max(0, summary?.progress ?? 0))
  const tx = data?.transactions ?? []
  const moratorium = data?.moratorium

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle={data?.studentName}
        action={
          <Link
            href="/parent/finance/pay"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
          >
            Payer
          </Link>
        }
      />
      <StudentSwitcher />

      {finances.isLoading ? (
        <ListSkeleton />
      ) : finances.isError ? (
        <ErrorState onRetry={() => void finances.refetch()} />
      ) : (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Facturé" value={formatMoney(summary?.totalInvoiced, currency)} />
              <Stat label="Payé" value={formatMoney(summary?.totalPaid, currency)} />
              <Stat
                label="Reste"
                value={formatMoney(summary?.balance, currency)}
                tone={(summary?.balance ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}
              />
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression des paiements"
            >
              <div className="h-full bg-teal-600" style={{ width: `${progress}%` }} />
            </div>
            {data?.isFullyPaid && <Pill tone="green">Scolarité entièrement réglée</Pill>}
          </Card>

          {moratorium && (moratorium.active || moratorium.pendingApproval) && (
            <Card className="flex items-start gap-3 text-sm">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">
                  {moratorium.pendingApproval ? 'Demande de moratoire en attente' : 'Moratoire actif'}
                </p>
                {moratorium.endDate && (
                  <p className="text-zinc-500">
                    Jusqu&apos;au {new Date(moratorium.endDate).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <ActionLink href="/parent/finance/pay" icon={Receipt} label="Payer les frais" />
            <ActionLink href="/parent/finance/schedule" icon={CalendarClock} label="Échéancier" />
            <ActionLink href="/parent/finance/moratorium" icon={Hourglass} label="Moratoire" />
            <ActionLink href="/parent/finance/invoices" icon={FileText} label="Factures" />
            <ActionLink href="/parent/finance/declarations" icon={FileCheck2} label="Déclarations" />
          </div>

          <section aria-label="Historique des paiements">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Historique</h2>
            {tx.length === 0 ? (
              <EmptyState title="Aucun paiement enregistré" />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {tx.map((t, i) => (
                  <li key={t.id ?? i}>
                    <Link
                      href={t.id ? `/parent/finance/receipt/${t.id}` : '#'}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.reference ?? `Paiement ${t.id}`}</p>
                        <p className="text-xs text-zinc-500">
                          {t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '—'}
                          {t.method ? ` · ${t.method}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatMoney(t.amount, currency)}</p>
                        <Pill tone={statusTone(t.status)}>{TX_LABEL[t.status ?? ''] ?? t.status}</Pill>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`break-words text-sm font-bold sm:text-base ${tone ?? ''}`}>{value}</p>
    </div>
  )
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface p-3 text-center text-sm font-medium transition hover:shadow-md"
    >
      <Icon className="h-5 w-5 text-teal-600" />
      {label}
    </Link>
  )
}
