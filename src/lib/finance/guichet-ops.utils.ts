import type { TenderCurrency } from '@/lib/finance/congo-money.utils'

const AUTO_PRINT_KEY = 'finance.guichet.autoPrintThermal'
export const DUPLICATE_WINDOW_MS = 15 * 60 * 1000

/** Repli mémoire (SSR / jsdom sans localStorage fiable). */
let autoPrintMemory: boolean | null = null

export type RecentPaymentLike = {
  id: number
  amount: number
  method?: string
  createdAt: string
  reference?: string
}

/** Détecte un encaissement similaire récent (anti double-guichet). */
export function findRecentSimilarPayment(
  payments: RecentPaymentLike[] | undefined,
  opts: {
    amount: number
    method: string
    withinMs?: number
    now?: number
  },
): RecentPaymentLike | null {
  if (!payments?.length || opts.amount <= 0) return null
  const within = opts.withinMs ?? DUPLICATE_WINDOW_MS
  const now = opts.now ?? Date.now()
  const method = opts.method.toUpperCase()
  const amount = Number(opts.amount.toFixed(2))

  for (const p of payments) {
    const created = new Date(p.createdAt).getTime()
    if (!Number.isFinite(created) || now - created > within) continue
    if (Math.abs(Number(p.amount) - amount) > 0.01) continue
    if ((p.method ?? '').toUpperCase() !== method) continue
    return p
  }
  return null
}

export function getAutoPrintThermalPreference(defaultValue = true): boolean {
  if (autoPrintMemory != null) return autoPrintMemory
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = window.localStorage.getItem(AUTO_PRINT_KEY)
    if (raw == null) return defaultValue
    return raw === '1' || raw === 'true'
  } catch {
    return defaultValue
  }
}

export function setAutoPrintThermalPreference(enabled: boolean): void {
  autoPrintMemory = enabled
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AUTO_PRINT_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore quota */
  }
}

/** Test-only reset. */
export function __resetAutoPrintPreferenceForTests(): void {
  autoPrintMemory = null
}

const DRAFT_KEY_PREFIX = 'finance.guichet.payDraft.v1:'

export type GuichetPaymentDraft = {
  studentId: number
  method?: string
  reference?: string
  comment?: string
  payerName?: string
  payerPhone?: string
  proofType?: string
  manualJustification?: string
  catalogAmount?: number
  savedAt: string
}

export function saveGuichetPaymentDraft(draft: GuichetPaymentDraft): void {
  if (typeof window === 'undefined' || draft.studentId <= 0) return
  try {
    window.localStorage.setItem(
      `${DRAFT_KEY_PREFIX}${draft.studentId}`,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    )
  } catch {
    /* ignore */
  }
}

export function loadGuichetPaymentDraft(studentId: number): GuichetPaymentDraft | null {
  if (typeof window === 'undefined' || studentId <= 0) return null
  try {
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${studentId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GuichetPaymentDraft
    if (!parsed?.savedAt) return null
    const age = Date.now() - new Date(parsed.savedAt).getTime()
    // Brouillon valable 2 h (coupure courant / refresh)
    if (!Number.isFinite(age) || age > 2 * 60 * 60 * 1000) {
      clearGuichetPaymentDraft(studentId)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearGuichetPaymentDraft(studentId: number): void {
  if (typeof window === 'undefined' || studentId <= 0) return
  try {
    window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${studentId}`)
  } catch {
    /* ignore */
  }
}

export function formatMinutesAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const mins = Math.max(0, Math.round((now - t) / 60_000))
  if (mins < 1) return "à l'instant"
  if (mins === 1) return 'il y a 1 min'
  return `il y a ${mins} min`
}

/** Espèces disponibles en caisse (fond + encaissé cash session). */
export function availableDrawerCashUsd(
  openingFloat?: number | null,
  cashCollected?: number | null,
): number {
  const open = Number(openingFloat) || 0
  const collected = Number(cashCollected) || 0
  return Math.max(0, open + collected)
}

/**
 * True si le rendu demandé dépasse le fond disponible (problème classique guichet RDC).
 * `changeUsd` = montant à rendre converti en USD.
 */
export function changeExceedsDrawer(
  changeUsd: number | null | undefined,
  availableUsd: number,
): boolean {
  if (changeUsd == null || !Number.isFinite(changeUsd) || changeUsd <= 0.01) return false
  return changeUsd > availableUsd + 0.01
}

export type { TenderCurrency }
