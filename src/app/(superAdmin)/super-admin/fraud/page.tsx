'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Loader2, CheckCircle2, XCircle,
  Search, Flag, TrendingUp, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fraudApi } from '@/lib/superAdmin/api/fraud.api'
import { anomaliesApi } from '@/lib/superAdmin/api/anomalies.api'
import type { FraudAnalysisResult } from '@/types/super-admin'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { formatMoney } from '@/lib/finance/currency'

const CARD = 'bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6'
const INPUT = 'w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-red-200 placeholder:text-zinc-300'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1.5'
const BTN = 'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors'
const SKELETON = 'bg-zinc-100 rounded-xl animate-pulse'

function CardTitle({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-zinc-500" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

const RISK_COLORS: Record<string, string> = {
  LOW:    'bg-emerald-50 text-emerald-700 border-emerald-100',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
  HIGH:   'bg-red-50 text-red-700 border-red-100',
}

function RiskBadge({ level }: { level?: string }) {
  if (!level) return null
  const labels: Record<string, string> = { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé' }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
      RISK_COLORS[level] ?? 'bg-zinc-50 text-zinc-500 border-zinc-100'
    )}>
      <TrendingUp size={11} />
      {labels[level] ?? level}
    </span>
  )
}

export default function FraudPage() {
  const [studentId, setStudentId] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<FraudAnalysisResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const { data: flags = [], isLoading: loadingFlags } = useQuery({
    queryKey: ['superadmin', 'fraud', 'flags'],
    queryFn: () => fraudApi.getFlags({ limit: 50 }),
    refetchInterval: 60_000,
  })

  const handleAnalyze = async () => {
    if (!studentId) return
    setAnalyzing(true)
    setResult(null)
    setAnalyzeError(null)
    try {
      const r = await anomaliesApi.analyzeStudent(Number(studentId))
      setResult(r)
    } catch {
      setAnalyzeError('Erreur lors de l\'analyse de fraude')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle size={17} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Fraude</h1>
              <p className="text-sm text-zinc-400 mt-0.5">Analyse cross-school — détection et signalements</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Analyse par élève ───────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={Search} title="Analyser un élève" desc="Score de fraude individuel cross-school" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>ID de l'élève</label>
              <input
                type="number"
                placeholder="Ex: 142"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={INPUT}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !studentId}
              className={cn(BTN, 'bg-red-600 text-white hover:bg-red-700')}
            >
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              Analyser
            </button>

            {analyzeError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <XCircle size={14} className="flex-shrink-0" />
                {analyzeError}
              </div>
            )}

            {result && (
              <div className="border border-zinc-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500">Niveau de risque</span>
                  <RiskBadge level={result.riskLevel} />
                </div>
                {result.score !== undefined && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1">
                      <span>Score de fraude</span>
                      <span className="font-semibold text-zinc-700">{(result.score * 100).toFixed(0)} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          result.score >= 0.7 ? 'bg-red-500' : result.score >= 0.4 ? 'bg-amber-400' : 'bg-emerald-500'
                        )}
                        style={{ width: `${(result.score * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>
                )}
                {result.recommendation && (
                  <div className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
                    <p className="font-medium text-zinc-700 mb-0.5">Recommandation</p>
                    {result.recommendation}
                  </div>
                )}
                {result.flags && result.flags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">Signaux détectés</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.flags.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-100">
                          <Flag size={9} />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.message && (
                  <p className="text-xs text-zinc-400">{result.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Signalements récents ────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={Flag} title="Signalements cross-school" desc="Derniers flags de fraude tous établissements" />
          {loadingFlags ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-14')} />)}
            </div>
          ) : flags.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-300">
              <CheckCircle2 size={32} />
              <p className="text-sm">Aucun signalement actif</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {flags.map((flag) => (
                <div key={flag.id} className="border border-zinc-100 rounded-xl p-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {flag.student && (
                        <p className="text-xs font-medium text-zinc-700 truncate">
                          {formatStudentFullName(flag.student)}
                        </p>
                      )}
                      {flag.payment && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatMoney(flag.payment.amount)} · {flag.payment.method}
                          <span className="ml-1 text-zinc-300">· {flag.payment.school.name}</span>
                        </p>
                      )}
                      {flag.reason && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 italic truncate">{flag.reason}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={cn(
                        'text-xs font-bold tabular-nums',
                        flag.fraudScore >= 0.7 ? 'text-red-600' : flag.fraudScore >= 0.4 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {(flag.fraudScore * 100).toFixed(0)} %
                      </span>
                      <p className="text-[10px] text-zinc-300 flex items-center justify-end gap-0.5 mt-0.5">
                        <Clock size={9} />
                        {new Date(flag.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
