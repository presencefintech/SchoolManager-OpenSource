'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, ErrorState, ListSkeleton, NoStudent, PageHeader, Pill, Spinner, StudentSwitcher } from '@/components/parent/ui'

export default function MoratoriumPage() {
  const { studentId } = useSelectedStudent()
  const queryClient = useQueryClient()
  const moratorium = useQuery({
    queryKey: parentKeys.moratorium(studentId ?? 0),
    queryFn: () => parentApi.moratorium(studentId as number),
    enabled: studentId != null,
  })
  const [days, setDays] = useState(15)
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState('')

  const request = useMutation({
    mutationFn: () => parentApi.requestMoratorium(studentId as number, { requestedDays: days, reason: reason.trim() }),
    onSuccess: (res) => {
      setFeedback(res?.autoApproved ? 'Moratoire accordé.' : (res?.message ?? 'Demande envoyée à l’école.'))
      setReason('')
      void queryClient.invalidateQueries({ queryKey: parentKeys.moratorium(studentId ?? 0) })
      void queryClient.invalidateQueries({ queryKey: parentKeys.finances(studentId ?? 0) })
    },
  })

  if (studentId == null) return <NoStudent />
  if (moratorium.isLoading) return <ListSkeleton rows={2} />
  if (moratorium.isError || !moratorium.data) return <ErrorState onRetry={() => void moratorium.refetch()} />

  const m = moratorium.data
  const policy = m.policy
  const maxDays = policy?.parentMaxRequestDays ?? 30
  const canRequest = policy?.parentRequestEnabled !== false && !m.active && !m.pendingApproval

  return (
    <>
      <PageHeader title="Moratoire" subtitle="Délai de paiement accordé par l'école" />
      <StudentSwitcher />
      <Card className="mb-4 space-y-2">
        {m.active ? (
          <>
            <Pill tone="green">Moratoire actif</Pill>
            {m.endDate && <p className="text-sm">Jusqu&apos;au {new Date(m.endDate).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>}
            {m.remindersOnHold && <p className="text-sm text-zinc-500">Les relances sont suspendues.</p>}
          </>
        ) : m.pendingApproval ? (
          <Pill tone="amber">Demande en attente de validation</Pill>
        ) : (
          <p className="text-sm text-zinc-500">Aucun moratoire en cours.</p>
        )}
      </Card>

      {canRequest && (
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setFeedback('')
              request.mutate()
            }}
          >
            <div>
              <label htmlFor="days" className="mb-1 block text-sm font-medium">
                Durée demandée (jours, max {maxDays})
              </label>
              <input
                id="days"
                type="number"
                min={1}
                max={maxDays}
                value={days}
                onChange={(e) => setDays(Math.min(maxDays, Math.max(1, Number(e.target.value))))}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5"
              />
            </div>
            <div>
              <label htmlFor="reason" className="mb-1 block text-sm font-medium">
                Motif
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2"
              />
            </div>
            {request.isError && (
              <p role="alert" className="text-sm text-red-600">
                {getApiErrorMessage(request.error)}
              </p>
            )}
            {feedback && (
              <p role="status" className="text-sm text-emerald-700">
                {feedback}
              </p>
            )}
            <button
              type="submit"
              disabled={request.isPending || reason.trim().length < 5}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {request.isPending && <Spinner />} Demander un moratoire
            </button>
          </form>
        </Card>
      )}
    </>
  )
}
