import type { PendingVerificationItem } from '@/types/admin'

export type VerificationStep = {
  key: 'finance' | 'admin'
  label: string
  field: 'financeCheck' | 'adminCheck'
}

const DESK_STEP: VerificationStep = { key: 'finance', label: 'Guichet', field: 'financeCheck' }
const PROMOTER_STEP: VerificationStep = { key: 'admin', label: 'Promoteur', field: 'adminCheck' }

/**
 * Étapes d'un paiement manuel sur preuve : sous le seuil de validation du Promoteur,
 * la validation du guichet suffit ; au-dessus, le guichet contrôle puis le Promoteur valide.
 */
export function verificationSteps(
  item: Pick<PendingVerificationItem, 'requiresPromoterApproval'>,
): VerificationStep[] {
  return item.requiresPromoterApproval ? [DESK_STEP, PROMOTER_STEP] : [DESK_STEP]
}
