import type { ReceiptVerifyFailureReason, ReceiptVerifyResult } from '@/types/receipt-verify'

const REASON_LABELS: Record<ReceiptVerifyFailureReason, string> = {
  INVALID_TOKEN: 'QR code invalide ou illisible.',
  INVALID_CODE: 'Code PF incorrect ou ne correspond pas au reçu.',
  NOT_FOUND: 'Reçu introuvable dans le système.',
  NOT_CONFIRMED: 'Le paiement n\'est pas encore confirmé.',
  SIGNATURE_MISMATCH: 'Signature de sécurité incorrecte — reçu suspect.',
  RECEIPT_INCOMPLETE: 'Données du reçu incomplètes.',
}

export function receiptVerifyReasonLabel(reason: ReceiptVerifyFailureReason): string {
  return REASON_LABELS[reason] ?? 'Reçu non vérifiable.'
}

function parseApiBody(body: unknown): {
  data?: ReceiptVerifyResult
  errors?: { reason?: ReceiptVerifyFailureReason }
} {
  if (body && typeof body === 'object') {
    return body as {
      data?: ReceiptVerifyResult
      errors?: { reason?: ReceiptVerifyFailureReason }
    }
  }
  return {}
}

function failureFromResponse(
  body: ReturnType<typeof parseApiBody>,
  fallback: ReceiptVerifyFailureReason,
): ReceiptVerifyResult {
  const reason =
    body.errors?.reason ??
    (body.data && !body.data.valid ? body.data.reason : undefined) ??
    fallback
  return { valid: false, reason }
}

export async function fetchReceiptVerification(token: string): Promise<ReceiptVerifyResult> {
  const apiBase = process.env.API_URL ?? 'http://localhost:5000'
  const res = await fetch(`${apiBase}/api/v1/receipts/verify/${encodeURIComponent(token)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const body = parseApiBody(await res.json().catch(() => ({})))

  if (res.ok && body.data?.valid) {
    return body.data
  }

  return failureFromResponse(body, 'INVALID_TOKEN')
}

export async function fetchReceiptLookup(
  receiptNumber: string,
  code: string,
): Promise<ReceiptVerifyResult> {
  const apiBase = process.env.API_URL ?? 'http://localhost:5000'
  const params = new URLSearchParams({
    receiptNumber: receiptNumber.trim(),
    code: code.trim(),
  })

  const res = await fetch(`${apiBase}/api/v1/receipts/lookup?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const body = parseApiBody(await res.json().catch(() => ({})))

  if (res.ok && body.data?.valid) {
    return body.data
  }

  return failureFromResponse(body, 'INVALID_CODE')
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  ORANGE_MONEY: 'Orange Money',
  BANK: 'Virement bancaire',
  CARD: 'Carte bancaire',
}

export function formatReceiptMethod(method: string): string {
  return METHOD_LABELS[method] ?? method
}

export function formatReceiptDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function integrityLevelLabel(level: string): string {
  if (level === 'CERTIFIED') return 'Certifié'
  if (level === 'SUSPECT') return 'À contrôler'
  return 'Rejeté'
}
