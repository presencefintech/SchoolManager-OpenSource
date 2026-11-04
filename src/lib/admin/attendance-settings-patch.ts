import type {
  AttendanceAbsenceSettings,
  AttendanceNotificationSettings,
  AttendanceScheduleSettings,
  AttendanceSettings,
  AttendanceMethods,
  AttendanceValidationRules,
  PatchAttendanceSettingsPayload,
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
const DEFAULT_NOTIFICATION_SETTINGS: AttendanceNotificationSettings = {
  parentPresenceNotificationsEnabled: false,
  parentDepartureNotificationsEnabled: false,
  gateFinanceDisplayEnabled: true,
  dailyPunctualityReportEnabled: true,
  dailyPunctualityReportEmails: [],
}
const DEFAULT_ABSENCE_SETTINGS: AttendanceAbsenceSettings = {
  autoMarkEnabled: false,
  cutoffHour: 9,
  cutoffMinute: 0,
  timezone: 'Africa/Kinshasa',
}
const DEFAULT_RADIUS_KM = 0.2

export type AttendanceFormState = {
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
export function normalizeSchedule(
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
export function settingsToForm(settings: AttendanceSettings): AttendanceFormState {
  const geofence = settings.geofence ?? {
    latitude: null,
    longitude: null,
    radiusKm: DEFAULT_RADIUS_KM,
    radiusMeters: DEFAULT_RADIUS_KM * 1000,
    configured: false,
  }
  return {
    methods: { ...settings.methods },
    offlineSyncEnabled: settings.offlineSyncEnabled,
    validationRules: { ...settings.validationRules },
    scheduleSettings: normalizeSchedule(settings.scheduleSettings),
    geofenceLat: geofence.latitude != null ? String(geofence.latitude) : '',
    geofenceLng: geofence.longitude != null ? String(geofence.longitude) : '',
    geofenceRadiusKm: String(geofence.radiusKm > 0 ? geofence.radiusKm : DEFAULT_RADIUS_KM),
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notificationSettings },
    absenceSettings: { ...DEFAULT_ABSENCE_SETTINGS, ...settings.absenceSettings },
  }
}

/** Accepte virgule FR, espaces et signe moins. */
export function parseCoord(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function asOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export type GeofenceDraft =
  | { status: 'unchanged' }
  | { status: 'invalid'; message: string }
  | { status: 'ready'; value: { latitude: number; longitude: number; radiusKm: number } }

export function resolveGeofenceDraft(
  original: AttendanceSettings,
  form: AttendanceFormState,
): GeofenceDraft {
  const originalGeofence = original.geofence ?? {
    latitude: null,
    longitude: null,
    radiusKm: DEFAULT_RADIUS_KM,
  }
  const lat = parseCoord(form.geofenceLat)
  const lng = parseCoord(form.geofenceLng)
  const parsedRadius = parseCoord(form.geofenceRadiusKm)
  const radiusKm =
    parsedRadius != null && parsedRadius > 0 ? parsedRadius : DEFAULT_RADIUS_KM

  const origLat = asOptionalNumber(originalGeofence.latitude)
  const origLng = asOptionalNumber(originalGeofence.longitude)
  const origRadius = asOptionalNumber(originalGeofence.radiusKm) ?? DEFAULT_RADIUS_KM

  const latTouched = form.geofenceLat.trim() !== ''
  const lngTouched = form.geofenceLng.trim() !== ''
  const changed =
    lat !== origLat ||
    lng !== origLng ||
    Math.abs(radiusKm - origRadius) > 1e-9

  if (!changed) return { status: 'unchanged' }

  if (!latTouched || !lngTouched || lat == null || lng == null) {
    return { status: 'invalid', message: 'Indiquez la latitude et la longitude.' }
  }
  if (lat < -90 || lat > 90) {
    return { status: 'invalid', message: 'Latitude invalide (−90 à 90).' }
  }
  if (lng < -180 || lng > 180) {
    return { status: 'invalid', message: 'Longitude invalide (−180 à 180).' }
  }
  if (radiusKm > 50) {
    return { status: 'invalid', message: 'Le rayon doit être compris entre 0 et 50 km.' }
  }

  return { status: 'ready', value: { latitude: lat, longitude: lng, radiusKm } }
}

export function buildPatch(
  original: AttendanceSettings,
  form: AttendanceFormState,
): PatchAttendanceSettingsPayload {
  const patch: PatchAttendanceSettingsPayload = {}
  const originalSchedule = normalizeSchedule(original.scheduleSettings)
  const originalNotifs: AttendanceNotificationSettings = {
    parentPresenceNotificationsEnabled:
      original.notificationSettings?.parentPresenceNotificationsEnabled ?? false,
    parentDepartureNotificationsEnabled:
      original.notificationSettings?.parentDepartureNotificationsEnabled ?? false,
    gateFinanceDisplayEnabled:
      original.notificationSettings?.gateFinanceDisplayEnabled ?? true,
    dailyPunctualityReportEnabled:
      original.notificationSettings?.dailyPunctualityReportEnabled ?? true,
    dailyPunctualityReportEmails: [
      ...(original.notificationSettings?.dailyPunctualityReportEmails ?? []),
    ],
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

  const emailsChanged =
    JSON.stringify(form.notificationSettings.dailyPunctualityReportEmails ?? []) !==
    JSON.stringify(originalNotifs.dailyPunctualityReportEmails ?? [])
  if (
    form.notificationSettings.parentPresenceNotificationsEnabled !==
      originalNotifs.parentPresenceNotificationsEnabled ||
    form.notificationSettings.parentDepartureNotificationsEnabled !==
      originalNotifs.parentDepartureNotificationsEnabled ||
    form.notificationSettings.gateFinanceDisplayEnabled !==
      originalNotifs.gateFinanceDisplayEnabled ||
    form.notificationSettings.dailyPunctualityReportEnabled !==
      originalNotifs.dailyPunctualityReportEnabled ||
    emailsChanged
  ) {
    patch.notificationSettings = { ...form.notificationSettings }
  }

  const originalAbsence = original.absenceSettings ?? DEFAULT_ABSENCE_SETTINGS
  const absenceKeys = Object.keys(form.absenceSettings) as (keyof AttendanceAbsenceSettings)[]
  if (absenceKeys.some((k) => form.absenceSettings[k] !== originalAbsence[k])) {
    patch.absenceSettings = form.absenceSettings
  }

  const geo = resolveGeofenceDraft(original, form)
  if (geo.status === 'ready') {
    patch.geofence = geo.value
  }

  return patch
}

export function geofenceError(
  original: AttendanceSettings,
  form: AttendanceFormState,
): string {
  const geo = resolveGeofenceDraft(original, form)
  return geo.status === 'invalid' ? geo.message : ''
}
