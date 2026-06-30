'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gavel, Search, CheckCircle, AlertTriangle, Clock, X, RefreshCw } from 'lucide-react'
import { adminSanctionsApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }

function riskLabel(score: number) {
  if (score < 0.25) return { text: 'Faible', cls: 'text-emerald-600 bg-emerald-50' }
  if (score < 0.5)  return { text: 'Modéré', cls: 'text-amber-600 bg-amber-50' }
  if (score < 0.75) return { text: 'Élevé', cls: 'text-orange-600 bg-orange-50' }
  return { text: 'Critique', cls: 'text-red-600 bg-red-50' }
}

function severityToLabel(severity: unknown): string {
  if (severity === 'LOW')      return 'Avertissement'
  if (severity === 'MEDIUM')   return 'Convocation parents'
  if (severity === 'HIGH')     return 'Conseil disciplinaire'
  if (severity === 'CRITICAL') return 'Conseil disciplinaire (critique)'
  return String(severity ?? '—')
}

function statusToLabel(status: unknown): string {
  if (status === 'PENDING')  return 'En attente de validation'
  if (status === 'APPLIED')  return 'Appliquée'
  if (status === 'REJECTED') return 'Rejetée'
  if (status === 'NONE')     return 'Aucune'
  return String(status ?? '—')
}

export default function SanctionsPage() {
  const [studentId, setStudentId] = useState(0)
  const [fraudScore, setFraudScore] = useState(0.3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId) { setError('Sélectionnez un élève'); return }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await adminSanctionsApi.analyze({ studentId, fraudScore: Math.round(fraudScore * 100) / 100 })
      setResult(res)
    } catch (err) { setError(getApiErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const risk = riskLabel(fraudScore)

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-8 py-5">
          <h1 className="text-2xl font-semibold text-zinc-900">Sanctions</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Analyse automatisée des sanctions selon le score de fraude</p>
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

          <form onSubmit={handleAnalyze} className="space-y-5">
            <StudentSearchField
              studentId={studentId}
              onSelect={setStudentId}
              label="Élève"
              required
            />

            {/* Score de fraude */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-500">Score de fraude</label>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${risk.cls}`}>
                  {risk.text} — {fraudScore.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={fraudScore}
                onChange={e => setFraudScore(Math.round(Number(e.target.value) * 100) / 100)}
                className="w-full accent-amber-600"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-0.5">
                <span>0.00</span>
                <span>0.50</span>
                <span>1.00</span>
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
            ) : (() => {
              const status   = result.status as string | undefined
              const severity = result.severity as string | undefined
              const validated = result.validated as boolean | undefined
              const sanctionType = (result.sanctionType as string | undefined) ?? severityToLabel(severity)

              // Une sanction existe si status est présent et différent de NONE / pas de champ status
              // OU si sanctionApplied est explicitement true
              const noSanction =
                result.sanctionApplied === false ||
                status === 'NONE' ||
                status === 'NO_SANCTION' ||
                (!status && !severity && result.sanctionApplied !== true)
              const isPending = status === 'PENDING'

              return (
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
                  {noSanction ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">Aucune sanction requise</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Le score est sous le seuil de déclenchement</p>
                      </div>
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                      <Clock size={16} className="text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Sanction en attente de validation</p>
                        <p className="text-xs text-amber-600 mt-0.5">{sanctionType}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                      <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Sanction appliquée</p>
                        <p className="text-xs text-red-600 mt-0.5">{sanctionType}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {severity && (
                      <div className="flex justify-between px-3 py-2 bg-zinc-50 rounded-lg">
                        <span className="text-xs text-zinc-500">Type de sanction</span>
                        <span className="text-xs font-semibold text-zinc-800">{severityToLabel(severity)}</span>
                      </div>
                    )}
                    {status && (
                      <div className="flex justify-between px-3 py-2 bg-zinc-50 rounded-lg">
                        <span className="text-xs text-zinc-500">Statut</span>
                        <span className="text-xs font-semibold text-zinc-800">{statusToLabel(status)}</span>
                      </div>
                    )}
                    {validated !== undefined && (
                      <div className="flex justify-between px-3 py-2 bg-zinc-50 rounded-lg">
                        <span className="text-xs text-zinc-500">Validée</span>
                        <span className="text-xs font-semibold text-zinc-800">{validated ? 'Oui' : 'Non'}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })()}
          </motion.div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Seuils de déclenchement</h3>
            <div className="space-y-2">
              {[
                { label: 'Avertissement',       condition: 'Score ≥ 0.25' },
                { label: 'Convocation parents',  condition: 'Score ≥ 0.50' },
                { label: 'Conseil disciplinaire', condition: 'Score ≥ 0.75' },
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
