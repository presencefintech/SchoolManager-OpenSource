'use client'

import { useState } from 'react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi, type NotificationSettings } from '@/lib/parent/api'
import { Card, PageHeader } from '@/components/parent/ui'

const CHANNELS: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: 'push', label: 'Notifications push', hint: 'Alertes sur cet appareil' },
  { key: 'sms', label: 'SMS', hint: 'Messages sur votre téléphone' },
  { key: 'email', label: 'Email', hint: 'Résumés et reçus par email' },
]

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({ push: true, sms: true, email: true })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function toggle(key: keyof NotificationSettings) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    setSaved(false)
    setError('')
    try {
      await parentApi.notificationSettings({ [key]: next[key] })
      setSaved(true)
    } catch (err) {
      setSettings(settings)
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <>
      <PageHeader title="Réglages des notifications" />
      <Card className="divide-y divide-line p-0">
        {CHANNELS.map((c) => (
          <label key={c.key} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5">
            <span>
              <span className="block text-sm font-medium">{c.label}</span>
              <span className="block text-xs text-zinc-500">{c.hint}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={!!settings[c.key]}
              onChange={() => void toggle(c.key)}
              className="h-5 w-5 accent-teal-600"
            />
          </label>
        ))}
      </Card>
      {saved && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          Préférences enregistrées.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  )
}
