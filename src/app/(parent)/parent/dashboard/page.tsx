'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2, ChevronRight, QrCode, ShieldAlert, Wallet } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useParentDashboard, useSelectedStudent } from '@/lib/parent/hooks'
import { formatMoney, studentDisplayName } from '@/lib/parent/api'
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  NoStudent,
  PageHeader,
  Pill,
} from '@/components/parent/ui'

export default function ParentDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useParentDashboard()
  const { students, isLoading: studentsLoading } = useSelectedStudent()

  if (isLoading || studentsLoading) return <ListSkeleton />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  const summary = data?.summary
  const cards = data?.students ?? []
  const insights = data?.insights ?? []
  const debt = summary?.financials?.totalDebt ?? 0

  if (!students.length && !cards.length) {
    return (
      <>
        <PageHeader title={`Bonjour ${user?.firstName ?? ''}`.trim()} />
        <NoStudent />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Bonjour ${user?.firstName ?? ''}`.trim()}
        subtitle={`${summary?.totalChildren ?? cards.length} enfant(s) suivi(s)`}
      />

      {data?.security?.status === 'ISSUE_DETECTED' && (
        <Link
          href="/parent/profile/security"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
        >
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span className="flex-1">Un problème de sécurité a été détecté sur votre compte.</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <p className="text-xs text-zinc-500">Solde à payer</p>
          <p className={`mt-1 text-lg font-bold ${debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatMoney(debt)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Déjà payé</p>
          <p className="mt-1 text-lg font-bold">{formatMoney(summary?.financials?.totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Assiduité</p>
          <p className="mt-1 text-lg font-bold">
            {summary?.attendance?.averageRate != null ? `${Math.round(summary.attendance.averageRate)} %` : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-zinc-500">Non lues</p>
          <p className="mt-1 text-lg font-bold">{summary?.unreadCount ?? 0}</p>
        </Card>
      </div>

      {insights.length > 0 && (
        <Card className="space-y-2">
          {insights.map((i, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>{i.message}</span>
            </div>
          ))}
        </Card>
      )}

      <section aria-label="Enfants" className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Mes enfants</h2>
        {cards.length === 0 && <EmptyState title="Aucune donnée pour le moment" />}
        {cards.map((s) => {
          const name = studentDisplayName(s)
          return (
            <Card key={s.id} className="flex items-center gap-3">
              <Avatar name={name} src={s.photo} size={48} />
              <div className="min-w-0 flex-1">
                <Link href={`/parent/students/${s.id}`} className="block truncate font-semibold">
                  {name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {s.isUpToDate ? (
                    <Pill tone="green">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> À jour
                    </Pill>
                  ) : (
                    <Pill tone="amber">Solde {formatMoney(s.balance ?? s.debt)}</Pill>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Link
                  href={`/parent/students/${s.id}/pass`}
                  aria-label={`Pass numérique de ${name}`}
                  className="rounded-full p-2 text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <QrCode className="h-5 w-5" />
                </Link>
                <Link
                  href={`/parent/finance?student=${s.id}`}
                  aria-label={`Finance de ${name}`}
                  className="rounded-full p-2 text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <Wallet className="h-5 w-5" />
                </Link>
              </div>
            </Card>
          )
        })}
      </section>
    </div>
  )
}
