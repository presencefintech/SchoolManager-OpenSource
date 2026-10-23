import type { AxiosResponse } from 'axios'
import type { FeeWaiverOutcome, FeeWaiverRequestDto, FeeWaiverKind, FeeWaiverStatus } from '@/types/finance'

/**
 * Remises et exonérations : le backend répond 202 quand la saisie d'un non-Promoteur
 * réduit ce que doit l'élève (elle attend la validation du Promoteur), 200/201 sinon.
 */
export function toFeeWaiverOutcome<T>(
  response: AxiosResponse<{ data?: unknown }>,
): FeeWaiverOutcome<T> {
  if (response.status === 202) {
    const body = response.data?.data as { request: FeeWaiverRequestDto }
    return { status: 'PENDING_APPROVAL', request: body.request }
  }
  return { status: 'APPLIED', data: response.data?.data as T }
}

export const FEE_WAIVER_KIND_LABEL: Record<FeeWaiverKind, string> = {
  CREATE: 'Remise',
  UPDATE: 'Modification de remise',
  SCHOLARSHIP: 'Bourse',
}

export const FEE_WAIVER_STATUS_LABEL: Record<FeeWaiverStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
}

/** Message affiché au guichet quand la remise part chez le Promoteur. */
export const FEE_WAIVER_PENDING_MESSAGE =
  'L’élève doit le montant plein jusqu’à la validation du Promoteur.'
