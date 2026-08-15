import { del, get, set } from 'idb-keyval'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'

const IDB_KEY = 'react-query-offline-cache'

/** Bump when a persisted query's shape changes in a breaking way. */
export const PERSIST_CACHE_BUSTER = '2'

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_KEY, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(IDB_KEY)
    },
    removeClient: async () => {
      await del(IDB_KEY)
    },
  }
}

/** Called on logout so the next session on this device never sees stale cached data. */
export async function clearPersistedQueryCache(): Promise<void> {
  await del(IDB_KEY)
}
