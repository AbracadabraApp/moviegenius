/** @type {import('next').NextConfig} */
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