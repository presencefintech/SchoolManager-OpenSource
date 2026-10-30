import { describe, expect, it } from '@jest/globals'
import { describeStages, formatCampaignKey, parseOffsets } from '../debt-reminder-stages'

describe('parseOffsets', () => {
  it('accepte les jours négatifs, trie et dédoublonne', () => {
    expect(parseOffsets('15, -3 1;7, 7')).toEqual([-3, 1, 7, 15])
  })

  it('ignore ce qui sort des bornes ou n’est pas entier', () => {
    expect(parseOffsets('-31, 2.5, abc, 121, 0')).toEqual([0])
  })
})

describe('describeStages', () => {
  it('ton qui monte : amical, échéance, ferme, dernier avis', () => {
    expect(describeStages([-3, 1, 7, 15])).toEqual([
      { offset: -3, tone: 'pre' },
      { offset: 1, tone: 'due' },
      { offset: 7, tone: 'firm' },
      { offset: 15, tone: 'final' },
    ])
  })

  it('un seul jour après échéance : dernier avis', () => {
    expect(describeStages([-5, 3])).toEqual([
      { offset: -5, tone: 'pre' },
      { offset: 3, tone: 'final' },
    ])
  })
})

describe('formatCampaignKey', () => {
  it('rend la clé lisible', () => {
    expect(formatCampaignKey('J+7@2026-11-05')).toBe('J+7 · échéance 05/11/2026')
    expect(formatCampaignKey('J+15#R2@2026-11-05')).toBe('J+15 (répétition 2) · échéance 05/11/2026')
    expect(formatCampaignKey('J-3@2026-11-05')).toBe('J-3 · échéance 05/11/2026')
    expect(formatCampaignKey('manual')).toBe('Envoi manuel')
    expect(formatCampaignKey('2026-10-J3')).toBe('2026-10-J3')
  })
})
