/** Origine API pour Socket.io (connexion directe backend, hors proxy Next). */
export function getSocketOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000'
  }
  return ''
}
