'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserX, RefreshCw, CheckCircle, XCircle,
  PenLine, UploadCloud, ShieldCheck, Clock, Wifi,
  WifiOff, ScanLine, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchools, usePresenceDashboard } from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'

/* ── helpers ────────────────────────────────────────────────────────────────── */
function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">{children}</p>
}

type ActionResult = { type: 'success' | 'error'; message: string } | null
function ResultBanner({ result }: { result: ActionResult }) {
  if (!result) return null
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm',
      result.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-red-200 bg-red-50 text-red-700',
    )}>
      {result.type === 'success' ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {result.message}
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

const inputCls = 'h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-zinc-300'
const btn = (color: 'zinc' | 'indigo' | 'emerald') => cn(
  'h-9 px-4 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all',
  color === 'zinc'    && 'bg-zinc-900 text-white hover:bg-zinc-700',
  color === 'indigo'  && 'bg-indigo-600 text-white hover:bg-indigo-700',
  color === 'emerald' && 'bg-emerald-600 text-white hover:bg-emerald-700',
)

const SCAN_METHODS = ['MANUAL', 'QR_CODE', 'NFC', 'FACE', 'FINGERPRINT']

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function PresencePage() {
  const { data: schools } = useSchools()
  const [schoolId, setSchoolId] = useState<number | null>(null)

  const { data: dashboard, isLoading, isError, error, refetch, dataUpdatedAt } = usePresenceDashboard(schoolId ?? 0)

  /* ── Enregistrement forcé ── */
  const [recStudentId, setRecStudentId] = useState('')
  const [recMethod, setRecMethod] = useState('MANUAL')
  const [recNote, setRecNote] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recResult, setRecResult] = useState<ActionResult>(null)

  /* ── Validation manuelle ── */
  const [valPresenceId, setValPresenceId] = useState('')
  const [valLoading, setValLoading] = useState(false)
  const [valResult, setValResult] = useState<ActionResult>(null)

  /* ── Sync offline ── */
  const [syncJson, setSyncJson] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<ActionResult>(null)
  const syncRef = useRef<HTMLTextAreaElement>(null)

  /* ── handlers ── */
  async function handleRecord() {
    if (!schoolId || !recStudentId) return
    setRecLoading(true); setRecResult(null)
    try {
      const r = await superAdminApi.recordPresence(schoolId, Number(recStudentId), { scanMethod: recMethod, note: recNote || undefined })
      setRecResult({ type: 'success', message: r.message ?? `Présence #${r.data?.id} enregistrée (score fraude: ${(r.data?.fraudScore ?? 0).toFixed(2)})` })
      refetch()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setRecResult({ type: 'error', message: err.response?.data?.message ?? 'Erreur lors de l\'enregistrement.' })
    } finally { setRecLoading(false) }
  }

  async function handleValidate() {
    if (!schoolId || !valPresenceId) return
    setValLoading(true); setValResult(null)
    try {
      const r = await superAdminApi.validatePresence(schoolId, Number(valPresenceId))
      setValResult({ type: 'success', message: r.message ?? `Présence #${valPresenceId} validée.` })
      refetch()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setValResult({ type: 'error', message: err.response?.data?.message ?? 'Présence introuvable ou déjà validée.' })
    } finally { setValLoading(false) }
  }

  async function handleSync() {
    if (!schoolId || !syncJson.trim()) return
    setSyncLoading(true); setSyncResult(null)
    try {
      const ops = JSON.parse(syncJson)
      if (!Array.isArray(ops)) throw new Error('Le JSON doit être un tableau d\'objets.')
      const r = await superAdminApi.bulkSyncPresence(schoolId, ops)
      const ok = r.data?.filter(x => x.status !== 'ERROR').length ?? 0
      const err = (r.data?.length ?? 0) - ok
      setSyncResult({ type: err === 0 ? 'success' : 'error', message: `${ok} enregistrés${err > 0 ? `, ${err} erreurs` : ''}.` })
      refetch()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setSyncResult({ type: 'error', message: err.response?.data?.message ?? err.message ?? 'Erreur de parsing ou d\'envoi.' })
    } finally { setSyncLoading(false) }
  }

  /* ── Computed ── */
  const total = dashboard ? dashboard.stats.presentCount + dashboard.stats.absentCount : 0
  const rate = total > 0 ? Math.round((dashboard!.stats.presentCount / total) * 100) : 0
  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null

  /* ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">Présence</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Dashboard live · enregistrement forcé · validation · sync offline</p>
          </div>
          {schoolId && (
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Actualisé à {lastRefresh}
                </span>
              )}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:border-zinc-300 transition-all disabled:opacity-40"
              >
                <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ══ SÉLECTEUR D'ÉCOLE ═══════════════════════════════════════════════ */}
        <div className="flex items-center gap-3">
          <select
            value={schoolId ?? ''}
            onChange={e => setSchoolId(e.target.value ? Number(e.target.value) : null)}
            className={cn(inputCls, 'min-w-[280px]')}
          >
            <option value="">Sélectionner un établissement…</option>
            {schools?.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
            ))}
          </select>
          {!schoolId && (
            <span className="text-xs text-zinc-400">Sélectionnez une école pour voir le dashboard live.</span>
          )}
        </div>

        {!schoolId && (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-16 text-center">
            <ScanLine size={32} className="mx-auto text-zinc-300 mb-4" />
            <p className="text-sm font-medium text-zinc-500 mb-1">Aucun établissement sélectionné</p>
            <p className="text-sm text-zinc-400">Choisissez une école dans la liste ci-dessus pour accéder au dashboard live.</p>
          </div>
        )}

        {schoolId && isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 flex items-start gap-4">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Impossible de charger le dashboard de présence</p>
              <p className="text-sm text-red-500 mt-0.5">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                  ?? 'Vérifiez que le backend tourne et que tu es connecté en tant que super admin.'}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium flex-shrink-0 transition-colors"
            >
              <RefreshCw size={13} />
              Réessayer
            </button>
          </div>
        )}

        {schoolId && !isError && (
          <>
            {/* ══ 1. STATS KPI ════════════════════════════════════════════════ */}
            <div className="grid grid-cols-3 gap-3">
              {isLoading ? (
                <><Sk className="h-24" /><Sk className="h-24" /><Sk className="h-24" /></>
              ) : dashboard ? (
                <>
                  {/* Présents */}
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={13} className="text-emerald-500" />
                      <span className="text-xs font-medium text-zinc-500">Présents aujourd'hui</span>
                    </div>
                    <p className="text-4xl font-bold tabular-nums text-emerald-600 tracking-tight">
                      {dashboard.stats.presentCount}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1.5">sur {total} élèves actifs</p>
                  </div>

                  {/* Absents */}
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <UserX size={13} className="text-red-500" />
                      <span className="text-xs font-medium text-zinc-500">Absents critiques</span>
                    </div>
                    <p className="text-4xl font-bold tabular-nums text-red-600 tracking-tight">
                      {dashboard.stats.absentCount}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1.5">non scannés</p>
                  </div>

                  {/* Taux */}
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck size={13} className={rate >= 80 ? 'text-emerald-500' : rate >= 60 ? 'text-amber-500' : 'text-red-500'} />
                      <span className="text-xs font-medium text-zinc-500">Taux de présence</span>
                    </div>
                    <p className={cn(
                      'text-4xl font-bold tabular-nums tracking-tight',
                      rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600',
                    )}>
                      {rate}%
                    </p>
                    {/* barre de progression */}
                    <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', rate >= 80 ? 'bg-emerald-400' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400')}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* ══ 2. RÉPARTITION CLASSES ══════════════════════════════════════ */}
            {dashboard && dashboard.classBreakdown.length > 0 && (
              <div>
                <SectionTitle>Répartition par classe</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {dashboard.classBreakdown.map(cls => (
                    <span
                      key={cls.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-medium text-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    >
                      {cls.name}
                      <span className="text-zinc-400 font-mono">{cls._count.students}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ══ 3. LIVE FEED + ABSENTS ══════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

              {/* Live feed */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
                  <div className="flex items-center gap-2">
                    <Wifi size={13} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-zinc-700">Flux live</span>
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full tabular-nums">
                      {dashboard?.liveFeed.length ?? 0} scans
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-300">Derniers 40 · ↻ 30s</span>
                </div>
                <div className="overflow-y-auto max-h-80 divide-y divide-zinc-50">
                  {isLoading ? (
                    <div className="p-5 space-y-3">
                      {[...Array(6)].map((_, i) => <Sk key={i} className="h-8" />)}
                    </div>
                  ) : !dashboard?.liveFeed.length ? (
                    <div className="p-8 text-center">
                      <WifiOff size={20} className="mx-auto text-zinc-300 mb-2" />
                      <p className="text-xs text-zinc-400">Aucun scan enregistré aujourd'hui.</p>
                    </div>
                  ) : (
                    dashboard.liveFeed.map(item => {
                      const name = `${item.student.firstName} ${item.student.lastName}`
                      const statusColor =
                        item.status === 'PRESENT' ? 'bg-emerald-400'
                        : item.status === 'LATE'   ? 'bg-amber-400'
                        : item.status === 'ABSENT'  ? 'bg-red-400'
                        : 'bg-zinc-300'
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusColor)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-800 truncate">{name}</p>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {item.student.class?.name ?? '—'}
                              {item.scanMethod ? ` · ${item.scanMethod}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.validated && (
                              <CheckCircle size={11} className="text-emerald-500" />
                            )}
                            <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                              {relativeTime(item.scannedAt)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Absents critiques */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-50">
                  <UserX size={13} className="text-red-400" />
                  <span className="text-xs font-semibold text-zinc-700">Absents critiques</span>
                  <span className="text-[10px] text-zinc-400 bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full tabular-nums">
                    {dashboard?.criticalAbsents.length ?? 0}
                  </span>
                </div>
                <div className="overflow-y-auto max-h-80 divide-y divide-zinc-50">
                  {isLoading ? (
                    <div className="p-5 space-y-3">
                      {[...Array(6)].map((_, i) => <Sk key={i} className="h-8" />)}
                    </div>
                  ) : !dashboard?.criticalAbsents.length ? (
                    <div className="p-8 text-center">
                      <CheckCircle size={20} className="mx-auto text-emerald-300 mb-2" />
                      <p className="text-xs text-zinc-400">Tous les élèves sont scannés !</p>
                    </div>
                  ) : (
                    dashboard.criticalAbsents.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                          <UserX size={11} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-800 truncate">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-[10px] text-zinc-400">{s.class?.name ?? 'Classe inconnue'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ══ 4. ACTIONS ADMIN ════════════════════════════════════════════ */}
            <div>
              <SectionTitle>Actions administrateur</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* ── Enregistrement forcé ── */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PenLine size={13} className="text-indigo-500" />
                    <span className="text-xs font-semibold text-zinc-700">Enregistrement forcé</span>
                  </div>
                  <div className="space-y-2.5 mb-4">
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1.5">ID élève</p>
                      <input
                        type="number"
                        placeholder="ex: 42"
                        value={recStudentId}
                        onChange={e => setRecStudentId(e.target.value)}
                        className={cn(inputCls, 'w-full')}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1.5">Méthode de scan</p>
                      <select
                        value={recMethod}
                        onChange={e => setRecMethod(e.target.value)}
                        className={cn(inputCls, 'w-full')}
                      >
                        {SCAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1.5">Note (optionnelle)</p>
                      <input
                        type="text"
                        placeholder="Raison…"
                        value={recNote}
                        onChange={e => setRecNote(e.target.value)}
                        className={cn(inputCls, 'w-full')}
                      />
                    </div>
                  </div>
                  <button
                    disabled={!recStudentId || recLoading}
                    onClick={handleRecord}
                    className={cn(btn('indigo'), 'w-full')}
                  >
                    {recLoading ? 'Enregistrement…' : 'Enregistrer la présence'}
                  </button>
                  {recResult && <div className="mt-3"><ResultBanner result={recResult} /></div>}
                </div>

                {/* ── Validation manuelle ── */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={13} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-zinc-700">Validation manuelle</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-4">
                    Valide manuellement une présence en quarantaine ou flagguée après anomalie détectée.
                  </p>
                  <div className="mb-4">
                    <p className="text-[11px] text-zinc-400 mb-1.5">ID présence</p>
                    <input
                      type="number"
                      placeholder="ex: 123"
                      value={valPresenceId}
                      onChange={e => setValPresenceId(e.target.value)}
                      className={cn(inputCls, 'w-full')}
                    />
                  </div>
                  <button
                    disabled={!valPresenceId || valLoading}
                    onClick={handleValidate}
                    className={cn(btn('emerald'), 'w-full')}
                  >
                    {valLoading ? 'Validation…' : 'Valider la présence'}
                  </button>
                  <div className="mt-3">
                    <p className="text-[11px] text-zinc-300">
                      L'ID est visible dans le flux live ci-dessus.
                    </p>
                  </div>
                  {valResult && <div className="mt-2"><ResultBanner result={valResult} /></div>}
                </div>

                {/* ── Sync offline ── */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <UploadCloud size={13} className="text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-700">Sync offline → online</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Collez un tableau JSON d'opérations collectées hors ligne.
                  </p>
                  <div className="mb-1.5">
                    <p className="text-[11px] text-zinc-400 mb-1.5">Payload JSON</p>
                    <textarea
                      ref={syncRef}
                      rows={5}
                      value={syncJson}
                      onChange={e => setSyncJson(e.target.value)}
                      placeholder={`[\n  { "studentId": 42, "scanMethod": "QR_CODE" },\n  { "studentId": 99, "scanMethod": "NFC" }\n]`}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none placeholder:text-zinc-300 transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-300">
                      <code className="bg-zinc-100 px-1 py-0.5 rounded">studentId</code> requis · <code className="bg-zinc-100 px-1 py-0.5 rounded">scannedAt</code> optionnel
                    </span>
                    {syncJson && (
                      <button
                        onClick={() => setSyncJson('')}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  <button
                    disabled={!syncJson.trim() || syncLoading}
                    onClick={handleSync}
                    className={cn(btn('zinc'), 'w-full flex items-center justify-center gap-2')}
                  >
                    <Clock size={12} />
                    {syncLoading ? 'Synchronisation…' : 'Lancer la sync'}
                  </button>
                  {syncResult && <div className="mt-3"><ResultBanner result={syncResult} /></div>}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
