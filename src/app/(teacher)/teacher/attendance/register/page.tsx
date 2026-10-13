'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ClipboardList, Ticket } from 'lucide-react'
import { BulkPresenceGrid } from '@/components/admin/presences/BulkPresenceGrid'
import { useRouter } from 'next/navigation'
import { presencesApi } from '@/lib/admin/api/presences.api'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'

/**
 * Registre quotidien enseignant — grille Présent / Retard / Absent / Excusé / Tenue.
 * Réutilise le cahier admin (même contrat bulk + motifs).
 * Un billet d'entrée scanné justifie automatiquement l'absence/retard du jour.
 */
export default function TeacherAttendanceRegisterPage() {
  const router = useRouter()
  const toast = useToast()
  const [passCode, setPassCode] = useState('')
  const [busy, setBusy] = useState(false)

  const onRedeem = async (e: FormEvent) => {
    e.preventDefault()
    if (!passCode.trim()) return
    setBusy(true)
    try {
      const res = await presencesApi.useGatePass(passCode.trim())
      toast.success(res.message ?? 'Billet validé — présence justifiée (Excusé).')
      setPassCode('')
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/teacher/attendance"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour pointage portail
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            Registre quotidien
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Grille de classe — Présent, Retard, Absent, Excusé, Tenue non conforme.
          </p>
        </div>
      </div>

      <form
        onSubmit={onRedeem}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-teal-100 bg-teal-50/60 p-3"
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-teal-900">
            <Ticket className="h-3.5 w-3.5" />
            Billet Préfet (justifie absence / retard)
          </label>
          <input
            value={passCode}
            onChange={(e) => setPassCode(e.target.value.toUpperCase())}
            placeholder="Scanner ou saisir BP-…"
            className="w-full rounded-xl border border-teal-200 bg-white px-3 py-2 font-mono text-sm uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !passCode.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          Valider billet
        </button>
      </form>

      <BulkPresenceGrid onClose={() => router.push('/teacher/attendance')} />
    </div>
  )
}
