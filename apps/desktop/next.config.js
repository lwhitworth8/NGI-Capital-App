/** @type {import('next').NextConfig} */
// Prefer explicit BACKEND_ORIGIN. In production, default to the public API domain
// so a missing env on Vercel still points to the correct API.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || (process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.ngicapitaladvisory.com')
  : 'http://localhost:8002')

// If deploying the Admin app to its own domain (e.g., admin.example.com),
// we should not prefix routes with /admin and should not redirect '/' away.
// Toggle this with ADMIN_STANDALONE_DOMAIN=1 in the environment.
const IS_STANDALONE = (process.env.ADMIN_STANDALONE_DOMAIN || '0') === '1'

const path = require('path')

const nextConfig = {
  // Only apply basePath when NOT on a standalone admin domain
  ...(IS_STANDALONE ? {} : { basePath: '/admin' }),
  transpilePackages: ['@ngi/ui', '@openai/chatkit-react'],
  // Note: Next.js 14 does not support trustHostHeader; rely on nginx proxy headers
  typescript: {
    // Temporarily ignore build errors due to @types/react version conflicts in monorepo
    // These are type-only errors and don't affect runtime. See NEXT_JS_15_MIGRATION_STATUS.md
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
  async redirects() {
    // On a standalone admin domain, keep '/' as the admin landing (no redirect)
    if (IS_STANDALONE) return []
    return [
      {
        // Redirect admin root to marketing homepage (student base URL)
        source: '/',
        destination: process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001',
        permanent: false,
      },
    ]
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
      { source: '/api/accounting/:path*', destination: `${BACKEND_ORIGIN}/api/accounting/:path*` },
      { source: '/api/health', destination: `${BACKEND_ORIGIN}/api/health` },
      { source: '/api/chatkit/:path*', destination: `${BACKEND_ORIGIN}/api/chatkit/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND_ORIGIN}/uploads/:path*` },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || BACKEND_ORIGIN,
    // Default admin base used by cross-app redirects (auth resolver, middleware)
    NEXT_PUBLIC_ADMIN_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_BASE_URL || 'http://localhost:3001/admin',
    // Propagate Clerk publishable key to client if only CLERK_PUBLISHABLE_KEY is set in env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,
    // Surface issuer for any client-side flows that need it (safe)
    NEXT_PUBLIC_CLERK_ISSUER: process.env.NEXT_PUBLIC_CLERK_ISSUER || process.env.CLERK_ISSUER,
    // Disable legacy session bridge retries by default (backend returns 410)
    NEXT_PUBLIC_DISABLE_SESSION_BRIDGE: process.env.NEXT_PUBLIC_DISABLE_SESSION_BRIDGE || '1',
    // Base path for API routes
    NEXT_PUBLIC_BASE_PATH: IS_STANDALONE ? '' : '/admin',
    // Feature flag to toggle NEX orb visibility (default off for v1)
    NEXT_PUBLIC_ENABLE_NEX: process.env.NEXT_PUBLIC_ENABLE_NEX || 'false',
  },
  experimental: {
    externalDir: true,
    outputFileTracingRoot: __dirname,
  },
  webpack: (config) => {
    const path = require('path')
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    // Remove any sidebar shims; use shared UI package as-is
    delete config.resolve.alias['@ngi/ui']
    delete config.resolve.alias['@ngi/ui/components/layout']
    return config
  },
}

module.exports = nextConfig
