'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { useAttendanceSettings, useUpdateAttendanceSettings } from '@/lib/hooks/use-admin'
import type { AttendanceSettings } from '@/types/admin'

function Field({ label, name, value, onChange, type = 'number', hint }: {
  label: string
  name: string
  value: string | number
  onChange: (name: string, value: string) => void
  type?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { data: settings, isLoading, refetch } = useAttendanceSettings()
  const updateSettings = useUpdateAttendanceSettings()

  const [form, setForm] = useState<Partial<AttendanceSettings>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (settings && !dirty) {
      setForm(settings)
    }
  }, [settings, dirty])

  const handleChange = (name: string, value: string) => {
    setDirty(true)
    setForm(f => ({ ...f, [name]: name === 'startHour' || name === 'startMinute' || name === 'gracePeriod' || name === 'lateThreshold' || name === 'absentThreshold' ? Number(value) : value }))
  }

  const handleSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => { setDirty(false); refetch() }
    })
  }

  const handleReset = () => {
    if (settings) { setForm(settings); setDirty(false) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Paramètres école</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Configuration de la présence et des horaires</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <RefreshCw size={20} className="mx-auto text-zinc-300 animate-spin mb-2" />
          <p className="text-sm text-zinc-400">Chargement des paramètres…</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-4">Horaires d'entrée</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Heure de début"
                name="startHour"
                value={form.startHour ?? ''}
                onChange={handleChange}
                hint="0–23"
              />
              <Field
                label="Minute de début"
                name="startMinute"
                value={form.startMinute ?? ''}
                onChange={handleChange}
                hint="0–59"
              />
            </div>
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-4">Seuils de présence</h3>
            <div className="grid grid-cols-1 gap-4">
              <Field
                label="Période de grâce (minutes)"
                name="gracePeriod"
                value={form.gracePeriod ?? ''}
                onChange={handleChange}
                hint="Délai toléré après l'heure de début"
              />
              {form.lateThreshold !== undefined && (
                <Field
                  label="Seuil retard (minutes)"
                  name="lateThreshold"
                  value={form.lateThreshold ?? ''}
                  onChange={handleChange}
                  hint="Au-delà : marqué en retard"
                />
              )}
              {form.absentThreshold !== undefined && (
                <Field
                  label="Seuil absent (minutes)"
                  name="absentThreshold"
                  value={form.absentThreshold ?? ''}
                  onChange={handleChange}
                  hint="Au-delà : marqué absent"
                />
              )}
            </div>
          </div>

          {/* Extra fields from API */}
          {settings && Object.entries(settings)
            .filter(([k]) => !['startHour', 'startMinute', 'gracePeriod', 'lateThreshold', 'absentThreshold'].includes(k))
            .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
            .length > 0 && (
            <div className="p-5">
              <h3 className="text-sm font-semibold text-zinc-700 mb-4">Autres paramètres</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(settings)
                  .filter(([k]) => !['startHour', 'startMinute', 'gracePeriod', 'lateThreshold', 'absentThreshold'].includes(k))
                  .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                  .map(([k, v]) => (
                    <Field
                      key={k}
                      label={k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      name={k}
                      value={(form as Record<string, unknown>)[k] as string ?? v as string}
                      onChange={handleChange}
                      type={typeof v === 'number' ? 'number' : 'text'}
                    />
                  ))}
              </div>
            </div>
          )}

          <div className="px-5 py-4 flex items-center justify-between bg-zinc-50 rounded-b-xl">
            {updateSettings.isSuccess && !dirty && (
              <p className="text-xs text-emerald-600">Paramètres sauvegardés</p>
            )}
            {updateSettings.isError && (
              <p className="text-xs text-red-500">Erreur lors de la sauvegarde</p>
            )}
            {!updateSettings.isSuccess && !updateSettings.isError && <div />}
            <div className="flex gap-2">
              {dirty && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!dirty || updateSettings.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {updateSettings.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
