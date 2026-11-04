export type CashTenderPreview = {
  short: boolean
  changeUsd: number
  changeCdf: number
  requiredCdf: number
  message: string | null
}

/**
 * Aperçu guichet. Le serveur, au taux officiel, reste la référence au moment de valider.
 * Le dû est dans la devise de l'école (`dueCurrency`) : cette devise est appliquée
 * d'abord, le reliquat est converti dans l'autre (même règle que settleCashTender).
 */
export function previewCashTender(
  due: number,
  paidUsd: number,
  paidCdf: number,
  rate: number | null,
  dueCurrency: 'USD' | 'CDF' = 'USD',
): CashTenderPreview {
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
  if (dueCurrency === 'CDF') return previewCdfDue(Math.round(due), paidUsdCents, paidCdfUnits, rate)

  const dueCents = Math.round(due * 100)
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

/** École en francs : CDF d'abord, reliquat en USD au taux (tolérance 0,01 $). */
function previewCdfDue(
  dueCdf: number,
  paidUsdCents: number,
  paidCdfUnits: number,
  rate: number | null,
): CashTenderPreview {
  const appliedCdf = Math.min(paidCdfUnits, dueCdf)
  const changeCdf = paidCdfUnits - appliedCdf
  const remainingCdf = dueCdf - appliedCdf
  const hasRate = rate != null && rate > 0
  if ((remainingCdf > 0 || paidUsdCents > 0) && !hasRate) {
    return {
      short: true,
      changeUsd: 0,
      changeCdf,
      requiredCdf: 0,
      message: 'Taux du jour indisponible pour convertir la part en dollars.',
    }
  }
  const requiredUsdCents = remainingCdf > 0 ? Math.round((remainingCdf / (rate as number)) * 100) : 0
  const gap = requiredUsdCents - paidUsdCents
  if (gap > 1) {
    return {
      short: true,
      changeUsd: 0,
      changeCdf: 0,
      requiredCdf: remainingCdf,
      message: `Encaissement insuffisant. Il reste ${remainingCdf.toLocaleString('fr-CD')} FC, soit ${(requiredUsdCents / 100).toFixed(2)} $ (reçu : ${(paidUsdCents / 100).toFixed(2)} $).`,
    }
  }
  return {
    short: false,
    changeUsd: gap <= 0 ? (paidUsdCents - requiredUsdCents) / 100 : 0,
    changeCdf,
    requiredCdf: remainingCdf,
    message: null,
  }
}
