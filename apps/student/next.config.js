/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || (process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.ngicapitaladvisory.com')
  : 'http://localhost:8002')

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  output: 'standalone',
  transpilePackages: ['@ngi/ui'],
  // Note: Next.js 14 does not support trustHostHeader; rely on nginx proxy headers
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_ORIGIN}/api/:path*` },
    ]
  },
  env: {
    // Ensure marketing + auth links always target the nginx origin (port 3001)
    NEXT_PUBLIC_STUDENT_BASE_URL: process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001',
    NEXT_PUBLIC_ADMIN_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_BASE_URL || 'http://localhost:3001/admin',
    // Propagate Clerk publishable key to client if only CLERK_PUBLISHABLE_KEY is set in env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,
    // Surface issuer for any client-side flows that need it (safe)
    NEXT_PUBLIC_CLERK_ISSUER: process.env.NEXT_PUBLIC_CLERK_ISSUER || process.env.CLERK_ISSUER,
  },
  experimental: {
    externalDir: true,
  },
}
module.exports = nextConfig

