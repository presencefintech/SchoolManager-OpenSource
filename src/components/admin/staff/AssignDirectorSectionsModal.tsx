'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, X, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { useSections } from '@/lib/hooks/use-admin'
import { directorsApi } from '@/lib/admin/api/directors.api'

type Props = {
  userId: number
  userName: string
  onClose: () => void
}

export function AssignDirectorSectionsModal({ userId, userName, onClose }: Props) {
  const qc = useQueryClient()
  const { data: sections = [], isLoading: loadingSections } = useSections()
  const assignedQuery = useQuery({
    queryKey: ['admin', 'directors', userId, 'sections'],
    queryFn: () => directorsApi.getAssignedSections(userId),
  })
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (assignedQuery.data && !hydrated) {
      setSelected(assignedQuery.data.map((r) => r.sectionId))
      setHydrated(true)
    }
  }, [assignedQuery.data, hydrated])

  const saveMut = useMutation({
    mutationFn: (sectionIds: number[]) =>
      directorsApi.assignSections(userId, sectionIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'directors', userId, 'sections'] })
      onClose()
    },
  })

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function onSave() {
    setError('')
    try {
      await saveMut.mutateAsync(selected)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const loading = loadingSections || assignedQuery.isLoading

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Sections du directeur</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-zinc-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-zinc-400">
              <Layers size={24} className="text-zinc-200" />
              Aucune section dans l’école. Créez-en via les inscriptions.
            </div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {sections.map((s) => {
                const checked = selected.includes(s.id)
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors',
                        checked
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-zinc-100 hover:bg-zinc-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-sm font-medium text-zinc-800">{s.name}</span>
                      {s.code && (
                        <span className="ml-auto text-[11px] text-zinc-400">{s.code}</span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saveMut.isPending || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium transition-colors"
            >
              {saveMut.isPending && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
