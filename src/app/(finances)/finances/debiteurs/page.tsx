'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, AlertTriangle, Search, Filter, DollarSign, TrendingDown, ChevronDown } from 'lucide-react'
import { useDebtors, useHighRisk, useStudentFinanceProfile } from '@/lib/hooks/use-finance'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

export default function DebiteursPage() {
  const [minDebt, setMinDebt] = useState(10)
  const [minDebtInput, setMinDebtInput] = useState('10')
  const [studentIdInput, setStudentIdInput] = useState('')
  const [searchedId, setSearchedId] = useState(0)
  const [expandedDebtor, setExpandedDebtor] = useState<number | null>(null)

  const { data: debtorsData, isLoading: loadingDebtors } = useDebtors(minDebt)
  const { data: highRisk, isLoading: loadingRisk } = useHighRisk()
  const { data: studentProfile, isLoading: loadingProfile } = useStudentFinanceProfile(searchedId)

  const debtors: any[] = (debtorsData as any)?.data ?? (Array.isArray(debtorsData) ? debtorsData : [])
  const risks: any[] = Array.isArray(highRisk) ? highRisk : (highRisk as any)?.data ?? []
  const profile = studentProfile as any

  const totalDebt = debtors.reduce((acc, d) => acc + (Number(d.balance) || 0), 0)

  return (
    <div className="px-8 py-8 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Débiteurs & Risques</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Suivi des impayés et profils à risque</p>
        </div>
        {debtors.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 bg-red-50 text-xs font-medium text-red-700">
              <TrendingDown size={13} />
              {debtors.length} débiteur(s)
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-100 bg-white text-xs font-medium text-zinc-700 shadow-sm">
              <DollarSign size={13} className="text-red-500" />
              {totalDebt.toLocaleString('fr-FR')} F de dette cumulée
            </div>
          </div>
        )}
      </motion.div>

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
        <span className="text-xs text-zinc-400">Afficher les élèves avec une dette supérieure à {minDebt.toLocaleString('fr-FR')} FCFA</span>
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
            {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-11" />)}
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Classe</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Total dû</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Payé</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Balance</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Dernier paiement</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {debtors.map((dbtr: any, i: number) => (
                  <tr
                    key={dbtr.studentId ?? i}
                    className="border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer"
                    onClick={() => {
                      setSearchedId(dbtr.studentId)
                      setStudentIdInput(String(dbtr.studentId))
                      setExpandedDebtor(expandedDebtor === dbtr.studentId ? null : dbtr.studentId)
                    }}
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{dbtr.firstName} {dbtr.lastName}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{dbtr.className ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right text-zinc-700">{dbtr.totalDue != null ? `${Number(dbtr.totalDue).toLocaleString('fr-FR')} F` : '—'}</td>
                    <td className="px-5 py-3.5 text-right text-emerald-700 font-medium">{dbtr.totalPaid != null ? `${Number(dbtr.totalPaid).toLocaleString('fr-FR')} F` : '—'}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-600">{dbtr.balance != null ? `${Number(dbtr.balance).toLocaleString('fr-FR')} F` : '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {dbtr.lastPaymentDate ? new Date(dbtr.lastPaymentDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronDown size={14} className={`text-zinc-400 transition-transform ${expandedDebtor === dbtr.studentId ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-50/50 border-t border-zinc-100">
                  <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-zinc-500">Total ({debtors.length} débiteurs)</td>
                  <td className="px-5 py-3 text-right text-xs font-semibold text-zinc-700">
                    {debtors.reduce((a, d) => a + (Number(d.totalDue) || 0), 0).toLocaleString('fr-FR')} F
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-semibold text-emerald-700">
                    {debtors.reduce((a, d) => a + (Number(d.totalPaid) || 0), 0).toLocaleString('fr-FR')} F
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-bold text-red-600">
                    {totalDebt.toLocaleString('fr-FR')} F
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* Profils à haut risque */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Profils à haut risque</h2>
            </div>
            {risks.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{risks.length}</span>
            )}
          </div>
          {loadingRisk ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-10" />)}</div>
          ) : risks.length === 0 ? (
            <div className="py-10 text-center">
              <AlertTriangle size={22} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun profil à risque</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
              {risks.map((r: any, i: number) => (
                <div key={r.studentId ?? i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{r.firstName ?? r.studentName} {r.lastName ?? ''}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.className && <span className="text-xs text-zinc-400">{r.className}</span>}
                      {r.riskLevel && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          r.riskLevel === 'HIGH' ? 'bg-red-50 text-red-700' :
                          r.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                          'bg-zinc-100 text-zinc-500'
                        }`}>{r.riskLevel}</span>
                      )}
                      {r.riskScore != null && (
                        <span className="text-xs text-zinc-400">score: {r.riskScore}</span>
                      )}
                    </div>
                  </div>
                  {r.balance != null && (
                    <span className="text-sm font-semibold text-red-600">{Number(r.balance).toLocaleString('fr-FR')} F</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profil financier élève */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Profil financier 360°</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Cliquez sur un débiteur ou saisissez un ID</p>
          </div>
          <div className="p-5">
            <div className="flex gap-2 mb-5">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="number" min={1}
                  value={studentIdInput}
                  onChange={e => setStudentIdInput(e.target.value)}
                  placeholder="ID de l'élève"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <button
                onClick={() => setSearchedId(Number(studentIdInput) || 0)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700"
              >
                Chercher
              </button>
            </div>

            {loadingProfile && (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-8" />)}</div>
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
                      <p className="text-sm font-semibold text-zinc-900">{profile.profile.firstName} {profile.profile.lastName}</p>
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
                            {typeof v === 'number' ? `${Number(v).toLocaleString('fr-FR')} F` : String(v ?? '—')}
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
                            {Number(l.amount).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Historique paiements */}
                {profile.history && (profile.history as any[]).length > 0 && (
                  <motion.div variants={fadeUp}>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Historique paiements</p>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {(profile.history as any[]).map((p: any, i: number) => (
                        <div key={p.id ?? i} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                          <div>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">{p.method ?? '—'}</span>
                            {p.status && (
                              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded font-medium ${
                                p.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700' :
                                p.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                'bg-red-50 text-red-700'
                              }`}>{p.status}</span>
                            )}
                            {p.createdAt && (
                              <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</p>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-zinc-900">
                            {p.amount != null ? `${Number(p.amount).toLocaleString('fr-FR')} F` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {searchedId > 0 && !loadingProfile && !profile && (
              <p className="text-sm text-zinc-400 text-center py-4">Profil introuvable</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
