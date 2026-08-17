import {
  computeCr80ImagePlacement,
  sanitizePrintDocumentTitle,
} from '../export-geometry'
import { CARD_HEIGHT_MM, CARD_WIDTH_MM } from '../card-dimensions'

describe('computeCr80ImagePlacement', () => {
  it('stretch remplit exactement la page CR80', () => {
    expect(computeCr80ImagePlacement(324, 204, 'stretch')).toEqual({
      x: 0,
      y: 0,
      w: CARD_WIDTH_MM,
      h: CARD_HEIGHT_MM,
    })
  })

  it('ratio CR80 exact → plein cadre même en contain', () => {
    expect(computeCr80ImagePlacement(856, 540, 'contain')).toEqual({
      x: 0,
      y: 0,
      w: CARD_WIDTH_MM,
      h: CARD_HEIGHT_MM,
    })
  })

  it('contain letterboxe une image trop large', () => {
    const place = computeCr80ImagePlacement(2000, 500, 'contain')
    expect(place.w).toBe(CARD_WIDTH_MM)
    expect(place.h).toBeLessThan(CARD_HEIGHT_MM)
    expect(place.y).toBeGreaterThan(0)
  })

  it('cover remplit sans bande pour image trop haute', () => {
    const place = computeCr80ImagePlacement(500, 2000, 'cover')
    expect(place.w).toBe(CARD_WIDTH_MM)
    expect(place.h).toBeGreaterThan(CARD_HEIGHT_MM)
    expect(place.y).toBeLessThan(0)
  })

  it('canvas invalide → fallback plein cadre', () => {
    expect(computeCr80ImagePlacement(0, 0, 'contain')).toEqual({
      x: 0,
      y: 0,
      w: CARD_WIDTH_MM,
      h: CARD_HEIGHT_MM,
    })
  })
})

describe('sanitizePrintDocumentTitle', () => {
  it('échappe le HTML et coupe long titre', () => {
    expect(sanitizePrintDocumentTitle('<script>x</script> Lycée')).toBe('scriptx/script Lycée')
    expect(sanitizePrintDocumentTitle('')).toBe('Établissement')
    expect(sanitizePrintDocumentTitle('A'.repeat(100)).length).toBe(80)
  })
})
