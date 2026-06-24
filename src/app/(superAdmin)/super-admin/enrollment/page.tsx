'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bot, ShieldCheck, AlertTriangle, Lock, LockOpen,
  Clock, Search, Trash2, CheckCircle, XCircle, Fingerprint,
  RefreshCw, UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchools, useWorkerHealth, useFinanceAudit } from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'
import { enrollmentApi } from '@/lib/superAdmin/api/enrollment.api'

/* ── helpers ────────────────────────────────────────────────────────────────── */

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">{children}</p>
}

function ActionResult({ result }: { result: { type: 'success' | 'error'; message: string } | null }) {
  if (!result) return null
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm',
      result.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-red-200 bg-red-50 text-red-700',
    )}>
      {result.type === 'success' ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {result.message}
    </div>
  )
}

const inputCls = 'h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-zinc-300'
const btnPrimary = 'h-9 px-4 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all'

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function EnrollmentPage() {
  const { data: schools } = useSchools()

  /* school selector */
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const { data: workerHealth, isLoading: loadingWorker, refetch: refetchWorker } = useWorkerHealth(schoolId ?? 0)
  const { data: financeAudit, isLoading: loadingFinance, refetch: refetchFinance } = useFinanceAudit(schoolId ?? 0)

  /* student diagnostic */
  const [studentId, setStudentId] = useState('')
  const [integrity, setIntegrity] = useState<Record<string, unknown> | null>(null)
  const [integrityError, setIntegrityError] = useState<string | null>(null)
  const [loadingIntegrity, setLoadingIntegrity] = useState(false)

  /* shared action state */
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  /* grace period */
  const [graceUntil, setGraceUntil] = useState('')

  /* create student */
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createSchoolId, setCreateSchoolId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  /* purge */
  const [purgeId, setPurgeId] = useState('')
  const [purgeWord, setPurgeWord] = useState('')
  const [loadingPurge, setLoadingPurge] = useState(false)

  /* ── handlers ── */

  async function checkIntegrity() {
    if (!studentId) return
    setLoadingIntegrity(true)
    setIntegrity(null)
    setIntegrityError(null)
    try {
      const data = await superAdminApi.getStudentIntegrity(Number(studentId))
      setIntegrity(data as Record<string, unknown>)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setIntegrityError(err.response?.data?.message ?? 'Élève introuvable.')
    } finally {
      setLoadingIntegrity(false)
    }
  }

  async function runAction(key: string, fn: () => Promise<{ message?: string }>) {
    setLoading(key)
    setActionResult(null)
    try {
      const r = await fn()
      setActionResult({ type: 'success', message: r.message ?? 'Action effectuée.' })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setActionResult({ type: 'error', message: err.response?.data?.message ?? 'Une erreur est survenue.' })
    } finally {
      setLoading(null)
    }
  }

  async function runCreateStudent() {
    if (!createFirstName || !createLastName || !createSchoolId) return
    setCreating(true)
    setCreateResult(null)
    try {
      const s = await enrollmentApi.createStudent({
        firstName: createFirstName,
        lastName: createLastName,
        schoolId: Number(createSchoolId),
      })
      setCreateResult({ type: 'success', message: `Élève créé : ${s.firstName} ${s.lastName} (ID #${s.id})` })
      setCreateFirstName('')
      setCreateLastName('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setCreateResult({ type: 'error', message: err.response?.data?.message ?? 'Erreur lors de la création.' })
    } finally {
      setCreating(false)
    }
  }

  async function runPurge() {
    if (!purgeId || purgeWord !== 'PURGE') return
    setLoadingPurge(true)
    setActionResult(null)
    try {
      await superAdminApi.purgeStudent(Number(purgeId))
      setActionResult({ type: 'success', message: `Élève #${purgeId} purgé définitivement.` })
      setPurgeId('')
      setPurgeWord('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setActionResult({ type: 'error', message: err.response?.data?.message ?? 'Erreur lors de la purge.' })
    } finally {
      setLoadingPurge(false)
    }
  }

  /* ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">Inscriptions</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Audit IA, intégrité financière et actions critiques sur les élèves</p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ══ 1. AUDIT PAR ÉCOLE ══════════════════════════════════════════════ */}
        <div>
          <SectionTitle>Audit par établissement</SectionTitle>

          {/* School picker */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={schoolId ?? ''}
              onChange={e => setSchoolId(e.target.value ? Number(e.target.value) : null)}
              className={cn(inputCls, 'pr-8 min-w-[280px]')}
            >
              <option value="">Sélectionner un établissement…</option>
              {schools?.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
              ))}
            </select>
            {schoolId && (
              <button
                onClick={() => { refetchWorker(); refetchFinance() }}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:border-zinc-300 transition-all"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          {!schoolId && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-400">Sélectionnez un établissement pour voir l'état du worker IA et l'intégrité financière.</p>
            </div>
          )}

          {schoolId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

              {/* Worker IA */}
              {loadingWorker
                ? <Sk className="h-40" />
                : workerHealth && (
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-zinc-400" />
                        <span className="text-xs font-medium text-zinc-500">Worker IA — Biométrie</span>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1',
                        workerHealth.pending > 0
                          ? 'bg-amber-50 text-amber-700 ring-amber-100'
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-100',
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', workerHealth.pending > 0 ? 'bg-amber-400' : 'bg-emerald-500')} />
                        {workerHealth.pending > 0 ? 'Retard détecté' : 'À jour'}
                      </span>
                    </div>
                    <p className={cn(
                      'text-4xl font-bold tabular-nums tracking-tight',
                      workerHealth.pending > 0 ? 'text-amber-600' : 'text-emerald-600',
                    )}>
                      {workerHealth.pending}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1.5">élève{workerHealth.pending > 1 ? 's' : ''} sans vecteur facial</p>

                    {workerHealth.details.length > 0 && (
                      <div className="mt-4 space-y-1.5 border-t border-zinc-50 pt-4">
                        {workerHealth.details.map((d) => (
                          <div key={d.status} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400 capitalize">{d.status.toLowerCase()}</span>
                            <span className="font-mono font-semibold text-zinc-700 tabular-nums">{d._count._all}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Intégrité financière */}
              {loadingFinance
                ? <Sk className="h-40" />
                : financeAudit && (
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className={financeAudit.count > 0 ? 'text-red-500' : 'text-zinc-400'} />
                        <span className="text-xs font-medium text-zinc-500">Intégrité financière</span>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ring-1',
                        financeAudit.count > 0
                          ? 'bg-red-50 text-red-700 ring-red-100'
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-100',
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', financeAudit.count > 0 ? 'bg-red-500' : 'bg-emerald-500')} />
                        {financeAudit.count > 0 ? 'Corruption détectée' : 'Validée'}
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <p className={cn(
                        'text-4xl font-bold tabular-nums tracking-tight',
                        financeAudit.count > 0 ? 'text-red-600' : 'text-emerald-600',
                      )}>
                        {financeAudit.count}
                      </p>
                      <p className="text-sm text-zinc-400 mb-1">/ {financeAudit.total} anomalie{financeAudit.count > 1 ? 's' : ''}</p>
                    </div>

                    {financeAudit.count > 0 && (
                      <div className="mt-4 border-t border-zinc-50 pt-4">
                        <p className="text-[11px] text-zinc-400 mb-2">IDs corrompus</p>
                        <div className="flex flex-wrap gap-1.5">
                          {financeAudit.ids.slice(0, 10).map(id => (
                            <span key={id} className="text-[10px] font-mono bg-red-50 text-red-600 ring-1 ring-red-100 px-1.5 py-0.5 rounded">
                              #{id}
                            </span>
                          ))}
                          {financeAudit.ids.length > 10 && (
                            <span className="text-[10px] text-zinc-400 self-center">+{financeAudit.ids.length - 10}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* ══ 2. DIAGNOSTIC ÉLÈVE ════════════════════════════════════════════ */}
        <div>
          <SectionTitle>Diagnostic élève</SectionTitle>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search size={13} className="text-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">Vérification signature cryptographique</span>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder="ID élève…"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && checkIntegrity()}
                className={cn(inputCls, 'w-44')}
              />
              <button
                onClick={checkIntegrity}
                disabled={!studentId || loadingIntegrity}
                className={btnPrimary}
              >
                {loadingIntegrity ? 'Vérification…' : 'Vérifier intégrité'}
              </button>
            </div>

            {integrityError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
                <AlertTriangle size={12} /> {integrityError}
              </div>
            )}

            {integrity && !integrityError && (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                {Object.entries(integrity).slice(0, 12).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 w-32 flex-shrink-0 truncate">{k}</span>
                    <span className="font-mono text-zinc-700 truncate">{String(v ?? '—')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ 3. ACTIONS CRITIQUES ═══════════════════════════════════════════ */}
        <div>
          <SectionTitle>Actions critiques</SectionTitle>

          <div className="flex items-center gap-2 mb-3 px-0.5">
            <p className="text-xs text-zinc-400">ID élève cible :</p>
            <input
              type="number"
              placeholder="ID élève…"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className={cn(inputCls, 'w-36')}
            />
            <span className="text-[11px] text-zinc-300">Partagé avec le diagnostic ci-dessus</span>
          </div>

          <ActionResult result={actionResult} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">

            {/* Verrouillage financier */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={13} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-600">Verrouillage financier</span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-4">Bloque ou restaure les paiements de l'élève.</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!studentId || loading === 'lock'}
                  onClick={() => runAction('lock', () => superAdminApi.toggleStudentLock(Number(studentId), true))}
                  className="h-9 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Lock size={11} />
                  {loading === 'lock' ? '…' : 'Verrouiller'}
                </button>
                <button
                  disabled={!studentId || loading === 'unlock'}
                  onClick={() => runAction('unlock', () => superAdminApi.toggleStudentLock(Number(studentId), false))}
                  className="h-9 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <LockOpen size={11} />
                  {loading === 'unlock' ? '…' : 'Débloquer'}
                </button>
              </div>
            </div>

            {/* Période de grâce */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-600">Période de grâce</span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3">Suspend les relances de paiement jusqu'à une date.</p>
              <input
                type="date"
                value={graceUntil}
                onChange={e => setGraceUntil(e.target.value)}
                className={cn(inputCls, 'w-full mb-3')}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!studentId || !graceUntil || loading === 'grace'}
                  onClick={() => runAction('grace', () => superAdminApi.setStudentGracePeriod(Number(studentId), graceUntil))}
                  className="h-9 flex items-center justify-center text-xs font-medium rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading === 'grace' ? '…' : 'Appliquer'}
                </button>
                <button
                  disabled={!studentId || loading === 'grace-clear'}
                  onClick={() => runAction('grace-clear', () => superAdminApi.setStudentGracePeriod(Number(studentId), null))}
                  className="h-9 flex items-center justify-center text-xs font-medium rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading === 'grace-clear' ? '…' : 'Lever'}
                </button>
              </div>
            </div>

            {/* Biométrie */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint size={13} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-600">Vecteur biométrique</span>
              </div>
              <p className="text-[11px] text-zinc-400 mb-4">
                Injection manuelle d'un vecteur facial (tableau float[]). Nécessite les données brutes d'un modèle FaceNet.
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                Disponible via l'API directe — <code className="font-mono text-zinc-600">PUT /enrollment/:id/biometrics</code>
              </span>
            </div>

          </div>
        </div>

        {/* ══ 3.5. CRÉER UN ÉLÈVE ════════════════════════════════════════════ */}
        <div>
          <SectionTitle>Créer un élève</SectionTitle>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={13} className="text-indigo-500" />
              <span className="text-xs font-medium text-zinc-500">Inscription manuelle d'un nouvel élève</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Prénom</label>
                <input
                  type="text"
                  placeholder="Jean"
                  value={createFirstName}
                  onChange={e => setCreateFirstName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Nom</label>
                <input
                  type="text"
                  placeholder="Dupont"
                  value={createLastName}
                  onChange={e => setCreateLastName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Établissement</label>
                <select
                  value={createSchoolId}
                  onChange={e => setCreateSchoolId(e.target.value)}
                  className={cn(inputCls, 'pr-8')}
                >
                  <option value="">Choisir…</option>
                  {schools?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              disabled={!createFirstName || !createLastName || !createSchoolId || creating}
              onClick={runCreateStudent}
              className="h-9 flex items-center gap-2 px-4 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {creating ? 'Création…' : <><UserPlus size={13} /> Créer l'élève</>}
            </button>
            <ActionResult result={createResult} />
          </div>
        </div>

        {/* ══ 4. ZONE DE DANGER — PURGE RGPD ════════════════════════════════ */}
        <div>
          <SectionTitle>Zone de danger</SectionTitle>
          <div className="bg-white rounded-xl border border-red-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={14} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700">Purge RGPD — Action irréversible</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Suppression physique complète de toutes les données de l'élève : profil, paiements, présences, biométrie, documents. Non récupérable.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className="text-[11px] text-zinc-400 mb-1.5">ID élève</p>
                <input
                  type="number"
                  placeholder="ID…"
                  value={purgeId}
                  onChange={e => setPurgeId(e.target.value)}
                  className={cn(inputCls, 'w-32 focus:ring-red-500/30 focus:border-red-400')}
                />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 mb-1.5">
                  Tapez <code className="font-mono font-bold text-red-600">PURGE</code> pour confirmer
                </p>
                <input
                  type="text"
                  placeholder="PURGE"
                  value={purgeWord}
                  onChange={e => setPurgeWord(e.target.value)}
                  className={cn(inputCls, 'w-32 font-mono focus:ring-red-500/30 focus:border-red-400')}
                />
              </div>
              <button
                disabled={!purgeId || purgeWord !== 'PURGE' || loadingPurge}
                onClick={runPurge}
                className="h-9 px-5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loadingPurge ? 'Purge en cours…' : 'Purger définitivement'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
