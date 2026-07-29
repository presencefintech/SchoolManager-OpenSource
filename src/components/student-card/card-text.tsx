import type { CSSProperties, ReactNode } from 'react'
import { lineBoxStyle } from '@/lib/student-card/fit-font'

export interface CardTextProps {
  children: ReactNode
  lines?: 1 | 2
  fontSize: number
  style?: CSSProperties
  title?: string
}

/**
 * Zone texte à hauteur explicite — évite la coupure mid-glyph (html2canvas / overflow).
 */
export function CardText({ children, lines = 1, fontSize, style, title }: CardTextProps) {
  const box = lineBoxStyle(fontSize, lines)
  const text = String(children ?? '')

  const base: CSSProperties =
    lines === 1
      ? {
          display: 'block',
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: box.fontSize,
          lineHeight: box.lineHeight,
          minHeight: box.minHeight,
          maxHeight: box.minHeight,
        }
      : {
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          wordBreak: 'break-word',
          fontSize: box.fontSize,
          lineHeight: box.lineHeight,
          minHeight: box.minHeight,
          maxHeight: Math.ceil(box.fontSize * box.lineHeight * 2 + 1),
        }

  return (
    <span data-card-text="1" style={{ ...base, ...style }} title={title ?? text}>
      {children}
    </span>
  )
}
