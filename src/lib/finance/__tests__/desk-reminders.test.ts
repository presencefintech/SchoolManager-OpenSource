import { describe, expect, it } from '@jest/globals'
import { deskReminderShareUrl, filterDeskReminderRows, formatReminderDay } from '../desk-reminders'

const rows = [
  {
    studentName: 'Amina KABILA',
    parentName: 'Papa Kabila',
    className: '6ème',
    whatsappUrl: 'https://wa.me/243812345678?text=bonjour',
  },
  {
    studentName: 'Jean ILUNGA',
    parentName: null,
    className: '1ère',
    whatsappUrl: null,
  },
]

describe('relances du guichet', () => {
  it('filtre par nom et par numéro manquant', () => {
    expect(filterDeskReminderRows(rows, 'ilunga', false).map((row) => row.studentName)).toEqual([
      'Jean ILUNGA',
    ])
    expect(filterDeskReminderRows(rows, '', true)).toHaveLength(1)
  })

  it('prépare le lien promoteur sans numéro', () => {
    const url = deskReminderShareUrl('Relances du jour')
    expect(url?.startsWith('https://wa.me/?text=')).toBe(true)
    expect(deskReminderShareUrl('  ')).toBeNull()
  })

  it('écrit la date de la prochaine vague', () => {
    expect(formatReminderDay('2026-09-08')).toMatch(/8/)
    expect(formatReminderDay('2026-09-08')).toMatch(/septembre/i)
  })
})
