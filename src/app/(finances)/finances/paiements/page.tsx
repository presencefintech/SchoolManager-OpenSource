'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Search,
  Banknote,
  ClipboardCheck,
  Users,
  BarChart3,
  Sparkles,
  Wallet,
  ShieldCheck,
} from 'lucide-react'
import {
  useDailyCashReport,
  useGuichetDashboard,
  usePendingPayments,
  useResolvedCashSession,
  useStudentWallet,
} from '@/lib/hooks/use-finance'
import { FinanceStudentSearchField } from '@/components/finance/student-search-field'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'
import { GuichetSiblingsStrip } from '@/components/finance/guichet-siblings-strip'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { fadeUp } from '@/lib/animations'
import { formatMoney } from '@/lib/finance/currency'
import { labelMoratorium, labelMoratoriumType } from '@/lib/business-labels'
import { cn } from '@/lib/utils'
import type { CashSession } from '@/types/finance'

function sessionOpening(session: CashSession | null | undefined): number | null {
  if (!session) return null
  const v = session.openingFloat ?? session.openingBalance
  return v != null ? Number(v) : null
}

function sessionCollected(session: CashSession | null | undefined): number | null {
  if (!session) return null
  const v = session.cashCollected ?? session.totalCollected
  return v != null ? Number(v) : null
}

function sessionExpected(session: CashSession | null | undefined): number | null {
  if (!session) return null
  if (session.expectedCash != null) return Number(session.expectedCash)
  const opening = sessionOpening(session)
  const collected = sessionCollected(session)
  if (opening == null || collected == null) return null
  return opening + collected
}

function CashSessionBanner() {
  const {
    session,
    hasOpenSession,
    isLoading,
    couldNotVerify,
  } = useResolvedCashSession()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
        Vérification de la session de caisse…
      </div>
    )
  }

  if (hasOpenSession && session) {
    const opening = sessionOpening(session)
    const collected = sessionCollected(session)
    const expected = sessionExpected(session)
    const txn = session.transactionCount ?? 0

    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2">
            <Banknote size={16} className="mt-0.5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Guichet actif · session #{session.id}
              </p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Espèces autorisées · caisse ouverte
              </p>
            </div>
          </div>
          <Link
            href="/finances/caisse"
            className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
          >
            Gérer la caisse
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <HudStat label="Fond" value={opening != null ? formatMoney(opening) : '—'} />
          <HudStat
            label="Encaissé"
            value={collected != null ? formatMoney(collected) : '—'}
            accent
          />
          <HudStat label="Attendu" value={expected != null ? formatMoney(expected) : '—'} />
          <HudStat label="Transactions" value={String(txn)} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        couldNotVerify
          ? 'border-amber-200 bg-amber-50'
          : 'border-amber-300 bg-amber-50',
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-950">
            {couldNotVerify
              ? 'Session caisse non vérifiable'
              : 'Aucune session de caisse ouverte'}
          </p>
          <p className="text-xs text-amber-800/90 mt-0.5">
            Ouvrez la caisse avant tout encaissement en espèces.
          </p>
        </div>
      </div>
      <Link
        href="/finances/caisse"
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        <Banknote size={13} />
        Ouvrir la caisse
      </Link>
    </div>
  )
}

function HudStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums',
          accent ? 'text-emerald-700' : 'text-zinc-900',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function StudentWalletStrip({ studentId }: { studentId: number }) {
  const { data: wallet, isLoading } = useStudentWallet(studentId)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-400 animate-pulse">
        Chargement du wallet…
      </div>
    )
  }

  if (!wallet) return null

  const balance = Number(wallet.balance) || 0
  const due = Number(wallet.totalDue ?? wallet.totalFees) || 0
  const paid = Number(wallet.totalPaid ?? wallet.feesPaid) || 0
  const mora = wallet.moratorium?.active ? wallet.moratorium : null

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-50 p-2">
            <Wallet size={14} className="text-violet-600" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Solde</p>
            <p
              className={cn(
                'text-sm font-semibold tabular-nums',
                balance > 0 ? 'text-red-600' : 'text-emerald-700',
              )}
            >
              {formatMoney(balance)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Dû</p>
          <p className="text-sm font-semibold tabular-nums text-zinc-800">{formatMoney(due)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Payé</p>
          <p className="text-sm font-semibold tabular-nums text-emerald-700">{formatMoney(paid)}</p>
        </div>
      </div>
      {mora ? (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          <ShieldCheck size={14} className="shrink-0 text-indigo-600" />
          <span>
            {labelMoratorium(true)}
            {mora.type ? ` · ${labelMoratoriumType(mora.type)}` : ''}
            {mora.endDate
              ? ` · jusqu’au ${new Date(mora.endDate).toLocaleDateString('fr-CD')}`
              : ''}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function MethodMixToday({
  byMethod,
}: {
  byMethod?: { method: string; amount: number; count: number }[]
}) {
  const rows = Array.isArray(byMethod) ? byMethod : []
  const cash = rows
    .filter((r) => String(r.method).toUpperCase() === 'CASH')
    .reduce((s, r) => s + Number(r.amount || 0), 0)
  const cashCount = rows
    .filter((r) => String(r.method).toUpperCase() === 'CASH')
    .reduce((s, r) => s + Number(r.count || 0), 0)
  const mmMethods = new Set(['ORANGE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'MOBILE_MONEY'])
  const mm = rows
    .filter((r) => mmMethods.has(String(r.method).toUpperCase()))
    .reduce((s, r) => s + Number(r.amount || 0), 0)
  const mmCount = rows
    .filter((r) => mmMethods.has(String(r.method).toUpperCase()))
    .reduce((s, r) => s + Number(r.count || 0), 0)
  const other = rows
    .filter((r) => {
      const m = String(r.method).toUpperCase()
      return m !== 'CASH' && !mmMethods.has(m)
    })
    .reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Mix du jour · Congo
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-emerald-800">Espèces</p>
          <p className="text-sm font-bold tabular-nums text-emerald-900 mt-0.5">
            {formatMoney(cash)}
          </p>
          <p className="text-[10px] text-emerald-700/70">{cashCount} txn</p>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-100 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-sky-800">Mobile Money</p>
          <p className="text-sm font-bold tabular-nums text-sky-900 mt-0.5">
            {formatMoney(mm)}
          </p>
          <p className="text-[10px] text-sky-700/70">{mmCount} txn</p>
        </div>
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-zinc-600">Banque / autre</p>
          <p className="text-sm font-bold tabular-nums text-zinc-900 mt-0.5">
            {formatMoney(other)}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-zinc-400">
        Au Congo, les espèces restent la colonne vertébrale — priorisez le billetage FC/USD.
      </p>
    </div>
  )
}

function PendingVerificationsCard() {
  const { data, isLoading } = usePendingPayments()
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] } | undefined)?.data)
      ? ((data as { data: unknown[] }).data)
      : []
  const count = items.length

  return (
    <Link
      href="/finances/verifications"
      className={cn(
        'block rounded-2xl border p-4 shadow-sm transition-colors',
        count > 0
          ? 'border-amber-200 bg-amber-50/80 hover:bg-amber-50'
          : 'border-zinc-200/70 bg-white hover:bg-zinc-50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            size={15}
            className={count > 0 ? 'text-amber-600' : 'text-zinc-400'}
          />
          <p className="text-sm font-semibold text-zinc-900">File de vérification</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
            count > 0 ? 'bg-amber-200 text-amber-900' : 'bg-zinc-100 text-zinc-500',
          )}
        >
          {isLoading ? '…' : count}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500">
        {count > 0
          ? `${count} paiement${count > 1 ? 's' : ''} en attente de validation`
          : 'Aucune vérification en attente'}
      </p>
    </Link>
  )
}

export default function PaiementsPage() {
  const [studentId, setStudentId] = useState(0)
  const { data: dailyCash = [], refetch: refetchCash, isFetching } = useDailyCashReport()
  const { data: guichet } = useGuichetDashboard()
  const academicSessionId = (guichet as { currentAcademicSessionId?: number | null } | undefined)
    ?.currentAcademicSessionId ?? undefined
  const collectionsToday = (
    guichet as {
      collectionsToday?: {
        total?: number
        count?: number
        byMethod?: { method: string; amount: number; count: number }[]
      }
    } | undefined
  )?.collectionsToday

  const cash: { method?: string; _count?: { id?: number }; _sum?: { amount?: number } }[] =
    Array.isArray(dailyCash) ? dailyCash : []
  const totalCash = cash.reduce((acc, r) => acc + (Number(r._sum?.amount) || 0), 0)

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Paiements"
        subtitle="Colonne vertébrale RDC — espèces FC/USD, tuteur, ticket & WhatsApp"
        actions={
          <>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
              <Sparkles size={10} />
              Guichet Congo
            </span>
            <Link
              href="/finances/caisse"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              <Banknote size={13} />
              Caisse
            </Link>
            <Link
              href="/finances/intelligence"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100"
            >
              <ShieldCheck size={13} />
              Intelligence
            </Link>
            <Link
              href="/finances/suivi-financier"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <BarChart3 size={13} />
              Suivi
            </Link>
          </>
        }
      />

      <div className="mb-5">
        <CashSessionBanner />
      </div>

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
              label="Matricule, nom, prénom ou postnom"
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
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
              <StudentWalletStrip studentId={studentId} />
              <GuichetSiblingsStrip
                studentId={studentId}
                onSelect={(id) => setStudentId(id)}
              />
              <StudentFinanceDashboard
                studentId={studentId}
                sessionId={academicSessionId ?? undefined}
              />
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-6 py-16 text-center space-y-3">
              <DollarSign size={32} className="mx-auto text-zinc-300" />
              <p className="text-sm font-medium text-zinc-600">Sélectionnez un élève pour encaisser</p>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Guichet RDC : billetage FC/USD, payeur (parent/tuteur), confirmation, ticket
                thermique et WhatsApp avec équivalent francs congolais.
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 inline-block rounded-lg px-3 py-1.5">
                Les barèmes se configurent dans Admin → Finance → Factures &amp; Frais
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <MethodMixToday byMethod={collectionsToday?.byMethod} />
          <PendingVerificationsCard />

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
              <Link
                href="/finances/intelligence"
                className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5 text-xs font-medium text-zinc-700 hover:bg-white"
              >
                <Sparkles size={14} className="text-violet-600" />
                Intelligence financière
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </FinancePageShell>
  )
}
