import { CARD_HEIGHT_MM, CARD_WIDTH_MM } from './card-dimensions'

export type Cr80Placement = {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Placement image → page CR80.
 * - `cover` : remplit la page sans bandes blanches (léger crop si ratio ≠)
 * - `contain` : image entière visible (letterbox si besoin)
 * - `stretch` : force exactement la page (capture contrôlée à ratio CR80)
 */
export function computeCr80ImagePlacement(
  canvasWidth: number,
  canvasHeight: number,
  mode: 'cover' | 'contain' | 'stretch' = 'stretch',
  pageW = CARD_WIDTH_MM,
  pageH = CARD_HEIGHT_MM,
): Cr80Placement {
  if (!Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
    return { x: 0, y: 0, w: pageW, h: pageH }
  }

  if (mode === 'stretch') {
    return { x: 0, y: 0, w: pageW, h: pageH }
  }

  const imgRatio = canvasWidth / canvasHeight
  const pageRatio = pageW / pageH
  const ratioDelta = Math.abs(imgRatio - pageRatio) / pageRatio

  // Quasi-identique au format CR80 → pas de letterbox / crop
  if (ratioDelta < 0.012) {
    return { x: 0, y: 0, w: pageW, h: pageH }
  }

  if (mode === 'contain') {
    if (imgRatio > pageRatio) {
      const h = pageW / imgRatio
      return { x: 0, y: (pageH - h) / 2, w: pageW, h }
    }
    const w = pageH * imgRatio
    return { x: (pageW - w) / 2, y: 0, w, h: pageH }
  }

  // cover
  if (imgRatio > pageRatio) {
    const w = pageH * imgRatio
    return { x: (pageW - w) / 2, y: 0, w, h: pageH }
  }
  const h = pageW / imgRatio
  return { x: 0, y: (pageH - h) / 2, w: pageW, h }
}

export function sanitizePrintDocumentTitle(schoolName: string): string {
  const cleaned = schoolName.replace(/[<>&"'`]/g, '').trim()
  return cleaned.slice(0, 80) || 'Établissement'
}

/** Délai max avant fermeture fenêtre d’impression (dialogue utilisateur). */
export const PRINT_WINDOW_FALLBACK_MS = 120_000
