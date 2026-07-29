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

export interface StudentCardExportOptions {
  /** Élément aperçu visible — capture WYSIWYG (recommandé) */
  sourceElement?: HTMLElement | null
  assets?: StudentCardAssets
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function captureCardElement(card: HTMLElement): Promise<Blob> {
  await waitForCardLayout(card)

  const canvas = await html2canvas(card, {
    scale: CARD_EXPORT_SCALE,
    width: CARD.widthPx,
    height: CARD.heightPx,
    windowWidth: CARD.widthPx,
    windowHeight: CARD.heightPx,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15_000,
    onclone: (doc, cloned) => {
      cloned.style.width = `${CARD.widthPx}px`
      cloned.style.height = `${CARD.heightPx}px`
      cloned.style.overflow = 'hidden'
      cloned.style.boxSizing = 'border-box'
      cloned.style.transform = 'none'

      // Anti-coupure : boîtes texte un peu plus hautes à la capture
      doc.querySelectorAll<HTMLElement>('.student-card [data-card-text="1"]').forEach((el) => {
        el.style.setProperty('overflow', 'hidden')
        el.style.setProperty('word-break', 'break-word')
        el.style.setProperty('-webkit-font-smoothing', 'antialiased')
      })
    },
  })

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  })

  pdf.addImage(
    canvas.toDataURL('image/png', 1.0),
    'PNG',
    0,
    0,
    CARD_WIDTH_MM,
    CARD_HEIGHT_MM,
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
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
    'overflow:hidden',
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

  const card = container.querySelector<HTMLElement>('.student-card')
  if (!card) {
    root.unmount()
    document.body.removeChild(container)
    throw new Error('Élément carte introuvable pour l\'export')
  }

  return {
    card,
    cleanup: () => {
      root?.unmount()
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

  const fromDom = findStudentCardElement(options?.sourceElement ?? null)
  if (fromDom) {
    return { card: fromDom, cleanup: () => {}, assets: resolved }
  }

  return { ...(await mountCardOffscreen(data, resolved)), assets: resolved }
}

async function renderCardBlob(
  data: StudentCardData,
  options?: StudentCardExportOptions,
): Promise<{ blob: Blob; assets: StudentCardAssets }> {
  const { card, cleanup, assets } = await resolveCardElement(data, options)
  try {
    const blob = await captureCardElement(card)
    return { blob, assets }
  } finally {
    cleanup()
  }
}

/** Télécharge le PDF — capture WYSIWYG de l'aperçu si `sourceElement` fourni */
export async function downloadStudentCardPdf(
  data: StudentCardData,
  filename: string,
  options?: StudentCardExportOptions,
): Promise<void> {
  const { blob } = await renderCardBlob(data, options)
  triggerBlobDownload(blob, filename)
}

const PRINT_PAGE_CSS = `
  @page { size: ${CARD_WIDTH_MM}mm ${CARD_HEIGHT_MM}mm; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${CARD_WIDTH_MM}mm;
    height: ${CARD_HEIGHT_MM}mm;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { display: flex; align-items: center; justify-content: center; }
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
    transform-origin: top left;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .student-card-qr-image {
    object-fit: contain !important;
    aspect-ratio: 1 / 1 !important;
  }
`

function openPrintDocument(
  schoolName: string,
  onMount: (mount: HTMLElement) => void,
): Window {
  const printWindow = window.open(
    '',
    '_blank',
    'noopener,noreferrer,width=480,height=320',
  )
  if (!printWindow) {
    throw new Error('Fenêtre d\'impression bloquée — autorisez les popups pour ce site.')
  }

  const safeTitle = schoolName.replace(/[<>&"]/g, '') || 'Établissement'

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
    throw new Error('Impossible de préparer la fenêtre d\'impression')
  }

  onMount(mount)

  return printWindow
}

/**
 * Impression isolée — fenêtre dédiée + @media print CR80.
 * Préfère `sourceElement` (aperçu visible) pour un rendu identique.
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
      clone.style.width = `${CARD.widthPx}px`
      clone.style.height = `${CARD.heightPx}px`
      mount.appendChild(clone)
    })

    await waitForCardLayout(printWindow.document.body)

    printWindow.focus()
    printWindow.print()

    printWindow.addEventListener('afterprint', () => printWindow.close())
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.close()
    }, 2_000)
    return
  }

  let root: Root | undefined
  const printWindow = openPrintDocument(data.schoolName, (mount) => {
    root = createRoot(mount)
    root.render(<StudentCardPreview data={data} assets={resolved} />)
  })

  try {
    await waitForCardLayout(printWindow.document.body)
    printWindow.focus()
    printWindow.print()
    printWindow.addEventListener('afterprint', () => {
      root?.unmount()
      printWindow.close()
    })
    window.setTimeout(() => {
      root?.unmount()
      if (!printWindow.closed) printWindow.close()
    }, 2_000)
  } catch (e) {
    if (root) root.unmount()
    printWindow.close()
    throw e
  }
}

/** Impression via classe body (aperçu déjà visible dans la page admin) */
export function printStudentCardInPlace(cardRoot: HTMLElement): void {
  const root = cardRoot.closest('.student-card-print-root') ?? cardRoot
  document.body.classList.add('student-card-printing')
  root.classList.add('student-card-print-target')

  const cleanup = () => {
    document.body.classList.remove('student-card-printing')
    root.classList.remove('student-card-print-target')
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
  window.setTimeout(cleanup, 3_000)
}

export { prepareStudentCardAssets, type StudentCardAssets }
