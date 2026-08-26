'use client'

import { createRoot, type Root } from 'react-dom/client'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { StudentCardData } from '@/types/student-card'
import { StudentCardPreview } from '@/components/student-card/student-card-preview'
import { CARD_HEIGHT_MM, CARD_WIDTH_MM } from './card-dimensions'
import { CARD } from './card-layout'
import {
  CARD_EXPORT_SCALE,
  findStudentCardElement,
  waitForCardLayout,
} from './capture-ready'
import { prepareStudentCardAssets, type StudentCardAssets } from './resolve-assets'
import { printStudentCardInPlace } from './print-in-place'
import {
  computeCr80ImagePlacement,
  PRINT_WINDOW_FALLBACK_MS,
  sanitizePrintDocumentTitle,
} from './export-geometry'

export interface StudentCardExportOptions {
  /** Élément aperçu visible — cloné hors écran pour éviter découpe (transform parent) */
  sourceElement?: HTMLElement | null
  assets?: StudentCardAssets
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Laisser le temps au navigateur d’amorcer le téléchargement
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

function applyCr80BoxStyles(el: HTMLElement, unit: 'px' | 'mm'): void {
  const w = unit === 'px' ? `${CARD.widthPx}px` : `${CARD_WIDTH_MM}mm`
  const h = unit === 'px' ? `${CARD.heightPx}px` : `${CARD_HEIGHT_MM}mm`
  el.style.position = 'relative'
  el.style.width = w
  el.style.height = h
  el.style.minWidth = w
  el.style.minHeight = h
  el.style.maxWidth = w
  el.style.maxHeight = h
  el.style.transform = 'none'
  el.style.margin = '0'
  el.style.boxSizing = 'border-box'
  el.style.overflow = 'hidden'
}

/**
 * Clone hors écran à taille CR80 fixe — évite la découpe html2canvas
 * quand l’aperçu est dans un panneau scrollable / transformé.
 */
async function captureCardToCanvas(sourceCard: HTMLElement): Promise<HTMLCanvasElement> {
  const mount = document.createElement('div')
  mount.setAttribute('aria-hidden', 'true')
  mount.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${CARD.widthPx}px`,
    `height:${CARD.heightPx}px`,
    'opacity:1',
    'pointer-events:none',
    'z-index:-1',
    'overflow:visible',
    'background:#fff',
  ].join(';')

  const clone = sourceCard.cloneNode(true) as HTMLElement
  applyCr80BoxStyles(clone, 'px')

  mount.appendChild(clone)
  document.body.appendChild(mount)

  try {
    await waitForCardLayout(clone)

    const canvas = await html2canvas(clone, {
      scale: CARD_EXPORT_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15_000,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: CARD.widthPx,
      height: CARD.heightPx,
      windowWidth: CARD.widthPx,
      windowHeight: CARD.heightPx,
      onclone: (_doc, cloned) => {
        applyCr80BoxStyles(cloned, 'px')
      },
    })

    if (!canvas.width || !canvas.height) {
      throw new Error('Capture carte vide — réessayez après chargement complet de la photo/QR.')
    }

    return canvas
  } finally {
    if (mount.parentNode) document.body.removeChild(mount)
  }
}

async function canvasToCr80Pdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: CARD_WIDTH_MM >= CARD_HEIGHT_MM ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
    compress: true,
  })

  // Capture CR80 : contain évite de recadrer si html2canvas ajoute 1 px
  const place = computeCr80ImagePlacement(canvas.width, canvas.height, 'contain')

  pdf.addImage(
    canvas.toDataURL('image/png', 1.0),
    'PNG',
    place.x,
    place.y,
    place.w,
    place.h,
    undefined,
    'FAST',
  )

  return pdf.output('blob')
}

async function mountCardOffscreen(
  data: StudentCardData,
  assets: StudentCardAssets,
): Promise<{ card: HTMLElement; cleanup: () => void }> {
  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${CARD.widthPx}px`,
    `height:${CARD.heightPx}px`,
    'opacity:1',
    'pointer-events:none',
    'z-index:-1',
    'overflow:visible',
  ].join(';')
  document.body.appendChild(container)

  let root: Root | null = createRoot(container)

  await new Promise<void>((resolve, reject) => {
    try {
      root!.render(<StudentCardPreview data={data} assets={assets} />)
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    } catch (e) {
      reject(e)
    }
  })

  await waitForCardLayout(container)

  const card = container.querySelector<HTMLElement>('.student-card')
  if (!card) {
    root.unmount()
    document.body.removeChild(container)
    throw new Error('Élément carte introuvable pour l\'export')
  }

  return {
    card,
    cleanup: () => {
      try {
        root?.unmount()
      } catch {
        /* ignore */
      }
      root = null
      if (container.parentNode) document.body.removeChild(container)
    },
  }
}

async function resolveCardElement(
  data: StudentCardData,
  options?: StudentCardExportOptions,
): Promise<{ card: HTMLElement; cleanup: () => void; assets: StudentCardAssets }> {
  const resolved = options?.assets ?? (await prepareStudentCardAssets(data))

  if (!resolved.qrScannable) {
    throw new Error(
      resolved.qrValidationReason ?? 'QR code non scannable — vérifiez les données élève.',
    )
  }

  // Toujours remonter hors écran : le clone du DOM visible est recadré
  // par overflow / transform du panneau d’aperçu.
  return { ...(await mountCardOffscreen(data, resolved)), assets: resolved }
}

async function renderCardBlob(
  data: StudentCardData,
  options?: StudentCardExportOptions,
): Promise<{ blob: Blob; assets: StudentCardAssets }> {
  const { card, cleanup, assets } = await resolveCardElement(data, options)
  try {
    const canvas = await captureCardToCanvas(card)
    const blob = await canvasToCr80Pdf(canvas)
    return { blob, assets }
  } finally {
    cleanup()
  }
}

/** Télécharge le PDF CR80 — capture sans découpe */
export async function downloadStudentCardPdf(
  data: StudentCardData,
  filename: string,
  options?: StudentCardExportOptions,
): Promise<void> {
  const { blob } = await renderCardBlob(data, options)
  if (!blob.size) {
    throw new Error('PDF carte vide — export impossible.')
  }
  triggerBlobDownload(blob, filename)
}

const PRINT_PAGE_CSS = `
  @page { size: ${CARD_WIDTH_MM}mm ${CARD_HEIGHT_MM}mm; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: ${CARD_WIDTH_MM}mm;
    height: ${CARD_HEIGHT_MM}mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow: hidden;
  }
  body { display: block; }
  .student-card-print-mount {
    width: ${CARD_WIDTH_MM}mm;
    height: ${CARD_HEIGHT_MM}mm;
    overflow: hidden;
  }
  .student-card {
    width: ${CARD_WIDTH_MM}mm !important;
    height: ${CARD_HEIGHT_MM}mm !important;
    min-width: ${CARD_WIDTH_MM}mm !important;
    min-height: ${CARD_HEIGHT_MM}mm !important;
    max-width: ${CARD_WIDTH_MM}mm !important;
    max-height: ${CARD_HEIGHT_MM}mm !important;
    transform: none !important;
    margin: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .student-card-qr-image {
    object-fit: contain !important;
    aspect-ratio: 1 / 1 !important;
  }
`

/**
 * Ouvre une fenêtre d’impression.
 * Ne pas passer `noopener` dans windowFeatures — certains navigateurs
 * renvoient alors `null` (faux positif « popup bloquée »).
 */
function openPrintDocument(
  schoolName: string,
  onMount: (mount: HTMLElement) => void,
): Window | null {
  const printWindow = window.open('', '_blank', 'width=520,height=360')
  if (!printWindow) return null

  try {
    printWindow.opener = null
  } catch {
    /* ignore */
  }

  const safeTitle = sanitizePrintDocumentTitle(schoolName)

  printWindow.document.open()
  printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Carte élève — ${safeTitle}</title>
  <style>${PRINT_PAGE_CSS}</style>
</head>
<body>
  <div id="mount" class="student-card-print-mount"></div>
</body>
</html>`)
  printWindow.document.close()

  const mount = printWindow.document.getElementById('mount')
  if (!mount) {
    printWindow.close()
    return null
  }

  onMount(mount)
  return printWindow
}

function schedulePrintWindowClose(printWindow: Window, unmount?: () => void): void {
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    try {
      unmount?.()
    } catch {
      /* ignore */
    }
    if (!printWindow.closed) printWindow.close()
  }

  printWindow.addEventListener('afterprint', close)
  window.setTimeout(close, PRINT_WINDOW_FALLBACK_MS)
}

async function runPrintInWindow(printWindow: Window, unmount?: () => void): Promise<void> {
  await waitForCardLayout(printWindow.document.body)
  // Laisser le layout mm/px se stabiliser avant le dialogue
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  printWindow.focus()
  printWindow.print()
  schedulePrintWindowClose(printWindow, unmount)
}

/**
 * Impression isolée — fenêtre dédiée CR80.
 * Si popup bloquée → fallback impression in-place (sans nouvelle fenêtre).
 */
export async function printStudentCard(
  data: StudentCardData,
  options?: StudentCardExportOptions,
): Promise<void> {
  const resolved = options?.assets ?? (await prepareStudentCardAssets(data))

  if (!resolved.qrScannable) {
    throw new Error(
      resolved.qrValidationReason ?? 'QR code non scannable — vérifiez les données élève.',
    )
  }

  const fromDom = findStudentCardElement(options?.sourceElement ?? null)

  if (fromDom) {
    const printWindow = openPrintDocument(data.schoolName, (mount) => {
      const clone = fromDom.cloneNode(true) as HTMLElement
      applyCr80BoxStyles(clone, 'mm')
      mount.appendChild(clone)
    })

    if (!printWindow) {
      printStudentCardInPlace(fromDom)
      return
    }

    await runPrintInWindow(printWindow)
    return
  }

  let root: Root | undefined
  const printWindow = openPrintDocument(data.schoolName, (mount) => {
    root = createRoot(mount)
    root.render(<StudentCardPreview data={data} assets={resolved} />)
  })

  if (!printWindow) {
    const { card, cleanup } = await mountCardOffscreen(data, resolved)
    try {
      printStudentCardInPlace(card)
      await new Promise((r) => setTimeout(r, 800))
    } finally {
      cleanup()
    }
    return
  }

  try {
    await runPrintInWindow(printWindow, () => root?.unmount())
  } catch (e) {
    root?.unmount()
    if (!printWindow.closed) printWindow.close()
    throw e
  }
}

export { printStudentCardInPlace } from './print-in-place'
export { prepareStudentCardAssets, type StudentCardAssets }
