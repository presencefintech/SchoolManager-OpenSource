'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlarmClock, Mail, Phone, ShieldAlert, UserMinus, UserPlus } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi, type PickupAdult, type SchoolContact } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, ErrorState, ListSkeleton, NoStudent, PageHeader, Spinner, StudentSwitcher } from '@/components/parent/ui'

/** Cercle de l'école : annuaire, SOS, absence/retard et adultes autorisés à la sortie. */
export default function SchoolCirclePage() {
  const { studentId } = useSelectedStudent()
  const queryClient = useQueryClient()
  const circle = useQuery({ queryKey: parentKeys.schoolCircle, queryFn: parentApi.schoolCircle })
  const [feedback, setFeedback] = useState('')
  const [reason, setReason] = useState('')
  const [adult, setAdult] = useState({ lastName: '', firstName: '', phone: '', relationship: '' })

  const done = (res: { headline?: string }, fallback: string) => {
    setFeedback(res?.headline ?? fallback)
    void queryClient.invalidateQueries({ queryKey: parentKeys.schoolCircle })
  }

  const absence = useMutation({
    mutationFn: () => parentApi.absenceNotice(studentId as number, { reason: reason.trim() }),
    onSuccess: (r) => {
      setReason('')
      done(r, "L'école est prévenue de l'absence.")
    },
  })
  const late = useMutation({
    mutationFn: () => parentApi.lateNotice(studentId as number),
    onSuccess: (r) => done(r, "L'école est prévenue du retard."),
  })
  const addAdult = useMutation({
    mutationFn: () => parentApi.addPickupAdult(studentId as number, adult),
    onSuccess: (r) => {
      setAdult({ lastName: '', firstName: '', phone: '', relationship: '' })
      done(r, 'Cette personne est autorisée à la sortie.')
    },
  })
  const revoke = useMutation({
    mutationFn: (adultId: number) => parentApi.revokePickupAdult(studentId as number, adultId),
    onSuccess: (r) => done(r, "Cette personne n'est plus autorisée."),
  })

  if (studentId == null) return <NoStudent />
  if (circle.isLoading) return <ListSkeleton />
  if (circle.isError || !circle.data) return <ErrorState onRetry={() => void circle.refetch()} />

  const data = circle.data
  const contacts: SchoolContact[] = data.direction ?? data.staff ?? []
  const child = (data.children ?? data.students ?? []).find((c) => (c.id ?? c.studentId) === studentId)
  const adults: PickupAdult[] = child?.adults ?? []
  const error = [absence, late, addAdult, revoke].find((m) => m.isError)?.error
  const field = 'w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-base sm:text-sm'

  return (
    <div className="space-y-5">
      <PageHeader title="Cercle de l'école" subtitle={data.school?.name} />
      <StudentSwitcher />

      {data.sos?.phone && (
        <a
          href={`tel:${data.sos.phone}`}
          className="flex items-center gap-3 rounded-2xl bg-red-600 p-4 font-medium text-white"
        >
          <ShieldAlert className="h-5 w-5" /> {data.sos.label ?? 'Appeler l’école (urgence)'}
        </a>
      )}

      {feedback && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {feedback}
        </p>
      )}
      {error != null && (
        <p role="alert" className="text-sm text-red-600">
          {getApiErrorMessage(error)}
        </p>
      )}

      <section aria-label="Prévenir l'école" className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Prévenir l&apos;école</h2>
        <Card className="space-y-3">
          <label htmlFor="absence-reason" className="block text-sm font-medium">
            Signaler une absence
          </label>
          <input
            id="absence-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif (maladie, rendez-vous…)"
            className={field}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={reason.trim().length < 3 || absence.isPending}
              onClick={() => absence.mutate()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {absence.isPending && <Spinner />} Absence
            </button>
            <button
              type="button"
              disabled={late.isPending}
              onClick={() => late.mutate()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {late.isPending ? <Spinner /> : <AlarmClock className="h-4 w-4" />} Retard
            </button>
          </div>
        </Card>
      </section>

      <section aria-label="Adultes autorisés" className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Adultes autorisés à la sortie</h2>
        {adults.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun adulte supplémentaire autorisé.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {adults.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-zinc-500">{[a.relationship, a.phone].filter(Boolean).join(' · ')}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Retirer l'autorisation de ${a.name}`}
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(a.id)}
                  className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" /> Autoriser une personne
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Nom" placeholder="Nom" value={adult.lastName} onChange={(e) => setAdult({ ...adult, lastName: e.target.value })} className={field} />
            <input aria-label="Prénom" placeholder="Prénom" value={adult.firstName} onChange={(e) => setAdult({ ...adult, firstName: e.target.value })} className={field} />
          </div>
          <input aria-label="Téléphone" type="tel" placeholder="Téléphone" value={adult.phone} onChange={(e) => setAdult({ ...adult, phone: e.target.value })} className={field} />
          <input aria-label="Lien avec l'enfant" placeholder="Lien (oncle, voisine…)" value={adult.relationship} onChange={(e) => setAdult({ ...adult, relationship: e.target.value })} className={field} />
          <button
            type="button"
            disabled={addAdult.isPending || !adult.lastName || !adult.firstName || adult.phone.length < 6 || !adult.relationship}
            onClick={() => addAdult.mutate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {addAdult.isPending && <Spinner />} Autoriser
          </button>
        </Card>
      </section>

      {contacts.length > 0 && (
        <section aria-label="Contacts de l'école" className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Contacts</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {contacts.map((c, i) => {
              const phone = c.phone ?? c.mobile
              return (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-zinc-500">{[c.roleLabel ?? c.title ?? c.role, c.subject].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex gap-1">
                    {phone && (
                      <a href={`tel:${phone}`} aria-label={`Appeler ${c.name}`} className="rounded-full p-2 text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-900">
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} aria-label={`Écrire à ${c.name}`} className="rounded-full p-2 text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-900">
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
