'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Filter, DollarSign, TrendingDown, ChevronDown, Download, Bell, AlertTriangle, Wallet, Calendar, BarChart3, PanelRightOpen } from 'lucide-react'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import { StudentPaymentHistory } from '@/components/finance/student-dashboard/StudentPaymentHistory'
import { StudentFinanceDrawer } from '@/components/finance/student-finance-drawer'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { useDebtors, useStudentFinanceProfile, useExportDebtors, useHighRisk, useStudentWallet, useFinanceMoratoriums } from '@/lib/hooks/use-finance'
import { FinanceStudentSearchField } from '@/components/finance/student-search-field'
import { fadeUp, stagger } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import type { RiskEntry, StudentWallet } from '@/types/finance'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { formatRdcFullName, formatStudentFullName } from '@/lib/utils/student-name.util'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

export default function DebiteursPage() {
  const { format: formatMoney } = useSchoolMoney()
  const [minDebt, setMinDebt] = useState(10)
  const [minDebtInput, setMinDebtInput] = useState('10')
  const [searchedId, setSearchedId] = useState(0)
  const [drawerStudentId, setDrawerStudentId] = useState(0)
  const [drawerStudentName, setDrawerStudentName] = useState('')
  const [expandedDebtor, setExpandedDebtor] = useState<number | null>(null)

  function openFinanceDrawer(id: number, name?: string) {
    if (!Number.isFinite(id) || id <= 0) return
    setSearchedId(id)
    setDrawerStudentId(id)
    setDrawerStudentName(name ?? '')
  }

  const { data: debtorsData, isLoading: loadingDebtors } = useDebtors(minDebt)
  const { data: studentProfile, isLoading: loadingProfile } = useStudentFinanceProfile(searchedId)
  const { data: walletData, isLoading: loadingWallet } = useStudentWallet(searchedId)
  const { data: highRiskData, isLoading: loadingRisk } = useHighRisk()
  const { data: moratoriumsData, isLoading: loadingMoratoriums } = useFinanceMoratoriums({ status: 'ACTIVE' })
  const exportDebtors = useExportDebtors()

  async function handleExport() {
    try {
      const blob = await exportDebtors.mutateAsync()
      downloadBlob(blob, `debiteurs-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch {}
  }

  const debtors: any[] = (debtorsData as any)?.data ?? (Array.isArray(debtorsData) ? debtorsData : [])
  const profile = studentProfile as any
  const wallet = walletData as StudentWallet | undefined
  const highRisk: RiskEntry[] = (highRiskData as any)?.data ?? (Array.isArray(highRiskData) ? highRiskData : [])
  const moratoriums: any[] = (moratoriumsData as any)?.data ?? (Array.isArray(moratoriumsData) ? moratoriumsData : [])

  const totalDebt = debtors.reduce((acc, d) => acc + (Number(d.feesBalance) || 0), 0)

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Débiteurs & Risques"
        subtitle="Suivi des impayés, profils à risque et relances — ERP scolaire RDC"
        actions={
          <>
            <Link
              href="/finances/suivi-financier?status=DEBTOR"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 shadow-sm transition-colors"
            >
              <BarChart3 size={13} />
              Suivi détaillé
            </Link>
            {debtors.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                  <TrendingDown size={13} />
                  {debtors.length} débiteur(s)
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-100 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm">
                  <DollarSign size={13} className="text-red-500" />
                  {formatMoney(totalDebt)}
                </div>
              </>
            )}
            <button onClick={handleExport} disabled={exportDebtors.isPending}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40">
              <Download size={12} /> Export CSV
            </button>
            <Link
              href="/finances/relances"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              <Bell size={12} /> Relances
            </Link>
          </>
        }
      />

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="number" min={0}
            value={minDebtInput}
            onChange={e => setMinDebtInput(e.target.value)}
            placeholder="Dette minimale"
            className="pl-8 pr-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-44"
          />
        </div>
        <button
          onClick={() => setMinDebt(Number(minDebtInput) || 0)}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700"
        >
          Filtrer
        </button>
        <span className="text-xs text-zinc-400">Afficher les élèves avec une dette supérieure à {formatMoney(minDebt)}</span>
      </div>

      {/* Table débiteurs */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Liste des débiteurs</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{debtors.length}</span>
        </div>

        {loadingDebtors ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
          </div>
        ) : debtors.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun débiteur pour ce seuil</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Matricule</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Classe</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Solde dû</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Risque</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">DPD</th>
                  <th className="px-5 py-3 text-xs font-semibold text-zinc-500">Actions</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {debtors.map((dbtr: any, i: number) => (
                  <tr
                    key={dbtr.id ?? i}
                    className="border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer"
                    onClick={() => {
                      setSearchedId(dbtr.id)
                      setExpandedDebtor(expandedDebtor === dbtr.id ? null : dbtr.id)
                    }}
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{formatStudentFullName(dbtr)}</td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400 font-mono">{dbtr.matricule ?? '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{dbtr.class?.name ?? dbtr.className ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-600">
                      {dbtr.feesBalance != null || dbtr.balance != null
                        ? formatMoney(Number(dbtr.balance ?? dbtr.feesBalance))
                        : '—'}
                      {dbtr.ledgerCoherent === false && (
                        <p className="text-[10px] font-normal text-amber-600">écart ledger</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-zinc-800">
                      {dbtr.riskScore != null ? dbtr.riskScore : '—'}
                      {dbtr.expectedLoss != null && Number(dbtr.expectedLoss) > 0 && (
                        <p className="text-[10px] font-normal text-zinc-400">
                          ECL {formatMoney(Number(dbtr.expectedLoss))}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-zinc-600">
                      {dbtr.daysPastDue != null ? `${dbtr.daysPastDue} j` : '—'}
                      {dbtr.situation && (
                        <p className="text-[10px] text-zinc-400">{String(dbtr.situation)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {dbtr.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openFinanceDrawer(Number(dbtr.id), formatStudentFullName(dbtr))}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              <PanelRightOpen size={11} />
                              Encaisser
                            </button>
                            <StudentFeeScheduleLink studentId={Number(dbtr.id)} />
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronDown size={14} className={`text-zinc-400 transition-transform ${expandedDebtor === dbtr.id ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-50/50 border-t border-zinc-100">
                  <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-zinc-500">Total ({debtors.length} débiteurs)</td>
                  <td className="px-5 py-3 text-right text-xs font-bold text-red-600">
                    {formatMoney(totalDebt)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>

      {/* Profils à haut risque */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Profils à haut risque</h2>
          </div>
          {highRisk.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{highRisk.length}</span>
          )}
        </div>
        {loadingRisk ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : highRisk.length === 0 ? (
          <div className="py-8 text-center">
            <AlertTriangle size={20} className="mx-auto text-zinc-200 mb-2" />
            <p className="text-sm text-zinc-400">Aucun profil à haut risque</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Classe</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Solde dû</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Risque</th>
                  <th className="px-5 py-3 text-xs font-semibold text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {highRisk.map((r, i) => {
                  const name =
                    (r.studentName?.trim() || formatStudentFullName(r) || '').trim() ||
                    (r.matricule ? `Matricule ${r.matricule}` : null) ||
                    (r.studentId || r.id ? `#${r.studentId ?? r.id}` : '—')
                  const debt = Number(r.debtAmount ?? r.tuitionBalance ?? r.balance ?? r.feesBalance ?? 0)
                  const studentId = r.studentId ?? r.id
                  return (
                  <tr key={studentId ?? i} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{name}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{r.className ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-600">
                      {formatMoney(debt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
                        r.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>
                        {r.riskLevel ?? 'HIGH'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {studentId ? <StudentFeeScheduleLink studentId={studentId} /> : null}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Moratoires actifs */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Moratoires actifs</h2>
          </div>
          {moratoriums.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">{moratoriums.length}</span>
          )}
        </div>
        {loadingMoratoriums ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : moratoriums.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar size={20} className="mx-auto text-zinc-200 mb-2" />
            <p className="text-sm text-zinc-400">Aucun moratoire actif</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {moratoriums.map((m: any, i: number) => (
              <div key={m.id ?? i} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {(m.studentName ?? (m.student ? formatStudentFullName(m.student) : '')) || `Élève #${m.studentId ?? '—'}`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {m.type ?? '—'}{m.startDate ? ` · ${new Date(m.startDate).toLocaleDateString('fr-FR')}` : ''}
                    {m.endDate ? ` → ${new Date(m.endDate).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                  {m.status ?? 'ACTIVE'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profil financier élève */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm max-w-xl">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Profil financier 360°</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Cliquez sur un débiteur ou saisissez un ID</p>
          </div>
          <div className="p-5">
            <div className="mb-5">
              <FinanceStudentSearchField
                studentId={searchedId}
                onSelect={(id, student) => {
                  setSearchedId(id)
                  if (student) setDrawerStudentName(student.name)
                }}
                label="Rechercher un élève"
              />
              {searchedId > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openFinanceDrawer(searchedId, drawerStudentName || (profile?.profile ? formatRdcFullName(profile.profile) : undefined))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <PanelRightOpen size={13} />
                    Panneau encaissement
                  </button>
                  <StudentFeeScheduleLink studentId={searchedId} variant="inline" />
                  <Link
                    href={`/finances/eleves/${searchedId}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Fiche plein écran →
                  </Link>
                </div>
              )}
            </div>

            {loadingProfile && (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            )}

            {profile && !loadingProfile && (
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
                {/* Identité */}
                {profile.profile && (
                  <motion.div variants={fadeUp} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-700">
                        {profile.profile.firstName?.[0]}{profile.profile.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{formatRdcFullName(profile.profile)}</p>
                      {profile.profile.matricule && <p className="text-xs text-zinc-400">{profile.profile.matricule}</p>}
                      {profile.profile.className && <p className="text-xs text-zinc-400">{profile.profile.className}</p>}
                    </div>
                  </motion.div>
                )}

                {/* Stats financières */}
                {profile.stats && (
                  <motion.div variants={fadeUp}>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Situation financière</p>
                    <div className="space-y-1.5">
                      {Object.entries(profile.stats).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                          <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                          <span className={`text-xs font-semibold ${
                            k.toLowerCase().includes('balance') || k.toLowerCase().includes('debt')
                              ? 'text-red-600' : 'text-zinc-800'
                          }`}>
                            {typeof v === 'number' ? formatMoney(Number(v)) : String(v ?? '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Ledger */}
                {profile.ledger && (profile.ledger as any[]).length > 0 && (
                  <motion.div variants={fadeUp}>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Ledger récent</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {(profile.ledger as any[]).map((l: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-zinc-50 last:border-0">
                          <span className="text-zinc-500">{l.type ?? l.description ?? l.action ?? '—'}</span>
                          <span className={Number(l.amount) >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                            {formatMoney(Number(l.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {searchedId > 0 && (
                  <motion.div variants={fadeUp}>
                    <StudentPaymentHistory studentId={searchedId} compact className="mt-2" />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Portefeuille élève */}
            {searchedId > 0 && (loadingWallet || wallet) && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={13} className="text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-700">Portefeuille</p>
                </div>
                {loadingWallet ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : wallet ? (
                  <div className="space-y-1.5">
                    {[
                      ['Solde', formatMoney(Number(wallet.balance)), Number(wallet.balance) < 0 ? 'text-red-600' : 'text-zinc-800'],
                      ['Total payé', formatMoney(Number(wallet.totalPaid)), 'text-emerald-700'],
                      ['Total dû', formatMoney(Number(wallet.totalDue)), 'text-zinc-800'],
                      ...(wallet.lastPaymentAt ? [['Dernier paiement', new Date(wallet.lastPaymentAt).toLocaleDateString('fr-FR'), 'text-zinc-500']] : []),
                    ].map(([k, v, cls]) => (
                      <div key={k} className="flex items-center justify-between py-1 border-b border-zinc-50 last:border-0">
                        <span className="text-xs text-zinc-500">{k}</span>
                        <span className={`text-xs font-semibold ${cls}`}>{v}</span>
                      </div>
                    ))}
                    {wallet.transactions && wallet.transactions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-50">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Récents</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {wallet.transactions.slice(0, 5).map((t) => (
                            <div key={t.id} className="flex items-center justify-between text-xs">
                              <span className="text-zinc-500">{t.method} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                              <span className={`font-medium ${t.status === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {formatMoney(Number(t.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {searchedId > 0 && !loadingProfile && !profile && (
              <p className="text-sm text-zinc-400 text-center py-4">Profil introuvable</p>
            )}
          </div>
        </div>

      <StudentFinanceDrawer
        studentId={drawerStudentId}
        studentName={drawerStudentName || (profile?.profile ? formatRdcFullName(profile.profile) : undefined)}
        open={drawerStudentId > 0}
        onClose={() => setDrawerStudentId(0)}
      />
    </FinancePageShell>
  )
}
