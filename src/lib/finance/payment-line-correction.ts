import type { PaymentFeeLine, StudentPaymentDetail } from '@/lib/finance/payment-history.utils'

export type ActiveLine = PaymentFeeLine & { id: number }

export function activeLinesOf(payment: StudentPaymentDetail): ActiveLine[] {
  return payment.fees.filter((f): f is ActiveLine => f.id != null && !f.reversedAt)
}

/** Seuls les encaissements espèces confirmés avec au moins une ligne active sont corrigeables. */
export function isCorrectable(payment: StudentPaymentDetail): boolean {
  return (
    payment.method === 'CASH' &&
    payment.amount > 0 &&
    (payment.status === 'CONFIRMED' || payment.status === 'RECONCILED') &&
    activeLinesOf(payment).length > 0
  )
}

/** Clé de regroupement mensuel — même règle que assertMonthlyCorrectionSuffix (backend). */
export function monthlyKey(line: ActiveLine): number | null {
  return line.monthYear && line.feeStructureId != null ? line.feeStructureId : null
}

/**
 * Applique la règle « suffixe » : pour un barème mensuel, cocher un mois coche aussi
 * les mois plus récents ; décocher un mois décoche aussi les plus anciens.
 * monthYear est au format YYYY-MM : l'ordre lexicographique est chronologique.
 */
export function toggleWithSuffixRule(
  lines: ActiveLine[],
  selected: ReadonlySet<number>,
  line: ActiveLine,
): Set<number> {
  const next = new Set(selected)
  const key = monthlyKey(line)
  if (key == null) {
    if (next.has(line.id)) next.delete(line.id)
    else next.add(line.id)
    return next
  }
  const siblings = lines
    .filter((l) => monthlyKey(l) === key)
    .sort((a, b) => String(a.monthYear).localeCompare(String(b.monthYear)))
  const idx = siblings.findIndex((l) => l.id === line.id)
  if (next.has(line.id)) {
    siblings.slice(0, idx + 1).forEach((l) => next.delete(l.id))
  } else {
    siblings.slice(idx).forEach((l) => next.add(l.id))
  }
  return next
}
