'use client'

import { useMemo, useState } from 'react'
import { FileArchive, Loader2, Printer } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getApiErrorMessage } from '@/lib/api/client'
import { useSchoolModules, useUpdateSchoolModules } from '@/lib/hooks/use-super-admin'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'
import type { SchoolModuleItem } from '@/types/super-admin'

const BULLETIN_KEYS = ['bulletin_printing', 'bulletin_zip_export'] as const

const ICONS = {
  bulletin_printing: Printer,
  bulletin_zip_export: FileArchive,
} as const

/**
 * Interrupteurs SuperAdmin — impression bulletins & export ZIP.
 * Aliases UI : isBulletinPrintingEnabled / isZipExportEnabled.
 */
export function SchoolBulletinPermissionToggle({
  schoolId,
}: {
  schoolId: number
}) {
  const toast = useToast()
  const { data: board, isLoading } = useSchoolModules(schoolId)
  const mutation = useUpdateSchoolModules(schoolId)
  const [pending, setPending] = useState<SchoolModuleItem | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const items = useMemo(() => {
    const all = board?.items ?? []
    return BULLETIN_KEYS.map((key) => all.find((i) => i.key === key)).filter(
      (i): i is SchoolModuleItem => Boolean(i),
    )
  }, [board?.items])

  const printingOn = Boolean(
    board?.features?.bulletin_printing ??
      items.find((i) => i.key === 'bulletin_printing')?.enabled,
  )
  const zipOn = Boolean(
    board?.features?.bulletin_zip_export && printingOn,
  )

  async function persist(item: SchoolModuleItem, next: boolean, opts?: { reason?: string }) {
    try {
      await mutation.mutateAsync({
        features: { [item.key]: next },
        reason: opts?.reason,
        confirm: !next && item.critical ? true : undefined,
      })
      toast.success(
        next
          ? `${item.label} activé pour l’établissement`
          : `${item.label} désactivé pour l’établissement`,
      )
      setPending(null)
      setReason('')
      setError('')
    } catch (err) {
      const message = getApiErrorMessage(err)
      if (pending || opts?.reason) setError(message)
      else toast.error(message)
    }
  }

  function onToggle(item: SchoolModuleItem, next: boolean) {
    if (item.clamped && next) return
    if (item.key === 'bulletin_zip_export' && next && !printingOn) {
      toast.error('Activez d’abord l’impression des bulletins.')
      return
    }
    if (next) {
      void persist(item, true)
      return
    }
    setPending(item)
    setReason('')
    setError('')
  }

  if (isLoading || !board) {
    return (
      <p className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 size={14} className="animate-spin" /> Capacités bulletin…
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/40 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          Gouvernance bulletins EPST
        </h3>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Contrôle SuperAdmin — l’école ne peut pas réactiver ces modules seule.
        </p>
        <p className="mt-1.5 text-[11px] tabular-nums text-slate-600 dark:text-zinc-400">
          Impression :{' '}
          <strong className={printingOn ? 'text-emerald-700' : 'text-rose-700'}>
            {printingOn ? 'activée' : 'coupée'}
          </strong>
          {' · '}
          Export ZIP :{' '}
          <strong className={zipOn ? 'text-emerald-700' : 'text-rose-700'}>
            {zipOn ? 'activé' : 'coupé'}
          </strong>
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = ICONS[item.key as keyof typeof ICONS] ?? Printer
          const blocked = item.clamped
          return (
            <label
              key={item.key}
              className={cn(
                'flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 bg-white dark:bg-zinc-900',
                item.enabled
                  ? 'border-emerald-200 dark:border-emerald-900/50'
                  : 'border-zinc-200 dark:border-zinc-800',
                blocked && 'opacity-60',
              )}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Icon size={16} className="mt-0.5 text-[#1e3a5f] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{item.hint}</p>
                  {!item.enabled ? (
                    <p className="text-[11px] text-amber-700 mt-1">{item.impactOff}</p>
                  ) : null}
                </div>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-700 focus:ring-emerald-500"
                checked={item.enabled}
                disabled={mutation.isPending || blocked}
                onChange={(e) => onToggle(item, e.target.checked)}
                aria-label={item.label}
              />
            </label>
          )
        })}
      </div>

      <ConfirmDialog
        open={pending != null}
        title={`Couper « ${pending?.label ?? ''} » ?`}
        description={
          pending?.impactOff ??
          'Les administrateurs de l’école perdront immédiatement cet accès.'
        }
        impact={[
          'Effet immédiat sur le tableau de bord de l’école',
          'Réactivation réservée au SuperAdmin',
        ]}
        confirmLabel="Confirmer la coupure"
        variant="danger"
        loading={mutation.isPending}
        reasonLabel="Motif (obligatoire)"
        reason={reason}
        onReasonChange={setReason}
        confirmDisabled={reason.trim().length < 10}
        onConfirm={() => {
          if (!pending) return
          void persist(pending, false, { reason: reason.trim() })
        }}
        onCancel={() => {
          setPending(null)
          setReason('')
          setError('')
        }}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}
