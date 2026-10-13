'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2 } from 'lucide-react'
import { networkApi } from '@/lib/network/network.api'
import { adminNetworkApi } from '@/lib/admin/network.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { useAuth } from '@/providers/auth-provider'
import type { UserRole } from '@/types/auth'
import { cn } from '@/lib/utils'

type Props = {
  studentId: number
  currentSchoolId?: number | null
  currentSchoolName?: string | null
}

function canTransferCampus(role?: UserRole | null): boolean {
  return (
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'PROMOTER' ||
    role === 'SUPER_ADMIN_NETWORK'
  )
}

export function StudentCampusTransferPanel({
  studentId,
  currentSchoolId,
  currentSchoolName,
}: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canWrite = canTransferCampus(user?.role)

  const { data: mySchools } = useQuery({
    queryKey: ['admin', 'network', 'my-schools'],
    queryFn: () => adminNetworkApi.getMySchools(),
    enabled: canWrite,
    staleTime: 60_000,
  })

  const campuses = useMemo(
    () =>
      (mySchools?.schools ?? []).filter(
        (s) => s.active && s.id !== currentSchoolId,
      ),
    [mySchools?.schools, currentSchoolId],
  )

  const [targetSchoolId, setTargetSchoolId] = useState<number | ''>('')
  const [targetClassId, setTargetClassId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: campusClasses, isFetching: loadingClasses } = useQuery({
    queryKey: ['network', 'campus-classes', targetSchoolId, mySchools?.networkId],
    queryFn: () =>
      networkApi.listCampusClasses(Number(targetSchoolId), mySchools?.networkId ?? undefined),
    enabled: canWrite && targetSchoolId !== '',
    staleTime: 30_000,
  })

  useEffect(() => {
    setTargetClassId('')
  }, [targetSchoolId])

  const mutation = useMutation({
    mutationFn: () =>
      networkApi.transferStudent(studentId, {
        targetSchoolId: Number(targetSchoolId),
        targetClassId: Number(targetClassId),
        reason: reason.trim() || undefined,
      }),
    onSuccess: async (res) => {
      toast.success(
        'Transfert inter-sites effectué',
        `${res.data.sourceSchoolName} → ${res.data.targetSchoolName} · ${res.data.targetClassName}`,
      )
      setConfirmOpen(false)
      setTargetSchoolId('')
      setTargetClassId('')
      setReason('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'enrollments', studentId] }),
      ])
    },
    onError: (err) => toast.error('Transfert impossible', getApiErrorMessage(err)),
  })

  if (!canWrite) return null
  if (!mySchools?.isNetworkPromoter && (mySchools?.schools.length ?? 0) < 2) {
    return null
  }
  if (campuses.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-sky-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
          <Building2 size={14} className="text-sky-600" />
          Transférer vers un autre campus
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Campus actuel :{' '}
          <span className="font-medium text-zinc-700">
            {currentSchoolName?.trim() ||
              (currentSchoolId ? `#${currentSchoolId}` : '—')}
          </span>
          {mySchools?.networkName ? (
            <span className="text-zinc-400"> · {mySchools.networkName}</span>
          ) : null}
        </p>
        <p className="text-[11px] text-amber-800/90 mt-1.5 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-1.5">
          Transfert définitif : inscription source archivée, dossier déplacé. Les paiements
          historiques restent inchangés (audit).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Campus cible
          </span>
          <select
            value={targetSchoolId === '' ? '' : String(targetSchoolId)}
            onChange={(e) =>
              setTargetSchoolId(e.target.value ? Number(e.target.value) : '')
            }
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">Sélectionner…</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Classe cible
          </span>
          <select
            value={targetClassId === '' ? '' : String(targetClassId)}
            onChange={(e) =>
              setTargetClassId(e.target.value ? Number(e.target.value) : '')
            }
            disabled={targetSchoolId === '' || loadingClasses}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
          >
            <option value="">
              {loadingClasses ? 'Chargement…' : 'Sélectionner…'}
            </option>
            {(campusClasses?.classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif (optionnel)"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />

      {!confirmOpen ? (
        <button
          type="button"
          disabled={targetSchoolId === '' || targetClassId === '' || mutation.isPending}
          onClick={() => setConfirmOpen(true)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold',
            'bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50',
          )}
        >
          Transférer vers un autre campus
        </button>
      ) : (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 space-y-2">
          <p className="text-xs text-rose-900">
            Confirmer le transfert définitif vers{' '}
            <strong>
              {campuses.find((c) => c.id === targetSchoolId)?.name ?? 'campus'}
            </strong>{' '}
            ?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
              Confirmer le transfert
            </button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
