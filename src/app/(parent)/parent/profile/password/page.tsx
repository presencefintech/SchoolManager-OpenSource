'use client'

import { useState } from 'react'
import { getApiErrorMessage } from '@/lib/api/client'
import { authApi } from '@/lib/api/auth'
import { Card, PageHeader, Spinner } from '@/components/parent/ui'

export default function ParentPasswordPage() {
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
    if (newPassword !== confirm) return setError('Les mots de passe ne correspondent pas.')
    setBusy(true)
    try {
      await authApi.changePassword({ oldPassword, newPassword })
      setDone(true)
      setOld('')
      setNew('')
      setConfirm('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-xl border border-line bg-canvas px-3 py-2.5'

  return (
    <>
      <PageHeader title="Changer le mot de passe" />
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="old" className="mb-1 block text-sm font-medium">
              Mot de passe actuel
            </label>
            <input id="old" type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOld(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="new" className="mb-1 block text-sm font-medium">
              Nouveau mot de passe
            </label>
            <input id="new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
              Confirmer
            </label>
            <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          {done && (
            <p role="status" className="text-sm text-emerald-700">
              Mot de passe mis à jour.
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !oldPassword || !newPassword}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {busy && <Spinner />} Enregistrer
          </button>
        </form>
      </Card>
    </>
  )
}
