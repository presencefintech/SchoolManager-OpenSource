'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, KeyRound, Search, Users } from 'lucide-react'
import { useCoreUsersSuperAdmin, useRegeneratePasswordSuperAdmin } from '@/lib/hooks/use-super-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { getApiErrorMessage } from '@/lib/api/client'
import type { RegeneratePasswordResult } from '@/types/super-admin'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TempPasswordRevealModal } from '@/components/ui/temp-password-reveal-modal'

const PAGE_SIZE = 20

const ROLE_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'DIRECTOR', label: 'Directeur' },
  { value: 'IT', label: 'IT / Guichet' },
  { value: 'PARENT', label: 'Parent' },
]

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-indigo-50 text-indigo-700',
  FINANCE: 'bg-amber-50 text-amber-700',
  TEACHER: 'bg-emerald-50 text-emerald-700',
  DIRECTOR: 'bg-violet-50 text-violet-700',
  IT: 'bg-sky-50 text-sky-700',
  PARENT: 'bg-zinc-100 text-zinc-500',
  SUPER_ADMIN: 'bg-red-50 text-red-600',
}

export default function AccountsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, role])

  const { data, isPending, isError, refetch, isFetching } = useCoreUsersSuperAdmin({
    page,
    take: PAGE_SIZE,
    role: role || undefined,
    q: debouncedSearch || undefined,
  })
  const regenerateMutation = useRegeneratePasswordSuperAdmin()

  const users = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const loading = useQueryLoading(isPending && !data)

  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null)
  const [resetError, setResetError] = useState('')
  const [resetResult, setResetResult] = useState<RegeneratePasswordResult | null>(null)

  async function confirmReset() {
    if (!resetTarget) return
    setResetError('')
    try {
      const result = await regenerateMutation.mutateAsync(resetTarget.id)
      setResetTarget(null)
      setResetResult(result)
    } catch (err) {
      setResetError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Comptes</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {loading ? '—' : `${total} compte${total > 1 ? 's' : ''} sur la plateforme`}
          </p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Nom, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-zinc-200 w-64"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-sm text-zinc-600 bg-white border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          >
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {isError && !loading && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
            <span>Impossible de charger les comptes.</span>
            <button type="button" onClick={() => refetch()} className="font-medium underline">Réessayer</button>
          </div>
        )}

        <div className={cn('bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden transition-opacity', isFetching && !loading && 'opacity-70')}>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          ) : users.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Nom</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Rôle</th>
                    <th className="px-6 py-3 text-left">École</th>
                    <th className="px-6 py-3 text-left">Créé le</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-3 font-medium text-zinc-800">{u.firstName} {u.lastName}</td>
                      <td className="px-6 py-3 text-zinc-600 text-xs">{u.email}</td>
                      <td className="px-6 py-3">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ROLE_COLORS[u.role] ?? 'bg-zinc-100 text-zinc-500')}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-600 text-xs">{u.school?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          title="Régénérer le mot de passe"
                          onClick={() => setResetTarget({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() })}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <KeyRound size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400">
              <Users size={28} className="text-zinc-200" />
              Aucun compte trouvé
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-zinc-400">Page {page} sur {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={resetTarget != null}
        title="Régénérer le mot de passe ?"
        description={
          resetTarget
            ? `Un nouveau mot de passe temporaire sera généré pour ${resetTarget.name}. Toutes ses sessions actives seront déconnectées.`
            : ''
        }
        impact={resetError ? [resetError] : []}
        confirmLabel="Régénérer"
        loading={regenerateMutation.isPending}
        onConfirm={confirmReset}
        onCancel={() => { setResetTarget(null); setResetError('') }}
      />

      {resetResult && (
        <TempPasswordRevealModal
          open
          userName={`${resetResult.user.firstName} ${resetResult.user.lastName}`.trim()}
          tempPassword={resetResult.tempPassword}
          onClose={() => setResetResult(null)}
        />
      )}
    </div>
  )
}
