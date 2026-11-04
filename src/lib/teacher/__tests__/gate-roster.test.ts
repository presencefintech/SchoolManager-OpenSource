import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const store = new Map<string, unknown>()

jest.mock('idb-keyval', () => ({
  get: jest.fn(async (key: string) => store.get(key) ?? undefined),
  set: jest.fn(async (key: string, value: unknown) => {
    store.set(key, value)
  }),
  del: jest.fn(async (key: string) => {
    store.delete(key)
  }),
}))

import {
  __resetGateRosterMemoryForTests,
  loadGateRosterCache,
  lookupGateRosterStudent,
  type GateRosterStudent,
} from '../gate-roster'

const student: GateRosterStudent = {
  id: 42,
  uuid: '11111111-2222-4333-8444-555555555555',
  matricule: 'ELEVE-014',
  barcode: 'BC-999',
  firstName: 'Jean',
  lastName: 'Kabila',
  prenom: 'Jean',
  postnom: null,
  fullName: 'KABILA Jean',
  classId: 3,
  className: '6ème A',
  photoUrl: null,
}

describe('gate-roster lookup', () => {
  beforeEach(() => {
    store.clear()
    __resetGateRosterMemoryForTests()
  })

  it('résout studentId / matricule / barcode depuis le cache IndexedDB', async () => {
    store.set('teacher-gate-roster-v1', {
      schoolId: 1,
      syncedAt: new Date().toISOString(),
      count: 1,
      etag: 'test',
      students: [student],
    })

    await loadGateRosterCache()

    expect(
      lookupGateRosterStudent(
        JSON.stringify({ v: 1, studentId: 42, matricule: 'ELEVE-014' }),
      )?.fullName,
    ).toBe('KABILA Jean')
    expect(lookupGateRosterStudent('ELEVE-014')?.className).toBe('6ème A')
    expect(lookupGateRosterStudent('BC-999')?.id).toBe(42)
    expect(lookupGateRosterStudent('unknown')).toBeNull()
  })
})
