/** Politique cache React Query v5 — source unique (staleTime / gcTime) */
export const QUERY_DEFAULTS = {
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const

/** Profils par type de donnée */
export const STALE = {
  /** Écoles, barèmes — changent rarement */
  static: 5 * 60_000,
  /** Listes élèves, dashboard */
  standard: 60_000,
  /** Présence live, audit récent */
  live: 15_000,
  /** Dashboard présence temps réel */
  realtime: 0,
} as const
