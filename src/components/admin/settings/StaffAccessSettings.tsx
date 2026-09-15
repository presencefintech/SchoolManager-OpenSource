'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, RotateCcw, Save, Shield } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  schoolsApi,
  type StaffAccessCatalogItem,
  type StaffAccessPolicy,
  type StaffRoleCapabilities,
} from '@/lib/admin/api/schools.api'
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

const FALLBACK_KEYS: (keyof StaffRoleCapabilities)[] = [
  'accessFinanceRead',
  'seeFinanceAmounts',
  'seePaymentHistory',
  'attributeFees',
  'seeParentContacts',
  'manageEnrollments',
  'inviteParents',
  'exportLists',
  'importData',
  'composeAnnouncements',
  'publishAnnouncements',
  'manageStructure',
  'viewReports',
]

function capDisabled(key: keyof StaffRoleCapabilities, caps: StaffRoleCapabilities): string | null {
  if (key === 'seePaymentHistory' && !caps.seeFinanceAmounts) return 'Nécessite « Voir les montants »'
  if ((key === 'seeFinanceAmounts' || key === 'attributeFees') && !caps.accessFinanceRead) {
    return 'Nécessite « Lecture finance »'
  }
  if (key === 'publishAnnouncements' && !caps.composeAnnouncements) return 'Nécessite « Rédiger les communiqués »'
  return null
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  source,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  source?: string
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
        <p className="text-sm font-medium text-zinc-800">
          {label}
          {source === 'grant' && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase text-emerald-600">accordé</span>
          )}
          {source === 'deny' && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase text-red-500">refusé</span>
          )}
        </p>
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
    queryKey: ['admin', 'schools', 'staff-access', 'overview'],
    queryFn: schoolsApi.getStaffAccessOverview,
    staleTime: 30_000,
  })

  const [draft, setDraft] = useState<StaffAccessPolicy | null>(null)
  const [dirty, setDirty] = useState(false)
  const [openMember, setOpenMember] = useState<number | null>(null)

  useEffect(() => {
    if (data?.policy && !dirty) setDraft(data.policy)
  }, [data, dirty])

  const catalog = useMemo(() => {
    const map = new Map<string, StaffAccessCatalogItem>()
    for (const item of data?.catalog ?? []) map.set(item.key, item)
    return map
  }, [data])

  const capKeys = useMemo(() => {
    const fromApi = (data?.catalog ?? []).map((c) => c.key)
    return fromApi.length > 0 ? fromApi : FALLBACK_KEYS
  }, [data])

  const save = useMutation({
    mutationFn: (policy: StaffAccessPolicy) => schoolsApi.updateStaffAccess(policy),
    onSuccess: (res) => {
      setDraft(res.policy)
      setDirty(false)
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access'] })
      toast.success('Accès staff', 'Capacités enregistrées pour cet établissement.')
    },
    onError: (err) => toast.error('Accès staff', getApiErrorMessage(err)),
  })

  const patchMember = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number
      payload: Partial<StaffRoleCapabilities> | { reset: true }
    }) => schoolsApi.updateMemberStaffAccess(userId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access'] })
      toast.success('Accès du membre', 'Cases mises à jour.')
    },
    onError: (err) => toast.error('Accès du membre', getApiErrorMessage(err)),
  })

  if (isLoading || !draft) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  const roles = (data?.configurableRoles ?? ['IT', 'DIRECTOR', 'TEACHER']) as (keyof StaffAccessPolicy)[]
  const disabledModules = (data?.schoolModules?.items ?? []).filter((i) => i.enabled === false)
  const members = (data?.members ?? []).filter((m) => m.role !== 'ADMIN')

  return (
    <div className="space-y-4">
      {disabledModules.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Presence HQ a coupé {disabledModules.length} module
          {disabledModules.length > 1 ? 's' : ''} pour cet établissement :{' '}
          {disabledModules.map((m) => m.label).join(', ')}.
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-start gap-3">
          <Shield size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Accès staff (capacités)</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Défauts par rôle, puis exceptions par personne. Admin et Finance restent verrouillés.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
          {roles.map((role) => (
            <div key={role} className="p-5">
              <p className="text-sm font-semibold text-zinc-900">{ROLE_LABELS[role]}</p>
              <p className="text-[11px] text-zinc-400 mb-3">{ROLE_HINTS[role]}</p>
              <div className="divide-y divide-zinc-50">
                {capKeys.map((key) => {
                  const meta = catalog.get(key)
                  const blocked = capDisabled(key, draft[role])
                  return (
                    <Toggle
                      key={key}
                      label={meta?.label ?? key}
                      hint={blocked ?? meta?.hint}
                      checked={Boolean(draft[role][key])}
                      disabled={Boolean(blocked)}
                      onChange={(v) => {
                        setDirty(true)
                        setDraft((prev) => {
                          if (!prev) return prev
                          const nextRole = { ...prev[role], [key]: v }
                          if (key === 'seeFinanceAmounts' && !v) nextRole.seePaymentHistory = false
                          if (key === 'accessFinanceRead' && !v) {
                            nextRole.seeFinanceAmounts = false
                            nextRole.seePaymentHistory = false
                            nextRole.attributeFees = false
                          }
                          if (key === 'composeAnnouncements' && !v) nextRole.publishAnnouncements = false
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

      {members.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Exceptions par personne</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Accorder ou retirer une case à un membre, sans changer le rôle de toute l’école.
            </p>
          </div>
          <div className="divide-y divide-zinc-100">
            {members.map((member) => {
              const open = openMember === member.id
              return (
                <div key={member.id}>
                  <div className="flex items-center justify-between gap-3 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenMember(open ? null : member.id)}
                      className="text-left min-w-0"
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {member.role}
                        {member.access.customized ? ' · personnalisé' : ' · défaut école'}
                        {member.account?.state && member.account.state !== 'active'
                          ? ` · ${member.account.state}`
                          : ''}
                      </p>
                    </button>
                    {member.access.customized && (
                      <button
                        type="button"
                        disabled={patchMember.isPending}
                        onClick={() => patchMember.mutate({ userId: member.id, payload: { reset: true } })}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                      >
                        <RotateCcw size={12} />
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                      {member.access.items.map((item) => (
                        <Toggle
                          key={item.key}
                          label={item.label}
                          hint={item.hint}
                          checked={item.enabled}
                          disabled={item.source === 'locked'}
                          source={item.source}
                          onChange={(v) =>
                            patchMember.mutate({
                              userId: member.id,
                              payload: { [item.key]: v },
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
