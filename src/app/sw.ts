/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkFirst, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * Cache Storage = assets / pages UI uniquement.
 * Le référentiel élèves et la file de scans vivent en IndexedDB (app), jamais ici.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Guichet : privilégier le réseau, repli cache pour ouverture hors ligne.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        (url.pathname === '/teacher/attendance' ||
          url.pathname.startsWith('/teacher/attendance/') ||
          url.pathname === '/teacher/dashboard'),
      handler: new NetworkFirst({
        cacheName: 'gate-pages',
        networkTimeoutSeconds: 3,
      }),
    },
    // Espace parents : réseau d'abord (données financières fraîches), repli cache pour l'ouverture hors ligne.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && (url.pathname === '/parent' || url.pathname.startsWith('/parent/')),
      handler: new NetworkFirst({
        cacheName: 'parent-pages',
        networkTimeoutSeconds: 4,
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          if (request.destination !== 'document') return false
          try {
            const path = new URL(request.url).pathname
            // Guichet précaché / NetworkFirst — ne pas écraser par /offline.
            if (path.startsWith('/teacher/attendance')) return false
          } catch {
            /* ignore */
          }
          return true
        },
      },
    ],
  },
})

serwist.addEventListeners()
