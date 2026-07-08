'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  DollarSign, RefreshCw, Search, Banknote, ClipboardCheck, Users, BarChart3,
} from 'lucide-react'
import { useDailyCashReport } from '@/lib/hooks/use-finance'
import { FinanceStudentSearchField } from '@/components/finance/student-search-field'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { fadeUp } from '@/lib/animations'
import { formatMoney } from '@/lib/finance/currency'

export default function PaiementsPage() {
  const [studentId, setStudentId] = useState(0)
  const { data: dailyCash = [], refetch: refetchCash, isFetching } = useDailyCashReport()

  const cash: { method?: string; _count?: { id?: number }; _sum?: { amount?: number } }[] =
    Array.isArray(dailyCash) ? dailyCash : []
  const totalCash = cash.reduce((acc, r) => acc + (Number(r._sum?.amount) || 0), 0)

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Paiements"
        subtitle="Recherchez un élève, consultez son échéancier et encaissez ligne par ligne — guichet RDC"
        actions={
          <>
            <Link
              href="/finances/caisse"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              <Banknote size={13} />
              Caisse
            </Link>
            <Link
              href="/finances/suivi-financier"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <BarChart3 size={13} />
              Suivi financier
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex items-center gap-2">
              <Search size={15} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Rechercher un élève</h2>
            </div>
            <FinanceStudentSearchField
              studentId={studentId}
              onSelect={(id) => setStudentId(id)}
              label="Nom, prénom ou matricule"
            />
            {studentId > 0 && (
              <p className="mt-2 text-xs text-zinc-400">
                Fiche complète :{' '}
                <Link
                  href={`/finances/eleves/${studentId}`}
                  className="font-medium text-emerald-600 hover:text-emerald-700"
                >
                  /finances/eleves/{studentId}
                </Link>
              </p>
            )}
          </div>

          {studentId > 0 ? (
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <StudentFinanceDashboard studentId={studentId} />
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-6 py-16 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">Sélectionnez un élève pour encaisser</p>
              <p className="mt-1 text-xs text-zinc-400">
                L&apos;échéancier, l&apos;historique et le modal de paiement s&apos;affichent ici
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Encaissements du jour</h2>
              <button
                type="button"
                onClick={() => refetchCash()}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
                title="Actualiser"
              >
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>
            {cash.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-400">Aucun encaissement aujourd&apos;hui</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-50">
                  {cash.map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{row.method ?? '—'}</p>
                        <p className="text-xs text-zinc-400">{row._count?.id ?? 0} transaction(s)</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                        {row._sum?.amount != null ? formatMoney(Number(row._sum.amount)) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 flex justify-between">
                  <span className="text-sm font-semibold text-zinc-700">Total</span>
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">
                    {formatMoney(totalCash)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80 mb-3">
              Raccourcis
            </p>
            <div className="space-y-2">
              <Link
                href="/finances/verifications"
                className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-white"
              >
                <ClipboardCheck size={14} className="text-amber-600" />
                Vérifications en attente
              </Link>
              <Link
                href="/finances/debiteurs"
                className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-white"
              >
                <Users size={14} className="text-red-500" />
                Débiteurs
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </FinancePageShell>
  )
}
