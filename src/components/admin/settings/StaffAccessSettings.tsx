'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Shield } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { schoolsApi, type StaffAccessPolicy, type StaffAccessCatalogItem } from '@/lib/admin/api/schools.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<keyof StaffAccessPolicy, string> = {
  IT: 'IT / Secrétariat',
  DIRECTOR: 'Directeur',
  TEACHER: 'Enseignant',
}

const ROLE_HINTS: Record<keyof StaffAccessPolicy, string> = {
  IT: 'Guichet inscriptions — souvent sans ledger',
  DIRECTOR: 'Pilotage pédagogique',
  TEACHER: 'Classe uniquement',
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-3 py-2.5',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        {hint && <p className="text-[11px] text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
      />
    </label>
  )
}

export function StaffAccessSettings() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'schools', 'staff-access'],
    queryFn: schoolsApi.getStaffAccess,
    staleTime: 30_000,
  })

  const [draft, setDraft] = useState<StaffAccessPolicy | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data?.policy && !dirty) setDraft(data.policy)
  }, [data, dirty])

  const catalog = useMemo(() => {
    const map = new Map<string, StaffAccessCatalogItem>()
    for (const item of data?.catalog ?? []) map.set(item.key, item)
    return map
  }, [data])

  const save = useMutation({
    mutationFn: (policy: StaffAccessPolicy) => schoolsApi.updateStaffAccess(policy),
    onSuccess: (res) => {
      setDraft(res.policy)
      setDirty(false)
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access', 'me'] })
      toast.success('Accès staff', 'Capacités enregistrées pour cet établissement.')
    },
    onError: (err) => toast.error('Accès staff', getApiErrorMessage(err)),
  })

  if (isLoading || !draft) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  const roles = (data?.configurableRoles ?? ['IT', 'DIRECTOR', 'TEACHER']) as (keyof StaffAccessPolicy)[]

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start gap-3">
        <Shield size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Accès staff (capacités)</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Comme un ERP : vous donnez des capacités (voir montants, exporter, contacts…),
            le serveur masque le reste. Admin et Finance voient toujours tout.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
        {roles.map((role) => (
          <div key={role} className="p-5">
            <p className="text-sm font-semibold text-zinc-900">{ROLE_LABELS[role]}</p>
            <p className="text-[11px] text-zinc-400 mb-3">{ROLE_HINTS[role]}</p>
            <div className="divide-y divide-zinc-50">
              {(
                [
                  'seeFinanceAmounts',
                  'seePaymentHistory',
                  'seeParentContacts',
                  'exportLists',
                  'accessFinanceRead',
                  'manageEnrollments',
                ] as const
              ).map((key) => {
                const meta = catalog.get(key)
                const amountsOff = key === 'seePaymentHistory' && !draft[role].seeFinanceAmounts
                return (
                  <Toggle
                    key={key}
                    label={meta?.label ?? key}
                    hint={
                      amountsOff
                        ? 'Nécessite « Voir les montants »'
                        : meta?.hint
                    }
                    checked={draft[role][key]}
                    disabled={amountsOff}
                    onChange={(v) => {
                      setDirty(true)
                      setDraft((prev) => {
                        if (!prev) return prev
                        const nextRole = { ...prev[role], [key]: v }
                        if (key === 'seeFinanceAmounts' && !v) {
                          nextRole.seePaymentHistory = false
                        }
                        return { ...prev, [role]: nextRole }
                      })
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 flex items-center justify-end gap-2 bg-zinc-50 border-t border-zinc-100">
        {dirty && (
          <button
            type="button"
            onClick={() => {
              if (data?.policy) {
                setDraft(data.policy)
                setDirty(false)
              }
            }}
            className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() => draft && save.mutate(draft)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save size={14} />
          {save.isPending ? 'Enregistrement…' : 'Enregistrer les accès'}
        </button>
      </div>
    </div>
  )
}
