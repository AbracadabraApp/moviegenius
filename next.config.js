/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during builds for production deployment speed
    ignoreDuringBuilds: true,
  },
  
  // Web-only configuration (no mobile builds)
  images: {
    domains: ['image.tmdb.org'],
  },
  
  // Environment variables
  env: {
    BUILD_TARGET: 'web',
  },
}

module.exports = nextConfig