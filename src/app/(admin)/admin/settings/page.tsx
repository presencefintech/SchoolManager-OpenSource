'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Save, RefreshCw } from 'lucide-react'
import { SchoolBrandingSettings } from '@/components/admin/settings/SchoolBrandingSettings'
import { FinanceCurrencySettings } from '@/components/admin/settings/FinanceCurrencySettings'
import { SchoolMessagingSettings } from '@/components/admin/settings/SchoolMessagingSettings'
import { StaffAccessSettings } from '@/components/admin/settings/StaffAccessSettings'
import { SchoolAcademicSettings } from '@/components/admin/settings/SchoolAcademicSettings'
import { useAttendanceSettings, useUpdateAttendanceSettings } from '@/lib/hooks/use-admin'
import {
  buildPatch,
  geofenceError,
  settingsToForm,
  type AttendanceFormState,
} from '@/lib/admin/attendance-settings-patch'
import type {
  AttendanceMethods,
  AttendanceScheduleSettings,
} from '@/types/admin'

function scheduleToMinutes(s: Pick<AttendanceScheduleSettings, 'startHour' | 'startMinute' | 'endHour' | 'endMinute'>) {
  return {
    start: s.startHour * 60 + s.startMinute,
    end: s.endHour * 60 + s.endMinute,
  }
}


function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
      />
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  step,
  inputMode,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  hint?: string
  min?: number
  max?: number
  step?: string
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
      <input
        type="text"
        inputMode={inputMode ?? (step === 'any' ? 'decimal' : 'numeric')}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  )
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

const METHOD_LABELS: Record<keyof AttendanceMethods, string> = {
  manual: 'Manuel (admin / enseignant)',
  qrCode: 'QR code',
  rfid: 'RFID / NFC',
  facialRecognition: 'Reconnaissance faciale',
  fingerprint: 'Empreinte digitale',
}

export default function SettingsPage() {
  const { data: settings, isLoading, refetch } = useAttendanceSettings()
  const updateSettings = useUpdateAttendanceSettings()

  const [form, setForm] = useState<AttendanceFormState | null>(null)
  const [dirty, setDirty] = useState(false)
  const [clientError, setClientError] = useState('')

  useEffect(() => {
    if (settings && !dirty) {
      setForm(settingsToForm(settings))
    }
  }, [settings, dirty])

  const patch = useMemo(() => {
    if (!settings || !form) return null
    return buildPatch(settings, form)
  }, [settings, form])

  const scheduleInvalid = useMemo(() => {
    if (!form) return false
    const { start, end } = scheduleToMinutes(form.scheduleSettings)
    return end <= start
  }, [form])

  const geoMessage = settings && form ? geofenceError(settings, form) : ''
  const hasPatch = patch != null && Object.keys(patch).length > 0
  const canSave =
    dirty &&
    hasPatch &&
    !geoMessage &&
    !(scheduleInvalid && patch?.scheduleSettings != null)

  const handleSave = () => {
    if (!patch || Object.keys(patch).length === 0) return
    if (geoMessage) {
      setClientError(geoMessage)
      return
    }
    if (scheduleInvalid && patch.scheduleSettings) {
      setClientError('La fin de fenêtre doit être après le début.')
      return
    }
    setClientError('')
    updateSettings.mutate(patch, {
      onSuccess: () => {
        setDirty(false)
        void refetch()
      },
    })
  }

  const handleReset = () => {
    if (settings) {
      setForm(settingsToForm(settings))
      setDirty(false)
      setClientError('')
    }
  }

  const updateForm = (updater: (prev: AttendanceFormState) => AttendanceFormState) => {
    setDirty(true)
    setClientError('')
    setForm((prev) => (prev ? updater(prev) : prev))
  }

  const updateSchedule = <K extends keyof AttendanceScheduleSettings>(
    key: K,
    value: AttendanceScheduleSettings[K],
  ) => {
    updateForm((f) => ({
      ...f,
      scheduleSettings: { ...f.scheduleSettings, [key]: value },
    }))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-bold text-zinc-900">Paramètres école</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Identité, année scolaire, accès staff, pointage et notifications
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.02 }}
      >
        <SchoolAcademicSettings />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 }}
        >
          <SchoolBrandingSettings />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
        >
          <FinanceCurrencySettings />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.07 }}
      >
        <StaffAccessSettings />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.075 }}
      >
        <SchoolMessagingSettings />
      </motion.div>

      {isLoading || !form ? (
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <RefreshCw size={20} className="mx-auto text-zinc-300 animate-spin mb-2" />
          <p className="text-sm text-zinc-400">Chargement des paramètres…</p>
        </div>
      ) : (
        <motion.div
          className="bg-white rounded-xl border border-zinc-200 overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-5 border-b lg:border-r border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Modes de pointage</h3>
            <p className="text-xs text-zinc-400 mb-3">Au moins un mode doit rester actif.</p>
            <div className="divide-y divide-zinc-50">
              {(Object.keys(METHOD_LABELS) as (keyof AttendanceMethods)[]).map((key) => (
                <Toggle
                  key={key}
                  label={METHOD_LABELS[key]}
                  checked={form.methods[key]}
                  onChange={(v) =>
                    updateForm((f) => ({ ...f, methods: { ...f.methods, [key]: v } }))
                  }
                />
              ))}
            </div>
            <Toggle
              label="Synchronisation hors ligne"
              description="Autoriser l'enregistrement différé côté mobile"
              checked={form.offlineSyncEnabled}
              onChange={(v) => updateForm((f) => ({ ...f, offlineSyncEnabled: v }))}
            />
          </div>

          <div className="p-5 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Horaires de scan</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Fenêtre {pad2(form.scheduleSettings.startHour)}:{pad2(form.scheduleSettings.startMinute)}
              {' – '}
              {pad2(form.scheduleSettings.endHour)}:{pad2(form.scheduleSettings.endMinute)}
              {form.scheduleSettings.scanWindowStrict ? ' · stricte' : ''}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Heure d'ouverture"
                value={form.scheduleSettings.startHour}
                min={0}
                max={23}
                onChange={(v) => updateSchedule('startHour', Number(v))}
              />
              <NumberField
                label="Minute d'ouverture"
                value={form.scheduleSettings.startMinute}
                min={0}
                max={59}
                onChange={(v) => updateSchedule('startMinute', Number(v))}
              />
              <NumberField
                label="Heure de fermeture"
                value={form.scheduleSettings.endHour}
                min={0}
                max={23}
                onChange={(v) => updateSchedule('endHour', Number(v))}
              />
              <NumberField
                label="Minute de fermeture"
                value={form.scheduleSettings.endMinute}
                min={0}
                max={59}
                onChange={(v) => updateSchedule('endMinute', Number(v))}
              />
              <div className="col-span-2">
                <NumberField
                  label="Tolérance retard (min)"
                  value={form.scheduleSettings.lateToleranceMinutes}
                  min={0}
                  max={240}
                  onChange={(v) => updateSchedule('lateToleranceMinutes', Number(v))}
                  hint="Après cette durée, le pointage est marqué en retard."
                />
              </div>
            </div>
            {scheduleInvalid && (
              <p className="mt-2 text-xs text-red-600">La fin de fenêtre doit être après le début.</p>
            )}
            <div className="mt-3 divide-y divide-zinc-50">
              <Toggle
                label="Fenêtre stricte"
                description="Les enseignants ne pourront pointer qu'entre l'ouverture et la fermeture."
                checked={form.scheduleSettings.scanWindowStrict}
                onChange={(v) => updateSchedule('scanWindowStrict', v)}
              />
              <Toggle
                label="Autoriser le scan de sortie"
                description="Un second scan le même jour enregistre la sortie et peut notifier les parents."
                checked={form.scheduleSettings.exitScanEnabled}
                onChange={(v) => updateSchedule('exitScanEnabled', v)}
              />
            </div>
          </div>

          <div className="p-5 border-b lg:border-r border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Règles de validation</h3>
            <div className="divide-y divide-zinc-50">
              <Toggle
                label="GPS requis"
                checked={form.validationRules.requireGPS}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: { ...f.validationRules, requireGPS: v },
                  }))
                }
              />
              <Toggle
                label="Double QR obligatoire"
                description="Élève + établissement"
                checked={form.validationRules.dualQrRequired}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: { ...f.validationRules, dualQrRequired: v },
                  }))
                }
              />
              <Toggle
                label="Géofence école"
                checked={form.validationRules.enforceSchoolGeofence}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: { ...f.validationRules, enforceSchoolGeofence: v },
                  }))
                }
              />
              <Toggle
                label="Détection de vivacité"
                checked={form.validationRules.requireLiveness}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: { ...f.validationRules, requireLiveness: v },
                  }))
                }
              />
              <Toggle
                label="Mode hors ligne autorisé"
                checked={form.validationRules.allowOffline}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: { ...f.validationRules, allowOffline: v },
                  }))
                }
              />
            </div>
            <div className="mt-4">
              <NumberField
                label="Écart d’horloge max (secondes)"
                value={Math.round(form.validationRules.maxClockSkewMs / 1000)}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: {
                      ...f.validationRules,
                      maxClockSkewMs: (Number(v) || Math.round(f.validationRules.maxClockSkewMs / 1000)) * 1000,
                    },
                  }))
                }
                hint="Tolérance entre l’heure de l’appareil et celle du serveur"
              />
            </div>
          </div>

          <div className="p-5 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Géofence établissement</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Latitude"
                value={form.geofenceLat}
                step="any"
                inputMode="decimal"
                onChange={(v) => updateForm((f) => ({ ...f, geofenceLat: v }))}
                hint="Ex. -4,3276 (Kinshasa) ou 14,7167 (Dakar)"
              />
              <NumberField
                label="Longitude"
                value={form.geofenceLng}
                step="any"
                inputMode="decimal"
                onChange={(v) => updateForm((f) => ({ ...f, geofenceLng: v }))}
                hint="Ex. 15,3136 (Kinshasa) ou -17,4677 (Dakar)"
              />
              <div className="col-span-2">
                <NumberField
                  label="Rayon (km)"
                  value={form.geofenceRadiusKm}
                  step="any"
                  inputMode="decimal"
                  onChange={(v) => updateForm((f) => ({ ...f, geofenceRadiusKm: v }))}
                  hint="Périmètre autorisé pour le pointage GPS (0,2 km par défaut)"
                />
              </div>
            </div>
            {geoMessage && <p className="mt-2 text-xs text-red-600">{geoMessage}</p>}
            {settings && !settings.geofence?.configured && !geoMessage && (
              <p className="mt-2 text-xs text-amber-600">Zone GPS non configurée — nécessaire pour le pointage sur place.</p>
            )}
          </div>

          <div className="p-5 border-b lg:border-b-0 lg:border-r border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Notifications parents</h3>
            <Toggle
              label="Notifier à l'arrivée"
              description="Push / in-app quand l'élève est pointé à l'arrivée"
              checked={form.notificationSettings.parentPresenceNotificationsEnabled}
              onChange={(v) =>
                updateForm((f) => ({
                  ...f,
                  notificationSettings: {
                    ...f.notificationSettings,
                    parentPresenceNotificationsEnabled: v,
                  },
                }))
              }
            />
            <Toggle
              label="Notifier à la sortie / fin de journée"
              description="Sortie ou notification automatique après la fermeture s’il n’y a pas de second scan"
              checked={form.notificationSettings.parentDepartureNotificationsEnabled}
              onChange={(v) =>
                updateForm((f) => ({
                  ...f,
                  notificationSettings: {
                    ...f.notificationSettings,
                    parentDepartureNotificationsEnabled: v,
                  },
                }))
              }
            />
            <Toggle
              label="Indicateur frais scolaires au guichet"
              description="Mention discrète sur la carte de confirmation — n’bloque jamais l’entrée"
              checked={form.notificationSettings.gateFinanceDisplayEnabled}
              onChange={(v) =>
                updateForm((f) => ({
                  ...f,
                  notificationSettings: {
                    ...f.notificationSettings,
                    gateFinanceDisplayEnabled: v,
                  },
                }))
              }
            />
            <Toggle
              label="Rapport de ponctualité quotidien"
              description="PDF + email aux DIRECTOR/ADMIN chaque matin (≈ 09:00)"
              checked={form.notificationSettings.dailyPunctualityReportEnabled}
              onChange={(v) =>
                updateForm((f) => ({
                  ...f,
                  notificationSettings: {
                    ...f.notificationSettings,
                    dailyPunctualityReportEnabled: v,
                  },
                }))
              }
            />
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Absences automatiques</h3>
            <Toggle
              label="Marquer absent après l’heure limite"
              description="Traitement automatique toutes les 15 minutes"
              checked={form.absenceSettings.autoMarkEnabled}
              onChange={(v) =>
                updateForm((f) => ({
                  ...f,
                  absenceSettings: { ...f.absenceSettings, autoMarkEnabled: v },
                }))
              }
            />
            <div className="grid grid-cols-3 gap-4 mt-4">
              <NumberField
                label="Heure limite"
                value={form.absenceSettings.cutoffHour}
                min={0}
                max={23}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    absenceSettings: {
                      ...f.absenceSettings,
                      cutoffHour: Number(v),
                    },
                  }))
                }
              />
              <NumberField
                label="Minute"
                value={form.absenceSettings.cutoffMinute}
                min={0}
                max={59}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    absenceSettings: {
                      ...f.absenceSettings,
                      cutoffMinute: Number(v),
                    },
                  }))
                }
              />
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Fuseau horaire</label>
                <input
                  type="text"
                  value={form.absenceSettings.timezone}
                  onChange={(e) =>
                    updateForm((f) => ({
                      ...f,
                      absenceSettings: { ...f.absenceSettings, timezone: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

          {settings && (
            <div className="px-5 py-3 text-xs text-zinc-400 border-t border-zinc-100">
              Paramètres de l’établissement
            </div>
          )}

          <div className="px-5 py-4 flex items-center justify-between bg-zinc-50 rounded-b-xl border-t border-zinc-100">
            <div className="text-xs">
              {clientError && <p className="text-red-500">{clientError}</p>}
              {!clientError && geoMessage && <p className="text-red-500">{geoMessage}</p>}
              {!clientError && updateSettings.isSuccess && !dirty && (
                <p className="text-emerald-600">Paramètres sauvegardés</p>
              )}
              {!clientError && updateSettings.isError && (
                <p className="text-red-500">Erreur lors de la sauvegarde</p>
              )}
            </div>
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
                disabled={!canSave || updateSettings.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Save size={14} />
                {updateSettings.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
