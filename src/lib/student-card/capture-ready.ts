import { CARD_EXPORT_SCALE } from './card-layout'

export async function waitForDocumentFonts(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready
  }
}

export async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return
      if (typeof img.decode === 'function') {
        try {
          await img.decode()
          return
        } catch {
          /* fallback onload */
        }
      }
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })
    }),
  )
}

export async function waitForCardLayout(root: HTMLElement): Promise<void> {
  await waitForDocumentFonts()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  await waitForImages(root)
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export function findStudentCardElement(
  source?: HTMLElement | null,
): HTMLElement | null {
  if (!source) return null
  if (source.classList.contains('student-card')) return source
  return source.querySelector<HTMLElement>('.student-card')
}

export { CARD_EXPORT_SCALE }
