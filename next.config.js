const { spawnSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const withSerwistInit = require('@serwist/next').default

// A revision versions the precached /offline fallback so a stale copy is
// never served after a deploy changes it.
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() || randomUUID()

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Shell guichet + fallback : chargement instantané hors ligne après 1ère visite / install.
  additionalPrecacheEntries: [
    { url: '/offline', revision },
    { url: '/teacher/attendance', revision },
    { url: '/teacher/dashboard', revision },
    { url: '/icons/icon-192.png', revision },
    { url: '/icons/icon-512.png', revision },
    { url: '/icons/icon-512-maskable.png', revision },
  ],
  disable: process.env.NODE_ENV === 'development',
})

function originOf(url) {
  try {
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}

function buildContentSecurityPolicy() {
  const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL)
  const wsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : null
  const connect = [
    "'self'",
    apiOrigin,
    wsOrigin,
    'https://*.ingest.sentry.io',
    'https://*.ingest.de.sentry.io',
    'https://vitals.vercel-insights.com',
  ].filter(Boolean)
  return [
    "default-src 'self'",
    // Next.js 14 injecte des scripts inline (hydratation) + script de thème dans layout.tsx
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tree-shake lucide / framer barrels — big win on client chunk size
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
    instrumentationHook: true,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ]
    if (isProd) {
      securityHeaders.push({
        // Report-Only : signale les violations (console navigateur) sans rien bloquer.
        // Passer la clé à 'Content-Security-Policy' une fois la console propre en production.
        key: 'Content-Security-Policy-Report-Only',
        value: buildContentSecurityPolicy(),
      })
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/.well-known/:path*',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
  async rewrites() {
    // API + uploads : Route Handlers Next (/api/[...path], /api/auth/*, /api/uploads/*)
    return []
  },
}

module.exports = withSerwist(nextConfig)
