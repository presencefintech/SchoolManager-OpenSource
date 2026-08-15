'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Save, RefreshCw } from 'lucide-react'
import { SchoolBrandingSettings } from '@/components/admin/settings/SchoolBrandingSettings'
import { FinanceCurrencySettings } from '@/components/admin/settings/FinanceCurrencySettings'
import { useAttendanceSettings, useUpdateAttendanceSettings } from '@/lib/hooks/use-admin'
import type {
  AttendanceSettings,
  PatchAttendanceSettingsPayload,
  AttendanceMethods,
  AttendanceValidationRules,
  AttendanceNotificationSettings,
  AttendanceAbsenceSettings,
  AttendanceScheduleSettings,
} from '@/types/admin'

const DEFAULT_SCHEDULE: AttendanceScheduleSettings = {
  startHour: 8,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
  lateToleranceMinutes: 15,
  scanWindowStrict: true,
  exitScanEnabled: true,
}

type AttendanceFormState = {
  methods: AttendanceMethods
  offlineSyncEnabled: boolean
  validationRules: AttendanceValidationRules
  scheduleSettings: AttendanceScheduleSettings
  geofenceLat: string
  geofenceLng: string
  geofenceRadiusKm: string
  notificationSettings: AttendanceNotificationSettings
  absenceSettings: AttendanceAbsenceSettings
}

function normalizeSchedule(
  raw: AttendanceSettings['scheduleSettings'] | null | undefined,
): AttendanceScheduleSettings {
  return {
    startHour: raw?.startHour ?? DEFAULT_SCHEDULE.startHour,
    startMinute: raw?.startMinute ?? DEFAULT_SCHEDULE.startMinute,
    endHour: raw?.endHour ?? DEFAULT_SCHEDULE.endHour,
    endMinute: raw?.endMinute ?? DEFAULT_SCHEDULE.endMinute,
    lateToleranceMinutes: raw?.lateToleranceMinutes ?? DEFAULT_SCHEDULE.lateToleranceMinutes,
    scanWindowStrict: raw?.scanWindowStrict ?? DEFAULT_SCHEDULE.scanWindowStrict,
    exitScanEnabled: raw?.exitScanEnabled ?? DEFAULT_SCHEDULE.exitScanEnabled,
  }
}

const DEFAULT_NOTIFICATION_SETTINGS: AttendanceNotificationSettings = {
  parentPresenceNotificationsEnabled: false,
  parentDepartureNotificationsEnabled: false,
}
const DEFAULT_ABSENCE_SETTINGS: AttendanceAbsenceSettings = {
  autoMarkEnabled: false,
  cutoffHour: 9,
  cutoffMinute: 0,
  timezone: 'Africa/Kinshasa',
}

function settingsToForm(settings: AttendanceSettings): AttendanceFormState {
  const geofence = settings.geofence ?? { latitude: null, longitude: null, radiusKm: 0.5, radiusMeters: 500, configured: false }
  return {
    methods: { ...settings.methods },
    offlineSyncEnabled: settings.offlineSyncEnabled,
    validationRules: { ...settings.validationRules },
    scheduleSettings: normalizeSchedule(settings.scheduleSettings),
    geofenceLat: geofence.latitude != null ? String(geofence.latitude) : '',
    geofenceLng: geofence.longitude != null ? String(geofence.longitude) : '',
    geofenceRadiusKm: String(geofence.radiusKm ?? 0.5),
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notificationSettings },
    absenceSettings: { ...DEFAULT_ABSENCE_SETTINGS, ...settings.absenceSettings },
  }
}

function scheduleToMinutes(s: Pick<AttendanceScheduleSettings, 'startHour' | 'startMinute' | 'endHour' | 'endMinute'>) {
  return {
    start: s.startHour * 60 + s.startMinute,
    end: s.endHour * 60 + s.endMinute,
  }
}

function buildPatch(original: AttendanceSettings, form: AttendanceFormState): PatchAttendanceSettingsPayload {
  const patch: PatchAttendanceSettingsPayload = {}
  const originalSchedule = normalizeSchedule(original.scheduleSettings)
  const originalNotifs: AttendanceNotificationSettings = {
    parentPresenceNotificationsEnabled:
      original.notificationSettings?.parentPresenceNotificationsEnabled ?? false,
    parentDepartureNotificationsEnabled:
      original.notificationSettings?.parentDepartureNotificationsEnabled ?? false,
  }

  const methodKeys = Object.keys(form.methods) as (keyof AttendanceMethods)[]
  if (methodKeys.some((k) => form.methods[k] !== original.methods[k])) {
    patch.methods = form.methods
  }

  if (form.offlineSyncEnabled !== original.offlineSyncEnabled) {
    patch.offlineSyncEnabled = form.offlineSyncEnabled
  }

  const ruleKeys = Object.keys(form.validationRules) as (keyof AttendanceValidationRules)[]
  if (ruleKeys.some((k) => form.validationRules[k] !== original.validationRules[k])) {
    patch.validationRules = form.validationRules
  }

  const scheduleKeys = Object.keys(form.scheduleSettings) as (keyof AttendanceScheduleSettings)[]
  if (scheduleKeys.some((k) => form.scheduleSettings[k] !== originalSchedule[k])) {
    patch.scheduleSettings = { ...form.scheduleSettings }
  }

  if (
    form.notificationSettings.parentPresenceNotificationsEnabled !==
      originalNotifs.parentPresenceNotificationsEnabled ||
    form.notificationSettings.parentDepartureNotificationsEnabled !==
      originalNotifs.parentDepartureNotificationsEnabled
  ) {
    patch.notificationSettings = { ...form.notificationSettings }
  }

  const originalAbsence = original.absenceSettings ?? DEFAULT_ABSENCE_SETTINGS
  const absenceKeys = Object.keys(form.absenceSettings) as (keyof AttendanceAbsenceSettings)[]
  if (absenceKeys.some((k) => form.absenceSettings[k] !== originalAbsence[k])) {
    patch.absenceSettings = form.absenceSettings
  }

  const originalGeofence = original.geofence ?? { latitude: null, longitude: null, radiusKm: 0.5 }
  const lat = form.geofenceLat.trim() ? Number(form.geofenceLat) : null
  const lng = form.geofenceLng.trim() ? Number(form.geofenceLng) : null
  const radiusKm = Number(form.geofenceRadiusKm)
  const geoChanged =
    lat !== originalGeofence.latitude ||
    lng !== originalGeofence.longitude ||
    radiusKm !== originalGeofence.radiusKm

  if (geoChanged && lat != null && lng != null && Number.isFinite(radiusKm) && radiusKm > 0) {
    patch.geofence = { latitude: lat, longitude: lng, radiusKm }
  }

  return patch
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
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  hint?: string
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
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

  const canSave = dirty && patch != null && Object.keys(patch).length > 0 && !scheduleInvalid

  const handleSave = () => {
    if (!patch || Object.keys(patch).length === 0) return
    if (scheduleInvalid) {
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
        <p className="text-sm text-zinc-500 mt-0.5">Identité, pointage, horaires et notifications présence</p>
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
                description="Un second scan le même jour enregistre la sortie (EXIT) et peut notifier les parents."
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
                label="Dual-QR obligatoire"
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
                label="Décalage horaire max (ms)"
                value={form.validationRules.maxClockSkewMs}
                onChange={(v) =>
                  updateForm((f) => ({
                    ...f,
                    validationRules: {
                      ...f.validationRules,
                      maxClockSkewMs: Number(v) || f.validationRules.maxClockSkewMs,
                    },
                  }))
                }
                hint="Tolérance entre l'heure appareil et serveur"
              />
            </div>
          </div>

          <div className="p-5 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Géofence établissement</h3>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Latitude"
                value={form.geofenceLat}
                onChange={(v) => updateForm((f) => ({ ...f, geofenceLat: v }))}
              />
              <NumberField
                label="Longitude"
                value={form.geofenceLng}
                onChange={(v) => updateForm((f) => ({ ...f, geofenceLng: v }))}
              />
              <div className="col-span-2">
                <NumberField
                  label="Rayon (km)"
                  value={form.geofenceRadiusKm}
                  onChange={(v) => updateForm((f) => ({ ...f, geofenceRadiusKm: v }))}
                  hint="Périmètre autorisé pour le pointage GPS"
                />
              </div>
            </div>
            {settings && !settings.geofence?.configured && (
              <p className="mt-2 text-xs text-amber-600">Géofence non configurée — requis pour la readiness pilote.</p>
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
              description="Sortie (EXIT) ou notification automatique après la fermeture si pas de second scan"
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
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Absences automatiques</h3>
            <Toggle
              label="Marquer absent après le cutoff"
              description="Job cron — exécution toutes les 15 min"
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
                label="Heure cutoff"
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
                label="Minute cutoff"
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
              Source : {settings.source === 'database' ? 'base dédiée' : 'legacy'} · École #{settings.schoolId}
            </div>
          )}

          <div className="px-5 py-4 flex items-center justify-between bg-zinc-50 rounded-b-xl border-t border-zinc-100">
            <div className="text-xs">
              {clientError && <p className="text-red-500">{clientError}</p>}
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
