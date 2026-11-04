import QRCode from 'qrcode'
import type { StudentCardData } from '@/types/student-card'
import { resolveCardQrPayload } from './utils'
import { validateQrPayload } from './validate-qr'

export interface StudentCardAssets {
  photoSrc: string
  qrDataUrl: string
  logoSrc: string | null
  qrScannable: boolean
  qrValidationReason?: string
}

function initialsFromName(firstName: string, lastName: string): string {
  const a = firstName.trim()[0] ?? ''
  const b = lastName.trim()[0] ?? ''
  return (a + b).toUpperCase() || '?'
}

function avatarHue(firstName: string, lastName: string): number {
  return `${firstName}${lastName}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
}

/** Avatar initiales en PNG data-URL (même rendu aperçu / PDF) */
export function createInitialsAvatarDataUrl(firstName: string, lastName: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const hue = avatarHue(firstName, lastName)
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  grad.addColorStop(0, `hsl(${hue} 45% 88%)`)
  grad.addColorStop(1, `hsl(${hue} 55% 62%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 96px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initialsFromName(firstName, lastName), canvas.width / 2, canvas.height / 2)

  return canvas.toDataURL('image/png')
}

/** Résout une URL relative backend (/uploads/…) vers le proxy authentifié Next */
export function normalizeAssetUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  // Photos du bucket privé : toujours via le proxy same-origin (évite CORS sur l'URL absolue du backend)
  const storageIdx = url.indexOf('/api/v1/storage/o/')
  if (storageIdx >= 0 && typeof window !== 'undefined') {
    return `${window.location.origin}${url.slice(storageIdx)}`
  }
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window !== 'undefined' && url.startsWith('/uploads/')) {
    return `${window.location.origin}/api${url}`
  }
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    return `${window.location.origin}${url}`
  }
  return url
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Charge une image distante ou blob en data-URL pour @react-pdf */
export async function resolveImageDataUrl(
  url: string | null | undefined,
  fallback: () => string,
): Promise<string> {
  if (!url?.trim()) return fallback()

  try {
    const resolved = normalizeAssetUrl(url.trim())
    if (resolved.startsWith('data:')) return resolved

    let response = await fetch(resolved, { credentials: 'include' }).catch(() => null)
    // URL absolue cross-origin : CORS refuse credentials + wildcard → nouvel essai sans cookies
    if (!response?.ok) response = await fetch(resolved, { credentials: 'omit' })
    if (!response.ok) return fallback()

    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return fallback()

    return await blobToDataUrl(blob)
  } catch {
    return fallback()
  }
}

const QR_RENDER_PX = 280
const QR_ERROR_LEVEL = 'H' as const

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: QR_ERROR_LEVEL,
    margin: 2,
    width: QR_RENDER_PX,
    type: 'image/png',
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })
}

/**
 * Prépare toutes les ressources bitmap avant rendu PDF.
 * Garantit que photo + QR sont chargés (pas de capture DOM fragile).
 */
export async function prepareStudentCardAssets(data: StudentCardData): Promise<StudentCardAssets> {
  const qrPayload = resolveCardQrPayload(data.studentId, data.matricule, data.qrPayload)
  const qrCheck = validateQrPayload(qrPayload)
  const photoFallback = () => createInitialsAvatarDataUrl(data.firstName, data.lastName)

  const [photoSrc, logoSrc, qrDataUrl] = await Promise.all([
    resolveImageDataUrl(data.photoUrl, photoFallback),
    data.schoolLogoUrl
      ? resolveImageDataUrl(data.schoolLogoUrl, () => '')
      : Promise.resolve(null),
    qrCheck.scannable ? generateQrDataUrl(qrPayload) : Promise.resolve(''),
  ])

  return {
    photoSrc: photoSrc || photoFallback(),
    logoSrc: logoSrc && logoSrc.length > 50 ? logoSrc : null,
    qrDataUrl,
    qrScannable: qrCheck.scannable && qrDataUrl.length > 100,
    qrValidationReason: qrCheck.reason,
  }
}
