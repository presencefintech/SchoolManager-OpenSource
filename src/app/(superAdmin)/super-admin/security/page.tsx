'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldOff, ShieldCheck, AlertTriangle, Eye,
  CheckCircle2, AlertCircle, Loader2, Building2, User, Activity, Settings, Save,
} from 'lucide-react'
import { useSchools, useAnomalyThresholds } from '@/lib/hooks/use-super-admin'
import { securityApi } from '@/lib/superAdmin/api/security.api'
import { anomaliesApi } from '@/lib/superAdmin/api/anomalies.api'
import type { FraudAnalysisResult, AnomalyThresholds } from '@/types/super-admin'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { StudentPicker } from '@/components/ui/student-picker'
import { humanizeEnum, riskLevelLabel } from '@/lib/i18n/display-labels'

/* ── helpers ──────────────────────────────────────────────────────────────── */
type FeedbackState = { type: 'success' | 'error'; message: string } | null

function Feedback({ state }: { state: FeedbackState }) {
  if (!state) return null
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-xl px-4 py-3 text-sm mt-3',
      state.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {state.type === 'success'
        ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
        : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
      }
      {state.message}
    </div>
  )
}

function SectionHeader({
  icon: Icon, title, desc, badge,
}: {
  icon: React.ElementType; title: string; desc: string; badge?: { label: string; color: string }
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
      <Icon size={18} className="text-zinc-300 flex-shrink-0 mt-0.5" />
    </div>
  )
}

const INPUT_CLS = 'w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-zinc-300'
const LABEL_CLS = 'block text-xs font-medium text-zinc-500 mb-1'

/* ══════════════════════════════════════════════════════════════════════════ */

export default function SecurityPage() {
  const { data: schools } = useSchools()

  /* Shared context */
  const [ctxSchoolId, setCtxSchoolId] = useState('')
  const [ctxStudentId, setCtxStudentId] = useState('')

  /* Suspend */
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendLoading, setSuspendLoading] = useState(false)
  const [suspendFeedback, setSuspendFeedback] = useState<FeedbackState>(null)

  /* Unblock */
  const [unblockLoading, setUnblockLoading] = useState(false)
  const [unblockFeedback, setUnblockFeedback] = useState<FeedbackState>(null)

  /* Report fraud */
  const [fraudScore, setFraudScore] = useState(50)
  const [fraudReason, setFraudReason] = useState('')
  const [fraudLoading, setFraudLoading] = useState(false)
  const [fraudFeedback, setFraudFeedback] = useState<FeedbackState>(null)

  /* Audit PII */
  const [piiDataType, setPiiDataType] = useState<'BIOMETRIC' | 'PERSONAL_DOCS' | 'FINANCIAL_FULL'>('BIOMETRIC')
  const [piiLoading, setPiiLoading] = useState(false)
  const [piiFeedback, setPiiFeedback] = useState<FeedbackState>(null)

  const schoolId = Number(ctxSchoolId)
  const studentId = Number(ctxStudentId)
  const contextReady = !!schoolId && !!studentId

  const handleSuspend = async () => {
    if (!contextReady || suspendReason.length < 10) return
    setSuspendLoading(true); setSuspendFeedback(null)
    try {
      await securityApi.suspendStudent({ studentId, schoolId, reason: suspendReason })
      setSuspendFeedback({ type: 'success', message: `Élève #${studentId} suspendu.` })
      setSuspendReason('')
    } catch (e) {
      setSuspendFeedback({ type: 'error', message: getApiErrorMessage(e) })
    } finally { setSuspendLoading(false) }
  }

  const handleUnblock = async () => {
    if (!contextReady) return
    setUnblockLoading(true); setUnblockFeedback(null)
    try {
      await securityApi.unblockStudent(schoolId, studentId)
      setUnblockFeedback({ type: 'success', message: `Élève #${studentId} réactivé.` })
    } catch (e) {
      setUnblockFeedback({ type: 'error', message: getApiErrorMessage(e) })
    } finally { setUnblockLoading(false) }
  }

  const handleFraud = async () => {
    if (!contextReady || fraudReason.length < 5) return
    setFraudLoading(true); setFraudFeedback(null)
    try {
      await securityApi.reportFraud({ studentId, schoolId, fraudScore, reason: fraudReason })
      setFraudFeedback({ type: 'success', message: 'Signalement de fraude enregistré.' })
      setFraudReason('')
      setFraudScore(50)
    } catch (e) {
      setFraudFeedback({ type: 'error', message: getApiErrorMessage(e) })
    } finally { setFraudLoading(false) }
  }

  const handlePIIAudit = async () => {
    if (!contextReady) return
    setPiiLoading(true); setPiiFeedback(null)
    try {
      await securityApi.auditPIIAccess({ studentId, schoolId, dataType: piiDataType })
      setPiiFeedback({ type: 'success', message: 'Accès aux données PII enregistré dans l\'audit trail.' })
    } catch (e) {
      setPiiFeedback({ type: 'error', message: getApiErrorMessage(e) })
    } finally { setPiiLoading(false) }
  }

  /* Anomaly analysis */
  const [anomalyStudentId, setAnomalyStudentId] = useState('')
  const [analyzingAnomaly, setAnalyzingAnomaly] = useState(false)
  const [anomalyResult, setAnomalyResult] = useState<FraudAnalysisResult | null>(null)
  const [anomalyFeedback, setAnomalyFeedback] = useState<FeedbackState>(null)

  const handleAnomalyAnalysis = async () => {
    if (!anomalyStudentId) return
    setAnalyzingAnomaly(true); setAnomalyFeedback(null); setAnomalyResult(null)
    try {
      const r = await anomaliesApi.analyzeStudent(Number(anomalyStudentId))
      setAnomalyResult(r)
    } catch (e) {
      setAnomalyFeedback({ type: 'error', message: getApiErrorMessage(e) })
    } finally { setAnalyzingAnomaly(false) }
  }

  /* Thresholds */
  const { data: thresholds } = useAnomalyThresholds(schoolId || undefined)
  const [thresholdForm, setThresholdForm] = useState({ fraudScoreMin: '', absenceRateMax: '', devianceMax: '' })
  const [savingThresholds, setSavingThresholds] = useState(false)
  const [thresholdFeedback, setThresholdFeedback] = useState<FeedbackState>(null)

  useEffect(() => {
    if (thresholds) {
      setThresholdForm({
        fraudScoreMin: thresholds.fraudScoreMin !== undefined ? String(thresholds.fraudScoreMin) : '',
        absenceRateMax: thresholds.absenceRateMax !== undefined ? String(thresholds.absenceRateMax) : '',
        devianceMax: thresholds.devianceMax !== undefined ? String(thresholds.devianceMax) : '',
      })
    }
  }, [thresholds])

  const handleSaveThresholds = async () => {
    setSavingThresholds(true); setThresholdFeedback(null)
    try {
      const payload: Record<string, number | undefined> = {}
      if (thresholdForm.fraudScoreMin !== '') payload.fraudScoreMin = Number(thresholdForm.fraudScoreMin)
      if (thresholdForm.absenceRateMax !== '') payload.absenceRateMax = Number(thresholdForm.absenceRateMax)
      if (thresholdForm.devianceMax !== '') payload.devianceMax = Number(thresholdForm.devianceMax)
      await anomaliesApi.updateThresholds(payload)
      setThresholdFeedback({ type: 'success', message: 'Seuils mis à jour avec succès.' })
    } catch (e) {
      setThresholdFeedback({ type: 'error', message: getApiErrorMessage(e) })
    } finally { setSavingThresholds(false) }
  }

  const fraudColor = fraudScore >= 75 ? 'text-red-600' : fraudScore >= 50 ? 'text-amber-500' : 'text-emerald-600'
  const fraudBg = fraudScore >= 75 ? 'bg-red-500' : fraudScore >= 50 ? 'bg-amber-400' : 'bg-emerald-500'

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-5xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Sécurité</h1>
          <p className="text-sm text-zinc-400 mt-1">Suspension, fraude, réactivation et audit RGPD</p>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

        {/* ══ CONTEXTE ÉLÈVE ══════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Élève cible</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
              <Building2 size={13} className="text-zinc-400 flex-shrink-0" />
              <select
                value={ctxSchoolId}
                onChange={(e) => setCtxSchoolId(e.target.value)}
                className="text-sm text-zinc-700 bg-transparent focus:outline-none flex-1"
              >
                <option value="">Choisir un établissement…</option>
                {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <User size={13} className="text-zinc-400 flex-shrink-0" />
              <StudentPicker
                value={ctxStudentId}
                onChange={setCtxStudentId}
                schoolId={ctxSchoolId ? Number(ctxSchoolId) : null}
                className="flex-1"
              />
            </div>
          </div>
          {!contextReady && (
            <p className="text-xs text-zinc-400 mt-3 flex items-center gap-1.5">
              <AlertCircle size={12} />
              Sélectionnez un établissement et saisissez l'ID de l'élève pour activer les actions
            </p>
          )}
          {contextReady && (
            <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              Cible : élève #{studentId} · {schools?.find(s => s.id === schoolId)?.name}
            </p>
          )}
        </div>

        {/* ══ ACTIONS GRID ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Suspension */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <SectionHeader icon={ShieldOff} title="Suspension forcée" desc="Fraude ou incident grave · min. 10 caractères" />
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Motif de suspension</label>
                <textarea
                  rows={3}
                  placeholder="Décrire précisément le motif de suspension…"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  disabled={!contextReady}
                  className={cn(INPUT_CLS, 'resize-none', !contextReady && 'opacity-40 cursor-not-allowed')}
                />
                {suspendReason.length > 0 && suspendReason.length < 10 && (
                  <p className="text-xs text-red-500 mt-1">{10 - suspendReason.length} caractère(s) manquant(s)</p>
                )}
              </div>
              <button
                onClick={handleSuspend}
                disabled={!contextReady || suspendReason.length < 10 || suspendLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {suspendLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
                Suspendre l'élève
              </button>
              <Feedback state={suspendFeedback} />
            </div>
          </div>

          {/* Réactivation */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <SectionHeader icon={ShieldCheck} title="Réactivation" desc="Débloque un compte suspendu ou bloqué" />
            <div className="space-y-3">
              <div className={cn(
                'rounded-xl border p-4',
                contextReady ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-100 bg-zinc-50'
              )}>
                <p className="text-sm text-zinc-600">
                  {contextReady
                    ? <>Réactivation de l'élève <span className="font-semibold">#{studentId}</span></>
                    : 'Sélectionnez un élève cible ci-dessus'
                  }
                </p>
                {contextReady && (
                  <p className="text-xs text-zinc-400 mt-1">
                    École · {schools?.find(s => s.id === schoolId)?.name}
                  </p>
                )}
              </div>
              <button
                onClick={handleUnblock}
                disabled={!contextReady || unblockLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 transition-colors"
              >
                {unblockLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                Réactiver le compte
              </button>
              <Feedback state={unblockFeedback} />
            </div>
          </div>

          {/* Signalement fraude */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <SectionHeader icon={AlertTriangle} title="Signalement fraude" desc="Enregistre une suspicion après investigation" />
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Score de risque — <span className={cn('font-bold', fraudColor)}>{fraudScore}/100</span></label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fraudScore}
                  onChange={(e) => setFraudScore(Number(e.target.value))}
                  disabled={!contextReady}
                  className={cn('w-full h-2 rounded-full appearance-none cursor-pointer', fraudBg, !contextReady && 'opacity-40')}
                  style={{ accentColor: fraudScore >= 75 ? '#ef4444' : fraudScore >= 50 ? '#f59e0b' : '#22c55e' }}
                />
                <div className="flex justify-between text-[10px] text-zinc-300 mt-0.5">
                  <span>Faible</span><span>Moyen</span><span>Élevé</span>
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>Motif du signalement</label>
                <textarea
                  rows={3}
                  placeholder="Décrire les éléments suspects observés…"
                  value={fraudReason}
                  onChange={(e) => setFraudReason(e.target.value)}
                  disabled={!contextReady}
                  className={cn(INPUT_CLS, 'resize-none', !contextReady && 'opacity-40 cursor-not-allowed')}
                />
              </div>
              <button
                onClick={handleFraud}
                disabled={!contextReady || fraudReason.length < 5 || fraudLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {fraudLoading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                Signaler la fraude
              </button>
              <Feedback state={fraudFeedback} />
            </div>
          </div>

          {/* Audit PII RGPD */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <SectionHeader icon={Eye} title="Audit accès PII" desc="Trace RGPD obligatoire pour consultation données sensibles" />
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Type de données consultées</label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { value: 'BIOMETRIC',      label: 'Biométrie',         desc: 'Vecteurs faciaux, empreintes' },
                    { value: 'PERSONAL_DOCS',  label: 'Documents personnels', desc: 'CNI, actes de naissance' },
                    { value: 'FINANCIAL_FULL', label: 'Finance complète',   desc: 'Historique paiements, soldes' },
                  ] as const).map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all',
                        piiDataType === opt.value
                          ? 'border-indigo-200 bg-indigo-50'
                          : 'border-zinc-100 hover:border-zinc-200',
                        !contextReady && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="radio"
                        name="piiDataType"
                        value={opt.value}
                        checked={piiDataType === opt.value}
                        onChange={() => setPiiDataType(opt.value)}
                        disabled={!contextReady}
                        className="accent-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-zinc-700">{opt.label}</p>
                        <p className="text-xs text-zinc-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={handlePIIAudit}
                disabled={!contextReady || piiLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {piiLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                Enregistrer l'accès PII
              </button>
              <Feedback state={piiFeedback} />
            </div>
          </div>

          {/* Analyse anomalies */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <SectionHeader icon={Activity} title="Analyse anomalies élève" desc="Analyse comportementale cross-school" />
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Élève à analyser (indépendant du contexte ci-dessus)</label>
                <StudentPicker value={anomalyStudentId} onChange={setAnomalyStudentId} />
              </div>
              <button
                onClick={handleAnomalyAnalysis}
                disabled={!anomalyStudentId || analyzingAnomaly}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {analyzingAnomaly ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                Analyser
              </button>
              <Feedback state={anomalyFeedback} />
              {anomalyResult && (
                <div className={cn(
                  'rounded-xl px-4 py-3 text-sm space-y-1.5',
                  anomalyResult.riskLevel === 'HIGH' ? 'bg-red-50'
                  : anomalyResult.riskLevel === 'MEDIUM' ? 'bg-amber-50'
                  : 'bg-emerald-50'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-700">Niveau de risque</span>
                    <span className={cn('font-bold',
                      anomalyResult.riskLevel === 'HIGH' ? 'text-red-600'
                      : anomalyResult.riskLevel === 'MEDIUM' ? 'text-amber-600'
                      : 'text-emerald-600'
                    )}>
                      {riskLevelLabel(anomalyResult.riskLevel)}
                    </span>
                  </div>
                  {anomalyResult.score !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">Score</span>
                      <span className="font-mono text-xs font-semibold text-zinc-700">{anomalyResult.score}</span>
                    </div>
                  )}
                  {anomalyResult.flags && anomalyResult.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {anomalyResult.flags.map((f, i) => (
                        <span key={i} className="text-[10px] bg-white border border-zinc-200 px-2 py-0.5 rounded">
                          {humanizeEnum(String(f))}
                        </span>
                      ))}
                    </div>
                  )}
                  {anomalyResult.recommendation && (
                    <p className="text-xs text-zinc-500 pt-1 italic">{anomalyResult.recommendation}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Seuils d'anomalies */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <SectionHeader icon={Settings} title="Seuils d'anomalies" desc="Modifier les paramètres de détection" />
            <div className="space-y-3">
              <div>
                <label className={LABEL_CLS}>Score fraude minimum (0–100)</label>
                <input
                  type="number" min={0} max={100}
                  value={thresholdForm.fraudScoreMin}
                  onChange={e => setThresholdForm(p => ({ ...p, fraudScoreMin: e.target.value }))}
                  placeholder={thresholds?.fraudScoreMin !== undefined ? String(thresholds.fraudScoreMin) : '—'}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Taux d'absence maximum (0–1)</label>
                <input
                  type="number" min={0} max={1} step={0.01}
                  value={thresholdForm.absenceRateMax}
                  onChange={e => setThresholdForm(p => ({ ...p, absenceRateMax: e.target.value }))}
                  placeholder={thresholds?.absenceRateMax !== undefined ? String(thresholds.absenceRateMax) : '—'}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Déviance max</label>
                <input
                  type="number" min={0}
                  value={thresholdForm.devianceMax}
                  onChange={e => setThresholdForm(p => ({ ...p, devianceMax: e.target.value }))}
                  placeholder={thresholds?.devianceMax !== undefined ? String(thresholds.devianceMax) : '—'}
                  className={INPUT_CLS}
                />
              </div>
              <button
                onClick={handleSaveThresholds}
                disabled={savingThresholds}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {savingThresholds ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Sauvegarder les seuils
              </button>
              <Feedback state={thresholdFeedback} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
