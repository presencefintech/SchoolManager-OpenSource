import { jsPDF } from 'jspdf'
import { formatMoney } from '@/lib/finance/currency'
import type { StudentsFinancialPrintReport } from '@/types/finance'

const PAGE_MARGIN = 36
const ROW_HEIGHT = 18
const HEADER_HEIGHT = 20

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

/** Construit un PDF téléchargeable (tableau paginé) à partir du registre filtré. */
export function buildStudentsFinancialPdf(
  report: StudentsFinancialPrintReport,
  currency?: string,
): Blob {
  const hideAmounts = Boolean(report.amountsHidden)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const usableWidth = pageWidth - PAGE_MARGIN * 2

  const columns = hideAmounts
    ? ['Matricule', 'Élève', 'Classe', 'Section', 'Option', 'Statut']
    : ['Matricule', 'Élève', 'Classe', 'Section', 'Option', 'Frais', 'Payé', 'Solde', 'Statut']
  const weights = hideAmounts ? [1.4, 2.4, 1.2, 1.4, 1.4, 1.4] : [1.2, 2, 1, 1.2, 1.2, 1.1, 1.1, 1.1, 1.1]
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const colWidths = weights.map((w) => (w / totalWeight) * usableWidth)
  const colX: number[] = []
  let x = PAGE_MARGIN
  for (const w of colWidths) {
    colX.push(x)
    x += w
  }

  function drawHeader(title: string) {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, PAGE_MARGIN, PAGE_MARGIN)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(113, 113, 122)
    pdf.text(
      `Généré le ${new Date(report.generatedAt).toLocaleString('fr-FR')} · ${report.schoolName}`,
      PAGE_MARGIN,
      PAGE_MARGIN + 14,
    )
    pdf.setTextColor(0, 0, 0)
  }

  function drawTableHeader(y: number): number {
    pdf.setFillColor(244, 244, 245)
    pdf.rect(PAGE_MARGIN, y, usableWidth, ROW_HEIGHT, 'F')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    columns.forEach((col, i) => {
      pdf.text(col.toUpperCase(), colX[i] + 4, y + ROW_HEIGHT - 6)
    })
    pdf.setFont('helvetica', 'normal')
    return y + ROW_HEIGHT
  }

  let y = PAGE_MARGIN + HEADER_HEIGHT + 20
  drawHeader(hideAmounts ? 'Liste en ordre / dette' : 'Situation financière')
  y = drawTableHeader(y)

  pdf.setFontSize(8)
  report.rows.forEach((r, idx) => {
    if (y + ROW_HEIGHT > pageHeight - PAGE_MARGIN) {
      pdf.addPage()
      y = PAGE_MARGIN
      y = drawTableHeader(y)
    }
    if (idx % 2 === 1) {
      pdf.setFillColor(250, 250, 250)
      pdf.rect(PAGE_MARGIN, y, usableWidth, ROW_HEIGHT, 'F')
    }
    const cells = hideAmounts
      ? [r.matricule, r.eleve, r.classe, r.section, r.option, r.statut]
      : [
          r.matricule,
          r.eleve,
          r.classe,
          r.section,
          r.option,
          formatMoney(r.fraisTotaux ?? 0, currency),
          formatMoney(r.dejaPaye ?? 0, currency),
          formatMoney(r.solde ?? 0, currency),
          r.statut,
        ]
    cells.forEach((cell, i) => {
      const text = String(cell ?? '')
      const maxWidth = colWidths[i] - 8
      const truncated = pdf.splitTextToSize(text, maxWidth)[0] ?? text
      pdf.text(truncated, colX[i] + 4, y + ROW_HEIGHT - 6)
    })
    y += ROW_HEIGHT
  })

  y += 16
  if (y + 40 > pageHeight - PAGE_MARGIN) {
    pdf.addPage()
    y = PAGE_MARGIN
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  const summaryParts = [
    `Élèves: ${report.summary.total}`,
    `Débiteurs: ${report.summary.debtors}`,
    `En ordre: ${report.summary.paid}`,
  ]
  if (!hideAmounts && report.summary.totalBalance != null) {
    summaryParts.push(`Solde total: ${formatMoney(report.summary.totalBalance, currency)}`)
  }
  pdf.text(summaryParts.join('   ·   '), PAGE_MARGIN, y)

  return pdf.output('blob')
}

export function downloadStudentsFinancialPdf(
  report: StudentsFinancialPrintReport,
  currency?: string,
  filename = `situation-financiere-${new Date().toISOString().slice(0, 10)}.pdf`,
): void {
  const blob = buildStudentsFinancialPdf(report, currency)
  triggerBlobDownload(blob, filename)
}
