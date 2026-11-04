/** Taille minimale du QR sur la carte (mm) — en dessous, scan imprimé dégradé */
export const QR_MIN_SIZE_MM = 13

/** Max caractères pour QR ~14 mm imprimé (niveau H) */
export const QR_MAX_PAYLOAD_LENGTH = 900

export interface QrValidationResult {
  scannable: boolean
  reason?: string
  payloadLength: number
}

export function validateQrPayload(payload: string): QrValidationResult {
  const trimmed = payload.trim()
  if (!trimmed) {
    return { scannable: false, reason: 'Payload QR vide', payloadLength: 0 }
  }
  if (trimmed.length > QR_MAX_PAYLOAD_LENGTH) {
    return {
      scannable: false,
      reason: 'Payload QR trop long pour une lecture fiable',
      payloadLength: trimmed.length,
    }
  }
  return { scannable: true, payloadLength: trimmed.length }
}
