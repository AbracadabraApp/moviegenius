#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read local environment variables
const localEnvPath = path.join(__dirname, '.env.local');
const localEnvExists = fs.existsSync(localEnvPath);

console.log('🔍 Environment Variables Comparison\n');

if (localEnvExists) {
  const localEnv = fs.readFileSync(localEnvPath, 'utf8');
  const localVars = {};
  
  localEnv.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        localVars[key.trim()] = valueParts.join('=');
      }
    }
  });

  console.log('📁 Local Environment Variables (.env.local):');
  Object.keys(localVars).forEach(key => {
    const value = localVars[key];
    const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
    console.log(`  ${key}=${displayValue}`);
  });

  console.log('\n🚀 Required for Railway Production:');
  const requiredVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY', 
    'TMDB_API_KEY',
    'NEXT_PUBLIC_TMDB_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RAPIDAPI_KEY'
  ];

  requiredVars.forEach(key => {
    if (localVars[key]) {
      console.log(`  ✅ ${key} - Present`);
    } else {
      console.log(`  ❌ ${key} - Missing`);
    }
  });

  console.log('\n💡 Notes:');
  console.log('  - HOST should be your Railway domain (not localhost)');
  console.log('  - NODE_ENV should be "production" in Railway');
  console.log('  - NEXT_TELEMETRY_DISABLED should be "1" in Railway');
  console.log('  - RAILWAY_TOKEN is only for local development');

} else {
  console.log('❌ .env.local file not found');
}

console.log('\n🔧 To manually compare with Railway:');
console.log('1. Go to your Railway dashboard');
console.log('2. Select your MovieGenius project');
console.log('3. Navigate to Variables tab');
console.log('4. Copy the required variables from above');
console.log('5. Make sure HOST points to your Railway domain');