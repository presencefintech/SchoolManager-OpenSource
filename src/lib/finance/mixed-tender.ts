export type CashTenderPreview = {
  short: boolean
  changeUsd: number
  changeCdf: number
  requiredCdf: number
  message: string | null
}

/**
 * Aperçu guichet. Le serveur, au taux officiel, reste la référence au moment de valider.
 * Les dollars sont appliqués d'abord ; le reliquat est converti en francs (demi supérieur).
 */
export function previewCashTender(
  dueUsd: number,
  paidUsd: number,
  paidCdf: number,
  rate: number | null,
): CashTenderPreview {
  const dueCents = Math.round(dueUsd * 100)
  const paidUsdCents = Math.round((Number.isFinite(paidUsd) ? paidUsd : 0) * 100)
  const paidCdfUnits = Math.round(Number.isFinite(paidCdf) ? paidCdf : 0)
  if (paidUsdCents <= 0 && paidCdfUnits <= 0) {
    return {
      short: true,
      changeUsd: 0,
      changeCdf: 0,
      requiredCdf: 0,
      message: 'Indiquez le montant remis en USD, en CDF, ou les deux.',
    }
  }
  const appliedCents = Math.min(paidUsdCents, dueCents)
  const changeUsd = (paidUsdCents - appliedCents) / 100
  const remainingCents = dueCents - appliedCents
  if (remainingCents > 0 && !(rate != null && rate > 0)) {
    return {
      short: true,
      changeUsd,
      changeCdf: 0,
      requiredCdf: 0,
      message: 'Taux du jour indisponible pour convertir la part en francs.',
    }
  }
  const requiredCdf = remainingCents > 0 ? Math.round((remainingCents / 100) * (rate ?? 0)) : 0
  const gap = requiredCdf - paidCdfUnits
  if (gap > 1) {
    return {
      short: true,
      changeUsd,
      changeCdf: 0,
      requiredCdf,
      message: `Encaissement insuffisant. Il reste ${requiredCdf.toLocaleString('fr-CD')} FC (reçu : ${paidCdfUnits.toLocaleString('fr-CD')} FC).`,
    }
  }
  const changeCdf = gap <= 0 ? paidCdfUnits - requiredCdf : 0
  return {
    short: false,
    changeUsd,
    changeCdf,
    requiredCdf,
    message: null,
  }
}
