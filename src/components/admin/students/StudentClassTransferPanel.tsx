'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { studentsApi } from '@/lib/admin/api/students.api'
import { useClasses } from '@/lib/hooks/admin/classes'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { useAuth } from '@/providers/auth-provider'
import type { UserRole } from '@/types/auth'
import { cn } from '@/lib/utils'

type Props = {
  studentId: number
  currentClassId?: number | null
  currentClassName?: string | null
}

function canTransfer(role?: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DIRECTOR'
}

export function StudentClassTransferPanel({
  studentId,
  currentClassId,
  currentClassName,
}: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canWrite = canTransfer(user?.role)
  const { data: classesData } = useClasses({ isActive: true })
  const classes = useMemo(
    () => (classesData ?? []).filter((c) => c.id !== currentClassId),
    [classesData, currentClassId],
  )

  const [targetClassId, setTargetClassId] = useState<number | ''>('')
  const [mode, setMode] = useState<'TRANSFER' | 'CORRECTION'>('TRANSFER')
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      studentsApi.transferClass(studentId, {
        newClassId: Number(targetClassId),
        mode,
        reason: reason.trim() || undefined,
      }),
    onSuccess: async (res) => {
      toast.success(
        mode === 'CORRECTION' ? 'Classe corrigée' : 'Transfert effectué',
        res.message ?? 'Affectation mise à jour',
      )
      setTargetClassId('')
      setReason('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'enrollments', studentId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] }),
      ])
    },
    onError: (err) => toast.error('Transfert impossible', getApiErrorMessage(err)),
  })

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
          <ArrowRightLeft size={14} className="text-indigo-600" />
          Transférer de classe
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Classe actuelle :{' '}
          <span className="font-medium text-zinc-700">
            {currentClassName?.trim() || (currentClassId ? `#${currentClassId}` : 'Non affecté')}
          </span>
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Classe cible</label>
          <select
            value={targetClassId === '' ? '' : String(targetClassId)}
            onChange={(e) =>
              setTargetClassId(e.target.value ? Number(e.target.value) : '')
            }
            disabled={!canWrite || mutation.isPending}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">Choisir une classe…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayLabel ?? c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Type d&apos;opération</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'TRANSFER' | 'CORRECTION')}
            disabled={!canWrite || mutation.isPending}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="TRANSFER">Transfert (mouvement tracé)</option>
            <option value="CORRECTION">Correction d&apos;inscription</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Motif (optionnel)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            mode === 'CORRECTION'
              ? 'Ex. erreur de saisie à l’inscription'
              : 'Ex. réorientation en cours d’année'
          }
          disabled={!canWrite || mutation.isPending}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        disabled={!canWrite || !targetClassId || mutation.isPending}
        onClick={() => void mutation.mutateAsync()}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold',
          canWrite
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
            : 'bg-zinc-100 text-zinc-400 cursor-not-allowed',
        )}
      >
        {mutation.isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <ArrowRightLeft size={13} />
        )}
        {mode === 'CORRECTION' ? 'Corriger la classe' : 'Transférer'}
      </button>
    </div>
  )
}
