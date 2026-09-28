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
  additionalPrecacheEntries: [{ url: '/offline', revision }],
  disable: process.env.NODE_ENV === 'development',
})

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
    // Content-Security-Policy : posée par le middleware (nonce par requête, src/lib/security/csp.ts)
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
