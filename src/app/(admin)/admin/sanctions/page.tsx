'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gavel, Search, CheckCircle, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminSanctionsApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }

const inputCls = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white'

export default function SanctionsPage() {
  const [studentId, setStudentId] = useState(0)
  const [absenceCount, setAbsenceCount] = useState('')
  const [lateCount, setLateCount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ sanctionApplied: boolean; sanctionType?: string } | null>(null)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId) { setError('Sélectionnez un élève'); return }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await adminSanctionsApi.analyze({
        studentId,
        absenceCount: absenceCount ? Number(absenceCount) : undefined,
        lateCount: lateCount ? Number(lateCount) : undefined,
      })
      setResult(res)
    } catch (err) { setError(getApiErrorMessage(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-8 py-5">
          <h1 className="text-2xl font-semibold text-zinc-900">Sanctions</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Analyse automatisée des sanctions liées aux absences et retards</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 grid grid-cols-2 gap-6">
        {/* Formulaire */}
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Gavel size={14} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900">Analyser une situation</h2>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <StudentSearchField
              studentId={studentId}
              onSelect={setStudentId}
              label="Élève"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Absences</label>
                <input type="number" min={0} value={absenceCount}
                  onChange={e => setAbsenceCount(e.target.value)}
                  placeholder="Ex : 5" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Retards</label>
                <input type="number" min={0} value={lateCount}
                  onChange={e => setLateCount(e.target.value)}
                  placeholder="Ex : 3" className={inputCls} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <X size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              {loading ? 'Analyse…' : 'Analyser'}
            </button>
          </form>
        </motion.div>

        {/* Résultat */}
        <div className="space-y-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show"
            className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Résultat de l'analyse</h2>

            {!result ? (
              <div className="py-10 text-center">
                <Gavel size={26} className="mx-auto text-zinc-200 mb-2" />
                <p className="text-xs text-zinc-400">Remplissez le formulaire et lancez l'analyse</p>
              </div>
            ) : (
              <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
                {result.sanctionApplied ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Sanction appliquée</p>
                      {result.sanctionType && (
                        <p className="text-xs text-red-600 mt-0.5">{result.sanctionType}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Aucune sanction requise</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Les seuils n'ont pas été atteints</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {Object.entries(result)
                    .filter(([k]) => !['sanctionApplied', 'sanctionType'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between px-3 py-2 bg-zinc-50 rounded-lg">
                        <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                        <span className="text-xs font-semibold text-zinc-800">
                          {typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : String(v ?? '—')}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Infos politiques */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Politique de sanctions</h3>
            <div className="space-y-2">
              {[
                { label: 'Avertissement', condition: '≥ 3 absences injustifiées' },
                { label: 'Convocation parents', condition: '≥ 5 absences ou ≥ 8 retards' },
                { label: 'Conseil disciplinaire', condition: '≥ 10 absences injustifiées' },
              ].map(({ label, condition }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">{label}</span>
                  <span className="text-xs text-zinc-400">{condition}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
