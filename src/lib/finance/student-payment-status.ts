export type StudentPaymentStatusCounts = {
  total: number
  paid: number
  debtors: number
}

export type StudentPaymentStatusView = {
  inOrder: number
  debtors: number
  total: number
  solvencyPct: number | null
  sentence: string | null
}

/** Pourcentage d’élèves en ordre. Total nul → pas de pourcentage inventé. */
export function presentStudentPaymentStatus(
  meta: StudentPaymentStatusCounts,
): StudentPaymentStatusView {
  const total = Number.isFinite(meta.total) ? Math.max(0, Math.trunc(meta.total)) : 0
  const inOrder = Number.isFinite(meta.paid) ? Math.max(0, Math.trunc(meta.paid)) : 0
  const debtors = Number.isFinite(meta.debtors) ? Math.max(0, Math.trunc(meta.debtors)) : 0
  if (total <= 0) {
    return { inOrder, debtors, total, solvencyPct: null, sentence: null }
  }
  const solvencyPct = Math.min(100, Math.round((inOrder / total) * 100))
  return {
    inOrder,
    debtors,
    total,
    solvencyPct,
    sentence: `${solvencyPct} % des élèves en ordre`,
  }
}
