/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
 async redirects() {
    return [
      { source: '/favicon.ico', destination: '/favicon.svg', permanent: false },
    ]
  },
  async rewrites() {
async rewrites() {
  const backendUrl = process.env.API_URL ?? 'http://localhost:5000'
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
