import type { AxiosResponse } from 'axios'
import { toFeeWaiverOutcome } from '@/lib/finance/fee-waiver'
import { normalizePendingVerification } from '@/lib/admin/normalizers'
import { isPromoterRole } from '@/types/auth'
import { verificationSteps } from '@/lib/finance/verification-steps'
import type { FeeWaiverRequestDto } from '@/types/finance'

function response(status: number, data: unknown): AxiosResponse<{ data?: unknown }> {
  return { status, data: { data } } as AxiosResponse<{ data?: unknown }>
}

const request = { id: 7, status: 'PENDING', kind: 'CREATE' } as FeeWaiverRequestDto

describe('toFeeWaiverOutcome — réponse du guichet', () => {
  it('202 : remise transmise au Promoteur', () => {
    expect(toFeeWaiverOutcome(response(202, { pendingApproval: true, request }))).toEqual({
      status: 'PENDING_APPROVAL',
      request,
    })
  })

  it('201 / 200 : attribution appliquée, réponse inchangée', () => {
    const assignment = { id: 70, type: 'ASSIGN' }
    expect(toFeeWaiverOutcome(response(201, assignment))).toEqual({ status: 'APPLIED', data: assignment })
    expect(toFeeWaiverOutcome(response(200, assignment))).toEqual({ status: 'APPLIED', data: assignment })
  })
})

describe('file de vérification — qui valide ?', () => {
  it('reprend requiresPromoterApproval du serveur', () => {
    expect(normalizePendingVerification({ verificationId: 1, requiresPromoterApproval: false }).requiresPromoterApproval)
      .toBe(false)
    expect(normalizePendingVerification({ verificationId: 1, requiresPromoterApproval: true }).requiresPromoterApproval)
      .toBe(true)
  })

  it('champ absent (ancien serveur) : par prudence, le Promoteur', () => {
    expect(normalizePendingVerification({ verificationId: 1 }).requiresPromoterApproval).toBe(true)
  })

  it('sous le seuil, une seule étape (guichet) ; au-dessus, guichet puis Promoteur', () => {
    expect(verificationSteps({ requiresPromoterApproval: false }).map((s) => s.label)).toEqual(['Guichet'])
    expect(verificationSteps({ requiresPromoterApproval: true }).map((s) => s.label)).toEqual([
      'Guichet',
      'Promoteur',
    ])
  })
})

describe('isPromoterRole — même liste que le backend (SCHOOL_ADMIN_ROLES)', () => {
  it.each(['ADMIN', 'SUPER_ADMIN', 'PROMOTER', 'SUPER_ADMIN_NETWORK'] as const)('%s : Promoteur', (role) => {
    expect(isPromoterRole(role)).toBe(true)
  })

  it.each(['FINANCE', 'IT', 'DIRECTOR', 'TEACHER', 'PARENT'] as const)('%s : passe par la validation', (role) => {
    expect(isPromoterRole(role)).toBe(false)
  })

  it('sans utilisateur : pas Promoteur', () => {
    expect(isPromoterRole(undefined)).toBe(false)
    expect(isPromoterRole(null)).toBe(false)
  })
})
