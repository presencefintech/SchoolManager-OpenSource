import {
  buildPatch,
  geofenceError,
  parseCoord,
  settingsToForm,
} from '../attendance-settings-patch'
import type { AttendanceSettings } from '@/types/admin'

function baseSettings(overrides: Partial<AttendanceSettings> = {}): AttendanceSettings {
  return {
    schoolId: 1,
    source: 'database',
    methods: {
      manual: true,
      qrCode: true,
      rfid: false,
      facialRecognition: false,
      fingerprint: false,
    },
    enabledPresenceModes: ['MANUAL', 'QR_CODE'],
    offlineSyncEnabled: true,
    validationRules: {
      requireGPS: false,
      allowOffline: false,
      requireLiveness: false,
      dualQrRequired: false,
      maxClockSkewMs: 600000,
      enforceSchoolGeofence: true,
    },
    scheduleSettings: {
      startHour: 8,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      lateToleranceMinutes: 15,
      scanWindowStrict: true,
      exitScanEnabled: true,
    },
    geofence: {
      latitude: null,
      longitude: null,
      radiusKm: 0.2,
      radiusMeters: 200,
      configured: false,
    },
    notificationSettings: {
      parentPresenceNotificationsEnabled: false,
      parentDepartureNotificationsEnabled: false,
    },
    absenceSettings: {
      autoMarkEnabled: false,
      cutoffHour: 9,
      cutoffMinute: 0,
      timezone: 'Africa/Kinshasa',
    },
    updatedAt: null,
    ...overrides,
  }
}

describe('parseCoord', () => {
  it('accepte virgule FR et signe moins', () => {
    expect(parseCoord('-4,3276')).toBeCloseTo(-4.3276)
    expect(parseCoord(' 15,3136 ')).toBeCloseTo(15.3136)
    expect(parseCoord('-17.4677')).toBeCloseTo(-17.4677)
  })

  it('ignore une saisie en cours', () => {
    expect(parseCoord('-')).toBeNull()
    expect(parseCoord('')).toBeNull()
    expect(parseCoord('abc')).toBeNull()
  })
})

describe('buildPatch — géofence', () => {
  it('inclut les coordonnées dès que lat + lng sont valides (école non configurée)', () => {
    const original = baseSettings()
    const form = settingsToForm(original)
    form.geofenceLat = '-4,3276'
    form.geofenceLng = '15,3136'

    const patch = buildPatch(original, form)
    expect(patch.geofence).toEqual({
      latitude: -4.3276,
      longitude: 15.3136,
      radiusKm: 0.2,
    })
    expect(geofenceError(original, form)).toBe('')
  })

  it('ne bloque plus le patch si seule la latitude est saisie — message clair', () => {
    const original = baseSettings()
    const form = settingsToForm(original)
    form.geofenceLat = '-4.32'

    expect(buildPatch(original, form).geofence).toBeUndefined()
    expect(geofenceError(original, form)).toBe('Indiquez la latitude et la longitude.')
  })

  it('compare les décimales Prisma (string) sans bloquer une vraie modification', () => {
    const original = baseSettings({
      geofence: {
        latitude: '14.71670000' as unknown as number,
        longitude: '-17.46770000' as unknown as number,
        radiusKm: 0.2,
        radiusMeters: 200,
        configured: true,
      },
    })
    const form = settingsToForm(original)
    form.geofenceLat = '14,72'

    const patch = buildPatch(original, form)
    expect(patch.geofence?.latitude).toBeCloseTo(14.72)
    expect(patch.geofence?.longitude).toBeCloseTo(-17.4677)
  })
})
