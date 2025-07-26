/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true,
  },
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
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable static optimization
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  
  // Optimize for nuclear static generation
  compress: true,
  
  // Webpack configuration for build optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize for nuclear static files
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          nuclear: {
            name: 'nuclear-static',
            test: /nuclear-static/,
            chunks: 'all',
            priority: 30,
          },
        },
      };
    }
    
    return config;
  },
  
  // Generate build ID for cache busting
  generateBuildId: async () => {
    return `nuclear-${Date.now()}`;
  },
};

module.exports = nextConfig;