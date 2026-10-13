'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi } from '@/lib/parent/api'
import { parentKeys } from '@/lib/parent/hooks'
import { Card, PageHeader, Spinner } from '@/components/parent/ui'

export default function ClaimStudentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [linked, setLinked] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')
    try {
      const res = await parentApi.claimStudent(trimmed)
      setLinked(res?.studentName ?? 'Votre enfant')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: parentKeys.students }),
        queryClient.invalidateQueries({ queryKey: parentKeys.dashboard }),
      ])
      setTimeout(() => router.push('/parent/students'), 1200)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Lier un enfant" subtitle="Saisissez le code remis par l'école." />
      <Card>
        {linked ? (
          <p role="status" className="text-emerald-700">
            {linked} a bien été lié(e) à votre compte.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium" htmlFor="claim-code">
              Code école
            </label>
            <input
              id="claim-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-base tracking-widest"
              placeholder="ABC-1234"
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {busy && <Spinner />} Lier l&apos;enfant
            </button>
          </form>
        )}
      </Card>
    </>
  )
}
