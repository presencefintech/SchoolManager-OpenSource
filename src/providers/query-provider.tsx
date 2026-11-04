'use client'

import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { QUERY_DEFAULTS, PERSIST_MAX_AGE } from '@/lib/query/config'
import { createIDBPersister, PERSIST_CACHE_BUSTER } from '@/lib/query/persist'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { ...QUERY_DEFAULTS },
          mutations: { retry: 0 },
        },
      }),
  )
  const [persister] = useState(() => createIDBPersister())

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, buster: PERSIST_CACHE_BUSTER }}
    >
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  )
}
