/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || (process.env.NODE_ENV === 'production'
  ? 'http://backend:8001'
  : 'http://localhost:8001')

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_ORIGIN}/api/:path*` },
    ]
  },
}
module.exports = nextConfig
