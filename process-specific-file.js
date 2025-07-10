#!/usr/bin/env node

/**
 * Process a specific file by TMDB ID
 */

import fs from 'fs';

// Load environment variables from .env.local BEFORE importing anything else
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
    process.exit(1);
  }
}

// Load env vars first
loadEnvFile();

// Now import what we need
const { processMovieAnalysis } = await import('./lib/movie-analysis-linker.js');

async function processFile(tmdbId, dryRun = false) {
  try {
    const filePath = `./nuclear-static/${tmdbId}.json`;
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
    
    const staticData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!staticData.props || !staticData.props.title) {
      console.error(`❌ Invalid static data structure for TMDB ID ${tmdbId}`);
      return;
    }
    
    const movieTitle = staticData.props.title;
    const movieYear = staticData.props.year;
    
    console.log(`\n📄 Processing: ${movieTitle} (${movieYear}) - TMDB ${tmdbId}`);
    
    // Check current state
    const hasLinks = JSON.stringify(staticData).includes('class="movie-title"');
    const hasBold = JSON.stringify(staticData).includes('**');
    
    console.log(`📊 Current state: ${hasLinks ? '✅ Has links' : '❌ No links'}, ${hasBold ? '⚠️ Has **bold**' : '✅ No bold'}`);
    
    if (hasBold) {
      console.log(`🔍 Found **bold** patterns - processing...`);
      
      const processedData = await processMovieAnalysis(
        staticData,
        `${movieTitle} (${movieYear})`
      );
      
      if (!dryRun) {
        fs.writeFileSync(filePath, JSON.stringify(processedData, null, 2));
        console.log(`💾 Updated static cache for TMDB ${tmdbId}`);
      } else {
        console.log(`🔍 DRY RUN - Would update static cache for TMDB ${tmdbId}`);
      }
    } else {
      console.log(`✅ No **bold** patterns found - already processed or no movie mentions`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing TMDB ${tmdbId}:`, error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node process-specific-file.js <tmdb-id> [--dry-run]');
    console.log('Example: node process-specific-file.js 1040');
    console.log('Example: node process-specific-file.js 1040 --dry-run');
    process.exit(1);
  }
  
  const tmdbId = parseInt(args[0]);
  const dryRun = args.includes('--dry-run');
  
  if (isNaN(tmdbId)) {
    console.error('❌ Invalid TMDB ID');
    process.exit(1);
  }
  
  console.log(`🚀 Processing specific file: ${tmdbId}.json`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify file)'}`);
  
  await processFile(tmdbId, dryRun);
}

main();