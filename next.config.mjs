/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true,
  },
  // Use turbopack config instead of deprecated experimental.turbo
  turbopack: {},
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
    // Development optimizations
    if (dev) {
      // Disable source maps in development for speed
      config.devtool = false;
      
      // Optimize module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': '.',
      };
      
      // Skip expensive optimizations in dev
      config.optimization.minimize = false;
      config.optimization.sideEffects = false;
      
      // Reduce bundle analysis overhead
      config.stats = 'errors-warnings';
    }
    
    // Optimize for nuclear static files in production
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

export default nextConfig;