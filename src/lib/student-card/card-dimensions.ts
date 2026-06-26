/** Format badge CR80 — ISO/IEC 7810 ID-1 */
export const CARD_WIDTH_MM = 85.6
export const CARD_HEIGHT_MM = 54

/** Aperçu écran : 96 dpi → mm × 3.7795 */
export const CARD_PREVIEW_WIDTH_PX = Math.round(CARD_WIDTH_MM * 3.7795)
export const CARD_PREVIEW_HEIGHT_PX = Math.round(CARD_HEIGHT_MM * 3.7795)

export const STATUS_COLORS = {
  current: '#059669',
  alert: '#dc2626',
  standard: '#2563eb',
} as const
