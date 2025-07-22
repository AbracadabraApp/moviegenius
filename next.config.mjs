/** @type {import('next').NextConfig} */

import withBundleAnalyzer from '@next/bundle-analyzer'
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isRailwayBuild = process.env.RAILWAY_ENVIRONMENT_NAME;

// Set fallback environment variables for build safety
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
process.env.NEXT_PUBLIC_TMDB_API_KEY =
  process.env.NEXT_PUBLIC_TMDB_API_KEY || 'placeholder-tmdb-key';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'placeholder-anthropic-key';

const nextConfig = {
  // Simplified webpack config for development server stability
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Skip complex optimizations in development mode
    if (dev) {
      // Only basic plugins for development
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        })
      );
      return config;
    }
    
    // Production optimizations (only when not in dev mode)
    // 1. Lucide icon tree-shaking optimization (disabled temporarily for stability)
    // config.resolve.alias = {
    //   ...config.resolve.alias,
    //   'lucide-react': 'lucide-react/dist/esm/icons',
    // };
    
    // 2. Moment.js exclusion (MovieGenius uses built-in Date)
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    
    // 3. Exclude nuclear-static and file system modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        stream: false,
        util: false,
      };
    }
    
    // 4. Optimize chunk splitting for MovieGenius architecture
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 150000, // Smaller chunks for better loading
        cacheGroups: {
          // Framework chunks (React, Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // MovieGenius-specific chunks
          theme: {
            test: /[\\/](themes|episodes)[\\/]/,
            name: 'themes',
            chunks: 'all',
            priority: 20,
          },
          analysis: {
            test: /[\\/](analysis|movie-analysis)[\\/]/,
            name: 'analysis',
            chunks: 'async', // Load analysis components lazily
            priority: 30,
          },
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    // 5. Reduce memory usage during compilation
    if (!dev) {
      config.optimization.minimize = true;
      config.optimization.concatenateModules = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    return config;
  },

  // Dev performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },

  eslint: {
    // ESLint enabled for production builds - only fail on errors, not warnings
    ignoreDuringBuilds: false,
    dirs: ['pages', 'components', 'lib', 'hooks'],
  },

  // Environment variables
  env: {
    IS_RAILWAY_BUILD: isRailwayBuild ? 'true' : 'false',
  },

  // Enable compression
  compress: true,

  // Image optimization for performance
  images: {
    domains: ['image.tmdb.org', 'www.youtube.com', 'youtube.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year for TMDB images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  
  // Reduce bundle size through exclusions
  excludeDefaultMomentLocales: true,
  // Temporarily disable modularizeImports to fix icon issues
  // modularizeImports: {
  //   'lucide-react': {
  //     transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
  //     skipDefaultConversion: true,
  //   },
  // },

  // Cloudflare-optimized headers
  async headers() {
    return [
      // Static assets - cache for 1 year
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Images - cache for 1 year
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
      // Movie pages - cache for 1 hour with stale-while-revalidate
      {
        source: '/movie/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // API routes - optimized caching
      {
        source: '/api/movie-analysis',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
