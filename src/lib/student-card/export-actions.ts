import type { StudentCardData } from '@/types/student-card'
import type { StudentCardAssets } from '@/lib/student-card/resolve-assets'
import type { StudentCardExportOptions } from '@/lib/student-card/export-pdf'

/** Charge html2canvas + jspdf uniquement à l'export (économie ~400 Ko sur le bundle initial) */
export async function downloadStudentCardPdf(
  data: StudentCardData,
  filename: string,
  options?: StudentCardExportOptions,
): Promise<void> {
  const { downloadStudentCardPdf: run } = await import('@/lib/student-card/export-pdf')
  return run(data, filename, options)
}

export async function printStudentCard(
  data: StudentCardData,
  options?: StudentCardExportOptions,
): Promise<void> {
  const { printStudentCard: run } = await import('@/lib/student-card/export-pdf')
  return run(data, options)
}

export async function prepareStudentCardAssets(data: StudentCardData): Promise<StudentCardAssets> {
  const { prepareStudentCardAssets: run } = await import('@/lib/student-card/resolve-assets')
  return run(data)
}

export type { StudentCardExportOptions }
