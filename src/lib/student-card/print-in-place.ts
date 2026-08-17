/** Impression via classes body (sans popup) — fallback si window.open bloqué. */

import { PRINT_WINDOW_FALLBACK_MS } from './export-geometry'

export function printStudentCardInPlace(cardRoot: HTMLElement): void {
  const root = (cardRoot.closest('.student-card-print-root') as HTMLElement | null) ?? cardRoot
  document.body.classList.add('student-card-printing')
  root.classList.add('student-card-print-target')

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    document.body.classList.remove('student-card-printing')
    root.classList.remove('student-card-print-target')
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  try {
    window.print()
  } catch {
    cleanup()
    throw new Error('Impossible de lancer l\'impression navigateur.')
  }
  window.setTimeout(cleanup, PRINT_WINDOW_FALLBACK_MS)
}
