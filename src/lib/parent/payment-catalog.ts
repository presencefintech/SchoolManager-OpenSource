import type { PaymentMethodCode, PaymentMethods } from '@/lib/parent/api'

export type CatalogCategory = 'MOBILE_MONEY' | 'BANK' | 'AGGREGATOR' | 'CARD'

export interface CatalogOption {
  code: string
  label: string
  subtitle: string
  category: CatalogCategory
  method: PaymentMethodCode
  needsPhone: boolean
}

const KNOWN: Record<string, { label: string; subtitle: string }> = {
  MPESA: { label: 'M-Pesa', subtitle: 'Paiement mobile Vodacom RDC' },
  AIRTEL: { label: 'Airtel Money', subtitle: 'Paiement mobile Airtel' },
  ORANGE: { label: 'Orange Money', subtitle: 'Paiement mobile Orange' },
}

const SUBTITLE: Record<CatalogCategory, string> = {
  BANK: 'Virement bancaire',
  MOBILE_MONEY: 'Paiement mobile',
  AGGREGATOR: 'Passerelle de paiement',
  CARD: 'Carte bancaire',
}

/** Code API de la méthode (enum `PayFeesBody.method`) — miroir de `_methodFor` côté Flutter. */
function methodFor(code: string, category: CatalogCategory): PaymentMethodCode {
  switch (category) {
    case 'BANK':
      return 'BANK'
    case 'MOBILE_MONEY':
      if (code === 'AIRTEL' || code === 'AIRTEL_MONEY') return 'AIRTEL_MONEY'
      if (code === 'ORANGE' || code === 'ORANGE_MONEY') return 'ORANGE_MONEY'
      return 'MPESA'
    default:
      return 'CARD'
  }
}

/** Construit les options de paiement à partir de `GET /payments/methods`. */
export function buildCatalogOptions(catalog: PaymentMethods | undefined): CatalogOption[] {
  if (!catalog) return []
  const ordered = new Map<string, CatalogCategory>()
  const register = (code: string, category: CatalogCategory) => {
    const key = code.toUpperCase()
    if (!ordered.has(key)) ordered.set(key, category)
  }

  const groups: [CatalogCategory, { code?: string }[] | undefined][] = [
    ['MOBILE_MONEY', catalog.methods?.MOBILE_MONEY],
    ['BANK', catalog.methods?.BANK],
    ['AGGREGATOR', catalog.methods?.AGGREGATOR],
    ['CARD', catalog.methods?.CARD],
  ]
  for (const [category, options] of groups) {
    if (category !== 'MOBILE_MONEY') continue
    for (const o of options ?? []) if (o.code) register(o.code, category)
  }
  for (const code of catalog.mobileMoney ?? []) register(code, 'MOBILE_MONEY')

  return [...ordered.entries()].map(([code, category]) => ({
    code,
    label: KNOWN[code]?.label ?? code,
    subtitle: KNOWN[code]?.subtitle ?? SUBTITLE[category],
    category,
    method: methodFor(code, category),
    needsPhone: category === 'MOBILE_MONEY',
  }))
}

export function resolveGateway(option: CatalogOption, _catalog?: PaymentMethods): string {
  return option.code
}
