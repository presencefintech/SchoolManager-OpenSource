import { describe, expect, it } from '@jest/globals'
import { presentJournalPace } from '../cash-journal'

describe('presentJournalPace', () => {
  it('écrit la ligne du jour, d’hier et de la semaine avec les deux devises', () => {
    const view = presentJournalPace({
      today: { usd: 80, cdf: 0 },
      yesterday: { usd: 50, cdf: 0 },
      week: { usd: 420, cdf: 0 },
    })
    expect(view.sentence).toMatch(/^Aujourd'hui /)
    expect(view.sentence).toContain('hier')
    expect(view.sentence).toContain('cette semaine')
    expect(view.today).toMatch(/80/)
    expect(view.today).toMatch(/\$US/)
    expect(view.today).toContain('·')
    expect(view.trend).toBe('up')
  })

  it('retire la flèche quand les montants sont masqués', () => {
    const view = presentJournalPace({
      today: { usd: null, cdf: null },
      yesterday: { usd: null, cdf: null },
      week: { usd: null, cdf: null },
    })
    expect(view.trend).toBeNull()
    expect(view.today).toBe('—')
  })
})
