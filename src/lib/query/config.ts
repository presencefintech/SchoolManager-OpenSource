/** Politique cache React Query v5 — source unique (staleTime / gcTime) */
export const QUERY_DEFAULTS = {
  staleTime: 60_000,
  // >= PERSIST_MAX_AGE (lib/query/persist.ts) so a restored persisted cache
  // isn't immediately garbage-collected — see TanStack persistQueryClient docs.
  gcTime: 60 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
} as const

/** Max age of the IndexedDB-persisted cache before it's silently discarded. */
export const PERSIST_MAX_AGE = 60 * 60_000

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
