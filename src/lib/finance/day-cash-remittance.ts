import { formatDualMoney, usdToCdf } from '@/lib/finance/congo-money.utils'
import { formatMoney } from '@/lib/finance/currency'

/** Ligne du rapport espèces du jour (groupBy Prisma). */
export type DayCashReportRow = {
  method?: string
  _count?: { id?: number }
  _sum?: { amount?: number | null }
}

/** Mouvements de caisse déjà sortis ou rentrés (USD comptable). */
export type DayCashLedgerSnapshot = {
  versements?: number
  renflouements?: number
  retraits?: number
  netUsd?: number
}

/** Session ouverte — sert à retrouver le net de tiroir (petite caisse incluse). */
export type OpenTillSnapshot = {
  openingFloatUsd?: number | null
  openingFloatCdf?: number | null
  expectedCashUsd?: number | null
  cashCollectedUsd?: number | null
  pettyCashUsd?: number | null
  physicalCashUsd?: number | null
  physicalCashCdf?: number | null
  physicalCashCdfInUsd?: number | null
  /** Taux figé sur la session (ExchangeRate du jour). 1 = taux absent. */
  fxRate?: number | null
  ledger?: DayCashLedgerSnapshot | null
}

export type DayCashAmountLine = {
  primary: string
  secondary: string | null
}

export type DayCashRowView = {
  key: string
  method: string
  countLabel: string
  amount: DayCashAmountLine
}

export type DayCashBreakdownLine = {
  label: string
  primary: string
}

export type DayCashPhysicalSplit = {
  title: string
  usd: string
  cdf: string
  cdfBookHint: string | null
}

export type DayCashCollectionsView = {
  rows: DayCashRowView[]
  total: DayCashAmountLine
  totalHint: string | null
  collectedUsd: number
  remitUsd: number
  remitCdf: number | null
  banner: string
  rateLabel: string | null
  adjustmentNote: string | null
  physical: DayCashPhysicalSplit | null
  breakdown: DayCashBreakdownLine[]
  floatNote: string | null
  scopeNote: string | null
  shareText: string
  whatsappUrl: string
  showBanner: boolean
}

const DRAWER_MATCH_USD = 0.02

function roundUsd(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(2))
}

function activeRate(rate: number | null | undefined): number | null {
  const value = Number(rate)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Le taux de la session vaut 1 quand aucun cours n’a été trouvé. */
function pickDayRate(
  schoolRate: number | null | undefined,
  tillRate: number | null | undefined,
): number | null {
  const till = activeRate(tillRate)
  if (till != null && till > 1) return till
  return activeRate(schoolRate)
}

function sameDrawer(dayCashUsd: number, till: OpenTillSnapshot | null | undefined): boolean {
  const opening = till?.openingFloatUsd
  const expected = till?.expectedCashUsd
  const sessionCollected = till?.cashCollectedUsd
  return (
    opening != null &&
    expected != null &&
    sessionCollected != null &&
    Number.isFinite(Number(opening)) &&
    Number.isFinite(Number(expected)) &&
    Number.isFinite(Number(sessionCollected)) &&
    Math.abs(roundUsd(Number(sessionCollected)) - roundUsd(dayCashUsd)) <= DRAWER_MATCH_USD
  )
}

/** Net des mouvements : renflouements − versements banque − retraits. */
export function ledgerNetUsd(ledger: DayCashLedgerSnapshot | null | undefined): number {
  if (!ledger) return 0
  if (ledger.netUsd != null && Number.isFinite(Number(ledger.netUsd))) {
    return roundUsd(Number(ledger.netUsd))
  }
  const renflouements = Number(ledger.renflouements) || 0
  const versements = Number(ledger.versements) || 0
  const retraits = Number(ledger.retraits) || 0
  return roundUsd(renflouements - versements - retraits)
}

export function sumDayCashUsd(rows: DayCashReportRow[]): number {
  return roundUsd(
    rows.reduce((total, row) => total + (Number(row._sum?.amount) || 0), 0),
  )
}

/**
 * Montant à remettre au promoteur.
 * Le fond d'ouverture n'est pas dans les encaissements du jour : il reste dans le tiroir.
 * Si la session ouverte correspond à ce total, on reprend le net serveur
 * (encaissé + mouvements − petite caisse). Sinon on déduit les mouvements connus.
 */
export function netCashToRemitUsd(
  dayCashUsd: number,
  till: OpenTillSnapshot | null | undefined,
): number {
  const collected = roundUsd(dayCashUsd)
  if (sameDrawer(collected, till)) {
    return roundUsd(Number(till?.expectedCashUsd) - Number(till?.openingFloatUsd))
  }

  return roundUsd(collected + ledgerNetUsd(till?.ledger))
}

export function dualAmountLine(
  amountUsd: number,
  rate: number | null | undefined,
): DayCashAmountLine {
  const dual = formatDualMoney(roundUsd(amountUsd), activeRate(rate))
  return {
    primary: dual.primary,
    secondary: dual.secondary ?? null,
  }
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function formatPromoterRemittanceBanner(
  remitUsd: number,
  rate: number | null | undefined,
): string {
  const line = dualAmountLine(remitUsd, rate)
  if (!line.secondary) return `À remettre au promoteur : ${line.primary}`
  return `À remettre au promoteur : ${line.primary} / ${line.secondary}`
}

function movementLines(
  ledger: DayCashLedgerSnapshot | null | undefined,
  rate: number | null,
  pettyUsd: number,
): DayCashBreakdownLine[] {
  const lines: DayCashBreakdownLine[] = []
  const versements = Number(ledger?.versements) || 0
  const renflouements = Number(ledger?.renflouements) || 0
  const retraits = Number(ledger?.retraits) || 0
  const hasParts = Math.abs(versements) > 0.009 || Math.abs(renflouements) > 0.009 || Math.abs(retraits) > 0.009

  const push = (label: string, amountUsd: number) => {
    if (Math.abs(amountUsd) <= 0.009) return
    lines.push({ label, primary: dualAmountLine(amountUsd, rate).primary })
  }

  if (hasParts) {
    push('Versé en banque', versements)
    push('Retrait', retraits)
    push('Renflouement', renflouements)
  } else if (ledger?.netUsd != null && Math.abs(Number(ledger.netUsd)) > 0.009) {
    push('Mouvements de caisse', Number(ledger.netUsd))
  }
  push('Petite caisse', pettyUsd)
  return lines
}

function physicalSplit(
  till: OpenTillSnapshot | null | undefined,
  matchesDrawer: boolean,
): DayCashPhysicalSplit | null {
  const usd = Number(till?.physicalCashUsd)
  const cdf = Number(till?.physicalCashCdf)
  const hasUsd = Number.isFinite(usd) && usd > 0.009
  const hasCdf = Number.isFinite(cdf) && cdf > 0.009
  if (!hasUsd && !hasCdf) return null
  const book = Number(till?.physicalCashCdfInUsd)
  return {
    title: matchesDrawer ? 'Billets dans le tiroir' : 'Billets de ce guichet',
    usd: formatMoney(hasUsd ? usd : 0, 'USD'),
    cdf: formatMoney(hasCdf ? cdf : 0, 'CDF'),
    cdfBookHint:
      hasCdf && Number.isFinite(book) && book > 0.009
        ? `valeur comptable ${formatMoney(book, 'USD')}`
        : null,
  }
}

function floatNoteFor(till: OpenTillSnapshot | null | undefined): string | null {
  const usd = Number(till?.openingFloatUsd)
  const cdf = Number(till?.openingFloatCdf)
  const hasUsd = Number.isFinite(usd) && usd > 0.009
  const hasCdf = Number.isFinite(cdf) && cdf > 0.009
  if (!hasUsd && !hasCdf) return null
  const parts = [
    hasUsd ? formatMoney(usd, 'USD') : null,
    hasCdf ? formatMoney(cdf, 'CDF') : null,
  ].filter((part): part is string => part != null)
  return `Fond d'ouverture de ${parts.join(' et ')} : il reste dans le tiroir.`
}

function shareTextFor(input: {
  banner: string
  rateLabel: string | null
  physical: DayCashPhysicalSplit | null
  floatNote: string | null
}): string {
  const lines = ['Encaissements du jour', input.banner]
  if (input.rateLabel) lines.push(input.rateLabel)
  if (input.physical) {
    lines.push(`${input.physical.title} : ${input.physical.usd} et ${input.physical.cdf}`)
  }
  if (input.floatNote) lines.push(input.floatNote)
  return lines.join('\n')
}

export function openTillSnapshotFromSession(
  session: {
    openingFloat?: number | null
    openingBalance?: number | null
    openingFloatCdf?: number | null
    expectedCash?: number | null
    cashCollected?: number | null
    totalCollected?: number | null
    ledgerTotals?: DayCashLedgerSnapshot | null
    summary?: {
      openingFloat?: number | null
      openingBalance?: number | null
      expectedCash?: number | null
      cashCollected?: number | null
      totalCollected?: number | null
      ledgerTotals?: DayCashLedgerSnapshot | null
      dualTotals?: {
        cashUsd?: number
        cashCdf?: number
        cashCdfInUsd?: number
        fxRate?: number
      } | null
      reconciliation?: { pettyCashUsd?: number | null } | null
    } | null
  } | null | undefined,
): OpenTillSnapshot | null {
  if (!session) return null
  const summary = session.summary
  const opening = summary?.openingFloat ?? summary?.openingBalance ?? session.openingFloat ?? session.openingBalance
  const collected = summary?.cashCollected ?? summary?.totalCollected ?? session.cashCollected ?? session.totalCollected
  const expected = summary?.expectedCash ?? session.expectedCash
  const dual = summary?.dualTotals
  return {
    openingFloatUsd: opening != null ? Number(opening) : null,
    openingFloatCdf: session.openingFloatCdf != null ? Number(session.openingFloatCdf) : null,
    expectedCashUsd: expected != null ? Number(expected) : null,
    cashCollectedUsd: collected != null ? Number(collected) : null,
    pettyCashUsd: summary?.reconciliation?.pettyCashUsd != null ? Number(summary.reconciliation.pettyCashUsd) : null,
    physicalCashUsd: dual?.cashUsd != null ? Number(dual.cashUsd) : null,
    physicalCashCdf: dual?.cashCdf != null ? Number(dual.cashCdf) : null,
    physicalCashCdfInUsd: dual?.cashCdfInUsd != null ? Number(dual.cashCdfInUsd) : null,
    fxRate: dual?.fxRate != null ? Number(dual.fxRate) : null,
    ledger: session.ledgerTotals ?? summary?.ledgerTotals ?? null,
  }
}

export function buildDayCashCollectionsView(input: {
  rows: DayCashReportRow[]
  rate: number | null | undefined
  till?: OpenTillSnapshot | null
}): DayCashCollectionsView {
  const till = input.till ?? null
  const rate = pickDayRate(input.rate, till?.fxRate)
  const rows = Array.isArray(input.rows) ? input.rows : []
  const collectedUsd = sumDayCashUsd(rows)
  const matchesDrawer = sameDrawer(collectedUsd, till)
  const remitUsd = netCashToRemitUsd(collectedUsd, till)
  const remitCdf = rate != null ? usdToCdf(remitUsd, rate) : null
  const totalDual = formatDualMoney(collectedUsd, rate)
  const differs = Math.abs(remitUsd - collectedUsd) > 0.009
  const pettyUsd = matchesDrawer ? Number(till?.pettyCashUsd) || 0 : 0
  const physical = physicalSplit(till, matchesDrawer)
  const floatNote = floatNoteFor(till)
  const banner = formatPromoterRemittanceBanner(remitUsd, rate)
  const rateLabel = totalDual.rateLabel ? `Taux du jour · ${totalDual.rateLabel}` : null
  const shareText = shareTextFor({ banner, rateLabel, physical, floatNote })

  return {
    rows: rows.map((row, index) => ({
      key: `${row.method ?? 'espece'}-${index}`,
      method: row.method?.trim() || '—',
      countLabel: `${Number(row._count?.id) || 0} transaction(s)`,
      amount:
        row._sum?.amount == null
          ? { primary: '—', secondary: null }
          : dualAmountLine(Number(row._sum.amount) || 0, rate),
    })),
    total: {
      primary: totalDual.primary,
      secondary: totalDual.secondary ?? null,
    },
    totalHint: totalDual.secondary ? 'Équivalent au taux du jour' : null,
    collectedUsd,
    remitUsd,
    remitCdf,
    banner,
    rateLabel,
    adjustmentNote: differs
      ? 'Versements, renflouements et retraits déjà passés sont déduits du montant à remettre.'
      : null,
    physical,
    breakdown: movementLines(till?.ledger, rate, pettyUsd),
    floatNote,
    scopeNote:
      physical && !matchesDrawer
        ? 'Les billets sont ceux de ce guichet. Le total additionne les espèces de toute l’école.'
        : null,
    shareText,
    whatsappUrl: whatsAppShareUrl(shareText),
    showBanner: rows.length > 0 || Math.abs(remitUsd) > 0.009,
  }
}
