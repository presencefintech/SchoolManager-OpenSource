import { describe, expect, it } from '@jest/globals'
import {
  deskReminderShareUrl,
  filterDeskReminderRows,
  formatReminderDay,
  planBulkReminders,
  planSelectedReminders,
  toggleVisibleSelection,
} from '../desk-reminders'

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

  it('garde une file de liens tant que la messagerie n’est pas branchée', () => {
    const plan = planBulkReminders(rows, false)
    expect(plan.mode).toBe('queue')
    expect(plan.reachable).toHaveLength(1)
    expect(plan.missingPhone).toHaveLength(1)
    expect(planBulkReminders(rows, true).mode).toBe('api')
  })

  it('sélectionne toute la liste filtrée puis prépare WhatsApp ou SMS', () => {
    const visible = [
      { studentId: 1, whatsappUrl: 'https://wa.me/243811111111?text=a', smsUrl: 'sms:+243811111111?body=a', preferredChannel: 'whatsapp' as const },
      { studentId: 2, whatsappUrl: 'https://wa.me/243822222222?text=b', smsUrl: 'sms:+243822222222?body=b', preferredChannel: 'sms' as const },
      { studentId: 3, whatsappUrl: null, smsUrl: null, preferredChannel: 'sms' as const },
    ]
    const all = toggleVisibleSelection([1, 2], new Set())
    expect([...all].sort()).toEqual([1, 2])
    expect([...toggleVisibleSelection([1, 2], all)]).toEqual([])
    const plan = planSelectedReminders(visible, all, new Map([[2, 'sms']]))
    expect(plan.reachable.map((item) => item.channel)).toEqual(['whatsapp', 'sms'])
    expect(plan.reachable[1].url.startsWith('sms:+243822222222?body=')).toBe(true)
    expect(plan.missingPhone).toHaveLength(0)
    const withMissing = planSelectedReminders(visible, new Set([3]), new Map())
    expect(withMissing.reachable).toHaveLength(0)
    expect(withMissing.missingPhone).toHaveLength(1)
  })
})
