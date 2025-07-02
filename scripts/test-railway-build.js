#!/usr/bin/env node

/**
 * Test Railway Build Compatibility
 * 
 * Simulates Railway's build environment to catch issues before deployment.
 * Run this before each push to Railway.
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚂 Testing Railway Build Compatibility...\n');

// 1. Check for unstaged changes
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.error('❌ Unstaged changes detected:');
    console.error(gitStatus);
    console.error('Commit changes before deploying to Railway.\n');
    process.exit(1);
  }
  console.log('✅ Git status clean');
} catch (error) {
  console.error('❌ Git check failed:', error.message);
  process.exit(1);
}

// 2. Check environment variables
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_TMDB_API_KEY', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('\n📋 Checking environment variables...');
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing: ${envVar}`);
  } else {
    console.log(`✅ Found: ${envVar}`);
  }
}

// 3. Test build with Railway-like environment
console.log('\n🏗️  Testing build process...');
try {
  // Set Railway-like environment
  process.env.NODE_ENV = 'production';
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';
  
  // Test build (similar to Railway)
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
  
} catch (error) {
  console.error('❌ Build failed - this will fail on Railway too');
  console.error('Fix build errors before deploying');
  process.exit(1);
}

// 4. Check build output
if (!fs.existsSync('.next')) {
  console.error('❌ No .next directory found after build');
  process.exit(1);
}

console.log('\n🎉 Railway build compatibility test passed!');
console.log('Safe to deploy to Railway.');