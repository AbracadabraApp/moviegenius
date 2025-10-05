/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Exclude backup and test files from compilation
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\/(pages|components|lib)\/.*\.(backup|test|bak)\.js$/,
      loader: 'ignore-loader'
    });
    
    return config;
  },
  
  // Explicitly exclude certain patterns from page generation
  async rewrites() {
    return [];
  }
}

export default nextConfig;
