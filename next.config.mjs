/** @type {import('next').NextConfig} */
// Force rebuild to clear environment variable cache - CRITICAL ANALYSIS FIX
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
    ],
  },
  // Basic optimization settings
  trailingSlash: false,
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;