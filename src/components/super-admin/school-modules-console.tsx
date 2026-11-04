'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getApiErrorMessage } from '@/lib/api/client'
import { useSchoolModules, useUpdateSchoolModules } from '@/lib/hooks/use-super-admin'
import { useToast } from '@/providers/toast-provider'
import type { SchoolModuleItem } from '@/types/super-admin'

const FALLBACK_GROUPS = [
  { id: 'acces', label: 'Accès' },
  { id: 'pedagogie', label: 'Pédagogie' },
  { id: 'donnees', label: 'Données' },
  { id: 'communication', label: 'Communication' },
  { id: 'finance', label: 'Finance' },
  { id: 'identite', label: 'Identité' },
]

export function SchoolModulesConsole({
  schoolId,
  compact = false,
}: {
  schoolId: number
  compact?: boolean
}) {
  const toast = useToast()
  const { data: board, isLoading } = useSchoolModules(schoolId)
  const mutation = useUpdateSchoolModules(schoolId)
  const [pending, setPending] = useState<SchoolModuleItem | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const groups = board?.groups?.length ? board.groups : FALLBACK_GROUPS
  const itemsByGroup = useMemo(() => {
    const items = board?.items ?? []
    return groups
      .map((group) => ({
        ...group,
        items: items.filter((item) => item.group === group.id),
      }))
      .filter((group) => group.items.length > 0)
  }, [board?.items, groups])

  async function persist(item: SchoolModuleItem, next: boolean, opts?: { reason?: string }) {
    try {
      await mutation.mutateAsync({
        features: { [item.key]: next },
        reason: opts?.reason,
        confirm: !next && item.critical ? true : undefined,
      })
      toast.success(next ? `${item.label} réactivé` : `${item.label} coupé`)
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
        <Loader2 size={14} className="animate-spin" /> Chargement des modules…
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={cn('font-semibold', compact ? 'text-xs uppercase tracking-wide text-zinc-400' : 'text-sm')}>
            Modules sensibles
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Coupure Superadmin — l’admin de l’école ne peut pas les réactiver.
            {board.disabledCount > 0 ? ` ${board.disabledCount} coupé${board.disabledCount > 1 ? 's' : ''}.` : ''}
          </p>
        </div>
      </div>

      {itemsByGroup.map((group) => (
        <section key={group.id} className="space-y-2">
          {!compact && <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{group.label}</p>}
          <div className={cn(compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2')}>
            {group.items.map((item) => {
              const blocked = item.clamped
              return (
                <label
                  key={item.key}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5',
                    item.enabled
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                      : 'border-zinc-200 dark:border-zinc-800',
                    blocked && 'opacity-60',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item.label}
                      {item.critical && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-red-600">critique</span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {blocked ? 'Nécessite un module parent (app mobile).' : item.hint}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-indigo-600"
                    checked={item.enabled}
                    disabled={mutation.isPending || blocked}
                    onChange={(e) => onToggle(item, e.target.checked)}
                  />
                </label>
              )
            })}
          </div>
        </section>
      ))}

      {board.lastChange && (
        <p className="text-[11px] text-zinc-500">
          Dernier changement
          {board.lastChange.actorName ? ` par ${board.lastChange.actorName}` : ''}
          {' · '}
          {new Date(board.lastChange.at).toLocaleString('fr-FR')}
          {board.lastChange.reason ? ` — ${board.lastChange.reason}` : ''}
        </p>
      )}

      <ConfirmDialog
        open={pending != null}
        title={pending ? `Couper « ${pending.label} » ?` : 'Couper ce module ?'}
        description={pending?.impactOff ?? ''}
        impact={[
          ...(pending?.critical ? ['Module critique : confirmation obligatoire.'] : []),
          ...(error ? [error] : []),
        ]}
        variant="danger"
        confirmLabel="Couper le module"
        reasonLabel="Motif"
        reasonPlaceholder="Ex. impayé, incident, demande du promoteur…"
        reason={reason}
        onReasonChange={setReason}
        confirmDisabled={reason.trim().length < 10}
        loading={mutation.isPending}
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
    </div>
  )
}
