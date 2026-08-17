import type { DocumentVerifyFailureReason, DocumentVerifyResult } from '@/types/document-verify'

const REASON_LABELS: Record<DocumentVerifyFailureReason, string> = {
  INVALID_TOKEN: 'QR code invalide ou illisible.',
  INVALID_CODE: 'Code SM incorrect ou ne correspond pas au document.',
  NOT_FOUND: 'Document introuvable dans SchoolManager.',
  SIGNATURE_MISMATCH: 'Signature de sécurité incorrecte — document suspect.',
  DOCUMENT_INCOMPLETE: 'Données du document incomplètes.',
}

export function documentVerifyReasonLabel(reason: DocumentVerifyFailureReason): string {
  return REASON_LABELS[reason] ?? 'Document non vérifiable.'
}

export function documentIntegrityLabel(level: string): string {
  if (level === 'CERTIFIED') return 'Certifié SchoolManager'
  if (level === 'SUSPECT') return 'À contrôler'
  return 'Rejeté'
}

function parseApiBody(body: unknown): {
  data?: DocumentVerifyResult
  errors?: { reason?: DocumentVerifyFailureReason }
} {
  if (body && typeof body === 'object') {
    return body as {
      data?: DocumentVerifyResult
      errors?: { reason?: DocumentVerifyFailureReason }
    }
  }
  return {}
}

function failureFromResponse(
  body: ReturnType<typeof parseApiBody>,
  fallback: DocumentVerifyFailureReason,
): DocumentVerifyResult {
  const reason =
    body.errors?.reason ??
    (body.data && !body.data.valid ? body.data.reason : undefined) ??
    fallback
  return { valid: false, reason }
}

export async function fetchDocumentVerification(token: string): Promise<DocumentVerifyResult> {
  const apiBase = process.env.API_URL ?? 'http://localhost:5000'
  const res = await fetch(`${apiBase}/api/v1/documents/verify/${encodeURIComponent(token)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const body = parseApiBody(await res.json().catch(() => ({})))
  if (res.ok && body.data?.valid) return body.data
  return failureFromResponse(body, 'INVALID_TOKEN')
}

export async function fetchDocumentLookup(
  documentRef: string,
  code: string,
): Promise<DocumentVerifyResult> {
  const apiBase = process.env.API_URL ?? 'http://localhost:5000'
  const params = new URLSearchParams({
    documentRef: documentRef.trim(),
    code: code.trim(),
  })
  const res = await fetch(`${apiBase}/api/v1/documents/lookup?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const body = parseApiBody(await res.json().catch(() => ({})))
  if (res.ok && body.data?.valid) return body.data
  return failureFromResponse(body, 'INVALID_CODE')
}

export function formatDocumentDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
