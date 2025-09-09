/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || (process.env.NODE_ENV === 'production'
  ? 'https://internal.ngicapital.com'
  : 'http://localhost:8001')

const nextConfig = {
  basePath: '/admin',
  transpilePackages: ['@ngi/ui'],
  // Note: Next.js 14 does not support trustHostHeader; rely on nginx proxy headers
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_ORIGIN}/api/:path*` },
      { source: '/api/auth/:path*', destination: `${BACKEND_ORIGIN}/api/auth/:path*` },
      { source: '/api/dashboard/:path*', destination: `${BACKEND_ORIGIN}/api/dashboard/:path*` },
      { source: '/api/entities/:path*', destination: `${BACKEND_ORIGIN}/api/entities/:path*` },
      { source: '/api/financial-reporting/:path*', destination: `${BACKEND_ORIGIN}/api/financial-reporting/:path*` },
      { source: '/api/journal-entries/:path*', destination: `${BACKEND_ORIGIN}/api/journal-entries/:path*` },
      { source: '/api/internal-controls/:path*', destination: `${BACKEND_ORIGIN}/api/internal-controls/:path*` },
      { source: '/api/health', destination: `${BACKEND_ORIGIN}/api/health` },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || BACKEND_ORIGIN,
    // Default admin base used by cross-app redirects (auth resolver, middleware)
    NEXT_PUBLIC_ADMIN_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_BASE_URL || 'http://localhost:3001/admin',
  },
  experimental: {
    externalDir: true,
  },
}

module.exports = nextConfig
