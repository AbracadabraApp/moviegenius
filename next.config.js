/** @type {import('next').NextConfig} */

// Check if building for mobile (Capacitor)
const isMobileBuild = process.env.BUILD_TARGET === 'mobile';
const isRailwayBuild = process.env.RAILWAY_ENVIRONMENT_NAME;

// Set fallback environment variables for build safety
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
process.env.NEXT_PUBLIC_TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || 'placeholder-tmdb-key';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'placeholder-anthropic-key';

const nextConfig = {
  eslint: {
    // Disable ESLint during builds for now (warnings block production build)
    ignoreDuringBuilds: true,
  },
  
  // Environment variables to distinguish builds
  env: {
    BUILD_TARGET: process.env.BUILD_TARGET || 'web',
    IS_RAILWAY_BUILD: isRailwayBuild ? 'true' : 'false',
  },
  
  // Mobile-specific configuration
  ...(isMobileBuild ? {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true
    },
    assetPrefix: '',
    // Mobile pages - only include static-compatible pages for initial testing
    exportPathMap: async function (defaultPathMap) {
      return {
        '/': { page: '/ask' }, // Use ask page as home for mobile testing
        '/ask': { page: '/ask' },
        '/you': { page: '/you' },
        // Movie pages will be handled by getStaticPaths
      };
    },
  } : {
    // Web-specific configuration (keep all features)
    images: {
      domains: ['image.tmdb.org'],
    },
  }),
}

module.exports = nextConfig