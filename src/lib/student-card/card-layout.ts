import {
  CARD_HEIGHT_MM,
  CARD_PREVIEW_HEIGHT_PX,
  CARD_PREVIEW_WIDTH_PX,
  CARD_WIDTH_MM,
} from './card-dimensions'

/** 96 dpi — source unique pour aperçu, export et impression */
export const MM_TO_PX = 96 / 25.4

export function mm(px: number): number {
  return Math.round(px * MM_TO_PX)
}

/** Facteur html2canvas pour export PDF haute résolution */
export const CARD_EXPORT_SCALE = 4

export const CARD = {
  widthPx: CARD_PREVIEW_WIDTH_PX,
  heightPx: CARD_PREVIEW_HEIGHT_PX,
  widthMm: CARD_WIDTH_MM,
  heightMm: CARD_HEIGHT_MM,
  stripeWidth: mm(2.2),
  header: {
    height: mm(12),
    marginLeft: mm(3.6),
    paddingX: mm(2.5),
    paddingY: mm(1.5),
  },
  logo: { size: mm(5.5), imgSize: mm(4.5) },
  body: {
    marginLeft: mm(3.6),
    paddingTop: mm(1.5),
    paddingRight: mm(2),
    paddingBottom: mm(1),
  },
  photo: { width: mm(15), height: mm(18) },
  identity: { paddingRight: mm(1), detailLabelWidth: mm(12) },
  qr: {
    colWidth: mm(16),
    boxSize: mm(16),
    imageSize: mm(13),
    padding: mm(1.2),
  },
  footer: {
    height: mm(6),
    marginLeft: mm(3.6),
    marginRight: mm(2.5),
    paddingTop: mm(1),
    paddingBottom: mm(1.2),
  },
  font: {
    logoInitial: 7,
    schoolName: 7.5,
    schoolCity: 5.5,
    brand: 5.5,
    brandSub: 4.5,
    lastName: 9,
    firstName: 8,
    gender: 5,
    matricule: 6.5,
    detailLabel: 5,
    detailValue: 5.5,
    qrLabel: 4.5,
    validity: 5.5,
    microId: 4.5,
  },
} as const
