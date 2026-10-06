'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Contact, Plus, RefreshCw } from 'lucide-react'
import { studentsApi, type StudentGuardian } from '@/lib/admin/api/students.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'

type Props = { studentId: number }

export function StudentGuardiansPanel({ studentId }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    relationship: 'PARENT',
    isPrimary: false,
  })

  const query = useQuery({
    queryKey: ['admin', 'students', studentId, 'guardians'],
    queryFn: () => studentsApi.listGuardians(studentId),
    enabled: studentId > 0,
    staleTime: 30_000,
  })

  const upsert = useMutation({
    mutationFn: () =>
      studentsApi.upsertGuardian(studentId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship,
        isPrimary: form.isPrimary,
      }),
    onSuccess: async () => {
      toast.success('Contact enregistré')
      setOpen(false)
      setForm({ firstName: '', lastName: '', phone: '', relationship: 'PARENT', isPrimary: false })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students', studentId, 'guardians'] })
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })

  const guardians = (query.data ?? []) as StudentGuardian[]

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
          <Contact size={14} className="text-emerald-600" />
          Tuteurs / contacts
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-50"
          >
            <RefreshCw size={13} className={query.isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-zinc-400">Chargement…</p>
      ) : guardians.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun tuteur enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {guardians.map((g, idx) => (
            <li
              key={g.id ?? `${g.phone}-${idx}`}
              className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm"
            >
              <p className="font-medium text-zinc-800">
                {g.firstName} {g.lastName}
                {g.isPrimary && (
                  <span className="ml-2 text-[10px] font-semibold uppercase text-emerald-700">
                    Principal
                  </span>
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {g.phone}
                {g.relationship ? ` · ${g.relationship}` : ''}
                {g.email ? ` · ${g.email}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="border-t border-zinc-100 pt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-lg border border-zinc-200 px-2.5 py-2 text-sm"
            placeholder="Prénom"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          />
          <input
            className="rounded-lg border border-zinc-200 px-2.5 py-2 text-sm"
            placeholder="Nom"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
          <input
            className="rounded-lg border border-zinc-200 px-2.5 py-2 text-sm"
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="rounded-lg border border-zinc-200 px-2.5 py-2 text-sm"
            placeholder="Lien (PARENT, TUTEUR…)"
            value={form.relationship}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
          />
          <label className="sm:col-span-2 flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
            />
            Contact principal
          </label>
          <button
            type="button"
            disabled={upsert.isPending || !form.firstName || !form.lastName || !form.phone}
            onClick={() => upsert.mutate()}
            className="sm:col-span-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enregistrer le contact
          </button>
        </div>
      )}
    </div>
  )
}
