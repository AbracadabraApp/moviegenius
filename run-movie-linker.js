#!/usr/bin/env node

/**
 * Runner script to process nuclear-static files with movie linking
 */

import fs from 'fs';
import { processStaticPages } from './lib/movie-analysis-linker.js';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
    console.log('✅ Environment variables loaded from .env.local');
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
  }
}

loadEnvFile();

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let testCount = 20; // default
  let dryRun = false;
  
  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      testCount = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--all') {
      testCount = 10000; // Process all files
    } else if (arg === '--help') {
      console.log('Usage: node run-movie-linker.js [options]');
      console.log('Options:');
      console.log('  --count=N     Process N files (default: 20)');
      console.log('  --all         Process all files');
      console.log('  --dry-run     Test mode - no files modified');
      console.log('  --help        Show this help');
      process.exit(0);
    }
  }
  
  console.log(`🚀 Starting movie linking process...`);
  console.log(`📊 Processing ${testCount === 10000 ? 'ALL' : testCount} files`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}`);
  console.log('');
  
  try {
    const results = await processStaticPages(testCount, dryRun);
    
    console.log('\n🎉 Movie linking completed!');
    console.log(`📈 Results: ${JSON.stringify(results, null, 2)}`);
    
  } catch (error) {
    console.error('❌ Error running movie linker:', error);
    process.exit(1);
  }
}

main();