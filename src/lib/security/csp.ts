/** En-tête lu par le layout racine pour poser le nonce sur ses scripts inline. */
export const NONCE_HEADER = 'x-nonce'

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}

/** Nonce aléatoire par requête (runtime edge : Web Crypto uniquement). */
export function generateNonce(): string {
  return btoa(crypto.randomUUID())
}

/**
 * CSP bloquante. Les scripts ne s'exécutent que s'ils portent le nonce de la requête
 * (Next.js le pose sur ses propres scripts) ; `strict-dynamic` autorise les chunks
 * et scripts qu'ils chargent ensuite (webpack, Vercel Analytics).
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL)
  const wsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : null
  const connect = [
    "'self'",
    apiOrigin,
    wsOrigin,
    // Photos élèves / logos hébergés sur Cloudinary, rechargés en data-URL pour les cartes
    'https://res.cloudinary.com',
    'https://*.ingest.sentry.io',
    'https://*.ingest.de.sentry.io',
    'https://vitals.vercel-insights.com',
  ].filter(Boolean)

  return [
    "default-src 'self'",
    // `unsafe-eval` : requis uniquement par le rechargement à chaud en développement
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Attributs style="" (React, recharts, framer-motion) : pas de nonce possible
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}
