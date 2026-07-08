'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'

export default function StudentFinancePage() {
  const params = useParams()
  const rawId = params?.studentId
  const studentId = Number(Array.isArray(rawId) ? rawId[0] : rawId)

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return (
      <FinancePageShell>
        <FinancePageHeader
          title="Fiche élève"
          subtitle="Identifiant invalide"
          accent="slate"
        />
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-6 py-8 text-center">
          <p className="text-sm font-medium text-amber-900">Identifiant élève invalide</p>
          <p className="mt-1 text-xs text-amber-700">
            Utilisez une URL du type /finances/eleves/123
          </p>
          <Link
            href="/finances/paiements"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <ArrowLeft size={12} />
            Retour aux paiements
          </Link>
        </div>
      </FinancePageShell>
    )
  }

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Fiche financière élève"
        subtitle="Échéancier, encaissement ligne par ligne et historique des paiements"
        badge={
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
            #{studentId}
          </span>
        }
        actions={
          <Link
            href="/finances/paiements"
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <ArrowLeft size={12} />
            Paiements
          </Link>
        }
      />
      <StudentFinanceDashboard studentId={studentId} />
    </FinancePageShell>
  )
}
