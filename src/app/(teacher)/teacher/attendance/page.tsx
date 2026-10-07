'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, History, Keyboard, ScanBarcode } from 'lucide-react'
import {
  HardwareScanField,
  type HardwareScanFieldHandle,
} from '@/components/teacher/hardware-scan-field'
import { LiveGatePanel } from '@/components/teacher/live-gate-panel'
import {
  teacherAttendanceApi,
  type TeacherGateScanResult,
} from '@/lib/teacher/api/attendance.api'
import {
  enqueueGateScan,
  flushGateScanQueue,
  loadGateScanQueue,
} from '@/lib/teacher/gate-scan-queue'
import {
  getGateRosterMeta,
  syncGateRoster,
} from '@/lib/teacher/gate-roster'
import {
  GATE_TONE_CLASSES,
  playGateFeedbackTone,
  resolveGateFeedbackTone,
  type GateFeedbackTone,
} from '@/lib/teacher/gate-scan-feedback'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { requestGatePersistentStorage } from '@/lib/pwa/request-persistent-storage'
import { PwaInstallPrompt } from '@/components/pwa/install-prompt'
import { cn } from '@/lib/utils'

type Mode = 'hardware' | 'manual'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function FlashCard({
  scan,
  tone,
}: {
  scan: TeacherGateScanResult
  tone: GateFeedbackTone
}) {
  const styles = GATE_TONE_CLASSES[tone]
  return (
    <div
      key={`${scan.studentName}|${scan.outcome}|${scan.financeMessage}`}
      className={cn('rounded-2xl border-2 p-5 shadow-sm transition', styles.card)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
            tone === 'success' && 'bg-emerald-600',
            tone === 'warning' && 'bg-amber-500',
            tone === 'alert' && 'bg-rose-600',
          )}
        >
          {scan.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scan.photoUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            initials(scan.studentName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{scan.studentName}</p>
          {scan.className && (
            <p className="text-sm text-slate-500">{scan.className}</p>
          )}
        </div>
        {tone === 'alert' ? (
          <AlertTriangle className="h-6 w-6 shrink-0 text-rose-600" />
        ) : scan.alreadyPresent ? (
          <History className="h-6 w-6 shrink-0 text-amber-600" />
        ) : (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
        )}
      </div>
      <div className={cn('mt-4 rounded-xl px-3 py-2 text-sm font-semibold', styles.label)}>
        {scan.attendanceLabel}
        {scan.attendanceMessage ? ` — ${scan.attendanceMessage}` : ''}
      </div>
      {scan.financeDisplayed && scan.financeMessage ? (
        <p className={cn('mt-2 text-xs font-medium', styles.label)}>{scan.financeMessage}</p>
      ) : null}
    </div>
  )
}

export default function TeacherAttendancePage() {
  const [mode, setMode] = useState<Mode>('hardware')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<TeacherGateScanResult | null>(null)
  const [flashTone, setFlashTone] = useState<GateFeedbackTone | null>(null)
  const fieldRef = useRef<HardwareScanFieldHandle>(null)

  const [matricule, setMatricule] = useState('')
  const [name, setName] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [rosterCount, setRosterCount] = useState<number | null>(null)
  const [rosterSyncedAt, setRosterSyncedAt] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  const triggerFeedback = useCallback((tone: GateFeedbackTone) => {
    setFlashTone(tone)
    playGateFeedbackTone(tone)
    window.setTimeout(() => setFlashTone(null), 420)
  }, [])

  const refreshPending = useCallback(async () => {
    const queue = await loadGateScanQueue()
    setPendingCount(queue.length)
  }, [])

  const refreshRosterMeta = useCallback(async () => {
    const meta = await getGateRosterMeta()
    setRosterCount(meta?.count ?? null)
    setRosterSyncedAt(meta?.syncedAt ?? null)
  }, [])

  const runFlush = useCallback(async () => {
    try {
      const summary = await flushGateScanQueue()
      if (summary.last) {
        setLast(summary.last)
        triggerFeedback(resolveGateFeedbackTone(summary.last))
      }
    } catch {
      /* file conservée */
    } finally {
      await refreshPending()
      fieldRef.current?.focus()
    }
  }, [refreshPending, triggerFeedback])

  const runRosterSync = useCallback(async () => {
    await syncGateRoster()
    await refreshRosterMeta()
  }, [refreshRosterMeta])

  useEffect(() => {
    void requestGatePersistentStorage()
    void refreshPending()
    void refreshRosterMeta()
    void runRosterSync()
    void runFlush()

    const onOnline = () => {
      void runRosterSync()
      void runFlush()
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!navigator.onLine) return
      void runRosterSync()
      void runFlush()
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshPending, refreshRosterMeta, runFlush, runRosterSync])

  const handleScan = useCallback(
    async (payload: string) => {
      setError(null)
      try {
        const { optimistic } = await enqueueGateScan(payload)
        setLast(optimistic)
        triggerFeedback(resolveGateFeedbackTone(optimistic))
        void refreshPending()
        void runFlush()
      } catch (err) {
        const message =
          (err as { message?: string })?.message || 'Impossible de mettre le badge en file.'
        setError(message)
        triggerFeedback('alert')
      } finally {
        fieldRef.current?.focus()
      }
    },
    [refreshPending, runFlush, triggerFeedback],
  )

  const onManual = async (e: FormEvent) => {
    e.preventDefault()
    const m = matricule.trim()
    const n = name.trim()
    if (!m && n.length < 2) {
      setError('Indiquez un matricule ou un nom (2 caractères min.).')
      triggerFeedback('alert')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await teacherAttendanceApi.manual({
        matricule: m || undefined,
        name: n || undefined,
      })
      setLast(result)
      setMatricule('')
      setName('')
      triggerFeedback(resolveGateFeedbackTone(result))
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Impossible d'enregistrer le pointage manuel."
      setError(message)
      triggerFeedback('alert')
    } finally {
      setBusy(false)
    }
  }

  const lastTone = last ? resolveGateFeedbackTone(last, { error: Boolean(error) }) : 'success'

  return (
    <div className="relative mx-auto max-w-5xl space-y-6">
      {flashTone && (
        <div
          className={cn(
            'pointer-events-none fixed inset-0 z-40 transition-opacity duration-150',
            GATE_TONE_CLASSES[flashTone].flash,
          )}
          aria-hidden
        />
      )}

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScanBarcode className="h-6 w-6 text-teal-600" />
          Pointage
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          PWA installable · offline prolongé (IndexedDB) · sync auto à la reconnexion.
        </p>
        <div className="mt-2">
          <PwaInstallPrompt />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span
            className={cn(
              'font-medium',
              isOnline ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300',
            )}
          >
            {isOnline ? 'En ligne' : 'Hors ligne — pointage local actif'}
          </span>
          {rosterCount != null && (
            <span className="text-slate-500">
              Référentiel : {rosterCount} élève(s)
              {rosterSyncedAt
                ? ` · sync ${new Date(rosterSyncedAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {pendingCount} badge(s) en file — sync en attente
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                setMode('hardware')
                setError(null)
                window.setTimeout(() => fieldRef.current?.focus(), 40)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
                mode === 'hardware'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <ScanBarcode className="h-4 w-4" />
              Douchette / Badge
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manual')
                setError(null)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
                mode === 'manual'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              <Keyboard className="h-4 w-4" />
              Saisie manuelle
            </button>
          </div>

          {mode === 'hardware' ? (
            <div
              className={cn(
                'rounded-2xl border border-slate-200 bg-white p-5 transition dark:border-slate-800 dark:bg-slate-900',
                flashTone && `ring-2 ${GATE_TONE_CLASSES[flashTone].ring}`,
              )}
            >
              <HardwareScanField ref={fieldRef} busy={busy} onScan={handleScan} />
            </div>
          ) : (
            <form
              onSubmit={onManual}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">Matricule</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="Ex. ELEVE-2024-014"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">Nom (si pas de matricule)</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                Pointer l&apos;élève
              </button>
            </form>
          )}

          {busy && (
            <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-500" />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          {last ? (
            <FlashCard scan={last} tone={lastTone} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">
              {mode === 'hardware'
                ? 'En attente du prochain badge. Enchaînez les scans sans cliquer.'
                : 'Saisissez un matricule ou un nom pour enregistrer une présence.'}
            </div>
          )}
        </div>

        <LiveGatePanel compact />
      </div>
    </div>
  )
}
