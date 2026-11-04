import type { FeeScheduleLineDto } from '@/types/finance'

/** Reste à payer affiché d'une ligne (montant − payé si le serveur ne le fournit pas). */
export function displayedRemaining(line: Pick<FeeScheduleLineDto, 'amount' | 'amountPaid' | 'amountRemaining'>): number {
  if (line.amountRemaining != null) return Math.max(0, line.amountRemaining)
  return Math.max(0, Number(line.amount) - Number(line.amountPaid ?? 0))
}

/** Totaux du pied de tableau, arrondis au centime. */
export function scheduleTotals(lines: FeeScheduleLineDto[]): { billed: number; paid: number; remaining: number } {
  const sum = (pick: (l: FeeScheduleLineDto) => number) =>
    Number(lines.reduce((s, l) => s + pick(l), 0).toFixed(2))
  return {
    billed: sum((l) => Number(l.amount || 0)),
    paid: sum((l) => Number(l.amountPaid ?? 0)),
    remaining: sum(displayedRemaining),
  }
}

/** Montant saisi pour un encaissement partiel, borné à ]0, reste]. */
export function clampCollectAmount(raw: string, remaining: number): number {
  const parsed = Number(raw.replace(',', '.'))
  if (!Number.isFinite(parsed)) return Math.min(0.01, remaining)
  return Number(Math.min(Math.max(parsed, 0.01), remaining).toFixed(2))
}
