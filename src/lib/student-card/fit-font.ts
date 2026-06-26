/** Réduit la taille de police si le texte dépasse la capacité visuelle de la zone */
export function fitFontSize(
  text: string,
  basePx: number,
  maxChars: number,
  minPx: number,
): number {
  const len = text.trim().length
  if (len <= maxChars) return basePx
  return Math.max(minPx, Math.round(basePx * (maxChars / len)))
}

export function lineBoxStyle(fontSize: number, lines: 1 | 2 = 1): {
  fontSize: number
  lineHeight: number
  minHeight: number
  maxHeight: number
} {
  const lineHeight = lines === 1 ? 1.12 : 1.15
  const height = Math.ceil(fontSize * lineHeight * lines)
  return {
    fontSize,
    lineHeight,
    minHeight: height,
    maxHeight: height * (lines === 2 ? 1 : 1),
  }
}
