/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || (process.env.NODE_ENV === 'production'
  ? 'http://backend:8001'
  : 'http://localhost:8001')

const nextConfig = {\n  typescript: { ignoreBuildErrors: true },\n  eslint: { ignoreDuringBuilds: true },
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
  },
  experimental: {
    externalDir: true,
  },
}
module.exports = nextConfig


