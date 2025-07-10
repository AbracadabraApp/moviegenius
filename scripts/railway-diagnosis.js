#!/usr/bin/env node

/**
 * Railway Deployment Diagnosis Tool
 * 
 * Identifies specific reasons why Railway deployment is failing
 */

const https = require('https');
const { execSync } = require('child_process');

console.log('🔧 Railway Deployment Diagnosis');
console.log('═══════════════════════════════');

// Check 1: Verify GitHub repository accessibility
console.log('\n1. 📡 Checking GitHub Repository...');
try {
  const repoCheck = execSync('git remote -v', { encoding: 'utf8' });
  console.log('✅ Repository:', repoCheck.trim());
  
  const latestCommit = execSync('git log -1 --oneline', { encoding: 'utf8' });
  console.log('✅ Latest Commit:', latestCommit.trim());
} catch (error) {
  console.error('❌ Git repository issue:', error.message);
}

// Check 2: Test build process locally
console.log('\n2. 🏗️ Testing Local Build Process...');
try {
  // Check if we can build without errors
  console.log('⏳ Running test build...');
  const buildResult = execSync('npm run build 2>&1', { 
    encoding: 'utf8',
    timeout: 120000 // 2 minutes
  });
  
  if (buildResult.includes('✓ Compiled successfully')) {
    console.log('✅ Local build successful');
  } else {
    console.log('⚠️ Build warnings detected');
    console.log(buildResult.split('\n').slice(-10).join('\n')); // Last 10 lines
  }
} catch (error) {
  console.error('❌ Build failed locally:', error.message);
  console.log('\n🔧 Common build failures:');
  console.log('- Missing environment variables');
  console.log('- ESLint errors');
  console.log('- TypeScript errors');
  console.log('- Memory issues');
}

// Check 3: Environment Variables
console.log('\n3. 🔑 Checking Required Environment Variables...');
const requiredVars = [
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_TMDB_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let missingVars = 0;
for (const envVar of requiredVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: Present`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
    missingVars++;
  }
}

if (missingVars > 0) {
  console.log(`\n⚠️ ${missingVars} environment variables missing`);
  console.log('These must be set in Railway dashboard');
}

// Check 4: Railway Configuration
console.log('\n4. ⚙️ Checking Railway Configuration...');
const fs = require('fs');

if (fs.existsSync('nixpacks.toml')) {
  console.log('✅ nixpacks.toml found');
  const nixpacks = fs.readFileSync('nixpacks.toml', 'utf8');
  if (nixpacks.includes('nodejs_22')) {
    console.log('✅ Node.js 22 configured');
  }
  if (nixpacks.includes('max-old-space-size=4096')) {
    console.log('✅ Memory optimization configured');
  }
} else {
  console.log('❌ nixpacks.toml missing');
}

if (fs.existsSync('Dockerfile')) {
  console.log('✅ Dockerfile found (alternative build method)');
}

// Check 5: Package.json scripts
console.log('\n5. 📦 Checking Package Scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (packageJson.scripts.build) {
  console.log('✅ Build script found:', packageJson.scripts.build);
} else {
  console.log('❌ No build script in package.json');
}

if (packageJson.scripts.start) {
  console.log('✅ Start script found:', packageJson.scripts.start);
} else {
  console.log('❌ No start script in package.json');
}

// Check 6: Deployment size
console.log('\n6. 📊 Checking Deployment Size...');
try {
  const sizeCheck = execSync('du -sh . --exclude=node_modules --exclude=.git', { encoding: 'utf8' });
  console.log('📦 Project size (excluding node_modules):', sizeCheck.trim());
  
  if (fs.existsSync('nuclear-static')) {
    const nuclearSize = execSync('du -sh nuclear-static', { encoding: 'utf8' });
    console.log('📦 Nuclear static size:', nuclearSize.trim());
  }
} catch (error) {
  console.log('⚠️ Could not check project size');
}

// Summary and recommendations
console.log('\n🎯 DIAGNOSIS SUMMARY');
console.log('═══════════════════');

if (missingVars > 0) {
  console.log('❌ CRITICAL: Missing environment variables in Railway');
  console.log('   → Set all required variables in Railway dashboard');
}

console.log('\n🔧 RECOMMENDED ACTIONS:');
console.log('1. Check Railway build logs for specific error messages');
console.log('2. Verify all environment variables are set in Railway dashboard');
console.log('3. Ensure Railway has access to GitHub repository');
console.log('4. Check Railway project settings for correct branch (main)');
console.log('5. Try removing and re-adding GitHub integration');

console.log('\n💡 ALTERNATIVE STRATEGIES:');
console.log('- Use Railway CLI: railway up --detach');
console.log('- Deploy via Dockerfile instead of nixpacks');
console.log('- Create new Railway service and migrate');
console.log('- Use different deployment platform (Vercel, Netlify)');