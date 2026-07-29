/** Libellés métier — remplace le jargon technique pour les utilisateurs non-tech */

/** Score 0–1 ou legacy 0–100 → pourcentage 0–100 pour l’UI. */
export function normalizeFraudScorePercent(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n <= 1 ? Math.round(n * 100) : Math.round(n)
}

export function labelPaymentLocked(locked?: boolean) {
  return locked ? 'Paiement suspendu' : 'Paiements autorisés'
}

export function labelBiometricStatus(status?: string) {
  const map: Record<string, string> = {
    READY: 'Identité vérifiée',
    PENDING: 'Enrôlement en attente',
    FAILED: 'Enrôlement à reprendre',
  }
  return map[status ?? ''] ?? status ?? 'Non renseigné'
}

export function labelFraudScore(score: number | null | undefined, suspicion?: boolean) {
  if (suspicion) return 'Vérification requise'
  if (score == null) return 'Risque non évalué'
  const pct = normalizeFraudScorePercent(score)
  if (pct >= 70) return 'Vérification requise — risque élevé'
  if (pct >= 40) return 'Contrôle recommandé'
  return 'Risque faible'
}

export function labelMoratorium(active?: boolean) {
  return active ? 'Relances suspendues (moratoire)' : null
}

export function labelVerificationStep(financeCheck: boolean, adminCheck: boolean) {
  if (adminCheck) return 'Traité'
  if (financeCheck) return 'En attente validation direction'
  return 'En attente validation finance'
}

export function labelKycStatus(status: string) {
  const map: Record<string, string> = {
    VERIFIED: 'Profil marchand validé',
    PENDING: 'Validation en cours',
    REJECTED: 'Profil refusé — à corriger',
    NOT_CONFIGURED: 'Profil à configurer',
  }
  return map[status] ?? status
}

/** Aligné sur backend MoratoriumType / Prisma */
export const MORATORIUM_TYPES = ['MONTHLY', 'QUARTERLY', 'EXCEPTIONAL', 'SCHOLARSHIP_REVIEW'] as const
export type MoratoriumType = (typeof MORATORIUM_TYPES)[number]

export function labelMoratoriumType(type: string) {
  const map: Record<string, string> = {
    MONTHLY: 'Mensuel',
    QUARTERLY: 'Trimestriel',
    EXCEPTIONAL: 'Exceptionnel (accord direction)',
    SCHOLARSHIP_REVIEW: 'Révision bourse',
  }
  return map[type] ?? type
}
