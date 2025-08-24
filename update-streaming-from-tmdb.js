#!/usr/bin/env node
/**
 * Update Streaming Data from TMDB
 * 
 * 1. Zero out existing streaming_data in database
 * 2. Batch update with fresh TMDB streaming data for popular movies
 * 3. Use ranked popularity list from browse collections
 */

import fs from 'fs';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Configuration
const CONFIG = {
  batchSize: 50,           // Process movies in batches
  requestDelay: 250,       // Delay between TMDB API requests (ms)
  maxMovies: null,         // null = all movies, number = limit for testing
  zeroOutFirst: true,      // Zero out existing streaming_data before update
  dryRun: false           // Set to true for testing without database updates
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--dry-run')) CONFIG.dryRun = true;
if (args.includes('--no-zero')) CONFIG.zeroOutFirst = false;
if (args.includes('--test')) CONFIG.maxMovies = 50;
if (args.includes('--sample')) CONFIG.maxMovies = 10;
const batchArg = args.find(arg => arg.startsWith('--batch='));
if (batchArg) CONFIG.batchSize = parseInt(batchArg.split('=')[1]);

function deduplicatePlatforms(serviceNames) {
  // Clean up platform names for better user experience
  const result = [...serviceNames];
  const toRemove = new Set();
  
  // Ad tier handling - prefer base platform over ad tiers
  const adTierSuffixes = [' Standard with Ads', ' with Ads'];
  
  for (let i = 0; i < serviceNames.length; i++) {
    for (let j = 0; j < serviceNames.length; j++) {
      if (i !== j) {
        const service1 = serviceNames[i];
        const service2 = serviceNames[j];
        
        // Handle ad tiers: "Netflix, Netflix Standard with Ads" -> "Netflix"
        for (const suffix of adTierSuffixes) {
          if (service2 === service1 + suffix) {
            toRemove.add(service2); // Remove the ad tier variant
            break;
          }
        }
        
        // Handle channel variants - always strip channel suffixes, keep platform names
        // "Screambox Amazon Channel" -> "Screambox"
        // "HBO Max Amazon Channel" -> "HBO Max" 
        if (service2.includes(' Amazon Channel') || service2.includes(' Apple TV Channel') || service2.includes(' Roku Premium Channel')) {
          const cleanName = service2.replace(/ (Amazon|Apple TV|Roku Premium) Channel$/, '');
          // If we have both "HBO Max" and "HBO Max Amazon Channel", remove the channel variant
          if (service1 === cleanName) {
            toRemove.add(service2); // Remove channel variant, keep base platform
          }
        }
        
        // Handle premium tiers: "Peacock Premium, Peacock Premium Plus" -> "Peacock Premium Plus"
        if (service2.startsWith(service1 + ' Plus') || service2.startsWith(service1 + ' Premium')) {
          toRemove.add(service1); // Remove base, keep premium tier
        }
      }
    }
  }
  
  // Final cleanup: strip all channel suffixes and normalize platform names
  const cleaned = result
    .filter(service => !toRemove.has(service))
    .map(service => {
      // Strip channel suffixes
      let name = service.replace(/ (Amazon|Apple TV|Roku Premium) Channel$/, '');
      
      // Normalize platform names to preferred short forms
      if (name === 'Paramount Plus' || name === 'Paramount+') return 'Paramount+';
      if (name === 'Disney Plus') return 'Disney+';
      if (name === 'Amazon Prime Video') return 'Amazon Prime';
      
      return name;
    });
  
  // Remove exact duplicates after normalization
  return [...new Set(cleaned)];
}

async function getTMDBStreamingData(tmdbId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    // Extract US streaming data (flatrate only, ignore rent/buy)
    const usProviders = data.results?.US;
    const flatrateProviders = usProviders?.flatrate || [];
    
    if (flatrateProviders.length === 0) {
      return { streaming_data: null };
    }
    
    // Format as "Streaming on Netflix, Hulu, Amazon Prime Video"
    // Deduplicate platforms - remove base platform if channel variant exists
    const allServiceNames = flatrateProviders.map(provider => provider.provider_name);
    const serviceNames = deduplicatePlatforms(allServiceNames);
    const streamingText = serviceNames.join(', '); // Just the platform names, no prefix
    
    return { streaming_data: streamingText };
    
  } catch (error) {
    return { error: error.message };
  }
}

async function zeroOutStreamingData() {
  if (CONFIG.dryRun) {
    console.log('🧪 DRY RUN: Would zero out streaming_data for all movies');
    return { rowsAffected: 'unknown (dry run)' };
  }
  
  console.log('🔄 Zeroing out existing streaming_data...');
  
  const result = await pool.query(`
    UPDATE movies 
    SET streaming_data = NULL 
    WHERE streaming_data IS NOT NULL
  `);
  
  console.log(`✅ Zeroed out streaming_data for ${result.rowCount} movies`);
  return { rowsAffected: result.rowCount };
}

async function updateBatchStreaming(tmdbIds) {
  console.log(`\n🎬 Updating streaming data for ${tmdbIds.length} movies...`);
  
  let successCount = 0;
  let errorCount = 0;
  let noDataCount = 0;
  
  for (let i = 0; i < tmdbIds.length; i++) {
    const tmdbId = tmdbIds[i];
    
    try {
      // Get streaming data from TMDB
      const streamingResult = await getTMDBStreamingData(tmdbId);
      
      if (streamingResult.error) {
        console.log(`❌ TMDB ${tmdbId}: ${streamingResult.error}`);
        errorCount++;
      } else if (streamingResult.streaming_data) {
        // Update database
        if (!CONFIG.dryRun) {
          await pool.query(
            'UPDATE movies SET streaming_data = $1 WHERE tmdb_id = $2',
            [streamingResult.streaming_data, tmdbId]
          );
        }
        
        console.log(`✅ TMDB ${tmdbId}: ${streamingResult.streaming_data}`);
        successCount++;
      } else {
        console.log(`⚪ TMDB ${tmdbId}: No streaming services`);
        noDataCount++;
      }
      
      // Progress indicator
      if ((i + 1) % 25 === 0) {
        console.log(`\n--- Progress: ${i + 1}/${tmdbIds.length} (${Math.round((i + 1)/tmdbIds.length*100)}%) ---`);
        console.log(`✅ Success: ${successCount} | ⚪ No data: ${noDataCount} | ❌ Errors: ${errorCount}\n`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
      
    } catch (error) {
      console.log(`❌ TMDB ${tmdbId}: Database error - ${error.message}`);
      errorCount++;
    }
  }
  
  return { successCount, errorCount, noDataCount };
}

async function main() {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  if (!fs.existsSync('popular-tmdb-ids-ranked.json')) {
    console.error('❌ popular-tmdb-ids-ranked.json not found. Run extract-popular-tmdb-ids.js first.');
    process.exit(1);
  }
  
  console.log('🎬 TMDB Streaming Data Updater\n');
  
  if (CONFIG.dryRun) {
    console.log('🧪 DRY RUN MODE - No database changes will be made\n');
  }
  
  // Load popular TMDB IDs
  const allTmdbIds = JSON.parse(fs.readFileSync('popular-tmdb-ids-ranked.json', 'utf8'));
  const tmdbIds = CONFIG.maxMovies ? allTmdbIds.slice(0, CONFIG.maxMovies) : allTmdbIds;
  
  console.log(`📊 Processing ${tmdbIds.length} movies (from ${allTmdbIds.length} total popular movies)`);
  
  // Step 1: Zero out existing data
  if (CONFIG.zeroOutFirst) {
    await zeroOutStreamingData();
  }
  
  // Step 2: Update with TMDB data in batches
  const startTime = Date.now();
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalNoData = 0;
  
  for (let i = 0; i < tmdbIds.length; i += CONFIG.batchSize) {
    const batch = tmdbIds.slice(i, Math.min(i + CONFIG.batchSize, tmdbIds.length));
    console.log(`\n🔄 Processing batch ${Math.floor(i/CONFIG.batchSize) + 1}/${Math.ceil(tmdbIds.length/CONFIG.batchSize)} (${batch.length} movies)`);
    
    const results = await updateBatchStreaming(batch);
    totalSuccess += results.successCount;
    totalErrors += results.errorCount;
    totalNoData += results.noDataCount;
  }
  
  const duration = Date.now() - startTime;
  const successRate = Math.round((totalSuccess / tmdbIds.length) * 100);
  
  console.log('\n📊 Final Results:');
  console.log(`✅ Successfully updated: ${totalSuccess}/${tmdbIds.length} (${successRate}%)`);
  console.log(`⚪ No streaming data: ${totalNoData}/${tmdbIds.length} (${Math.round((totalNoData/tmdbIds.length)*100)}%)`);
  console.log(`❌ Errors: ${totalErrors}/${tmdbIds.length} (${Math.round((totalErrors/tmdbIds.length)*100)}%)`);
  console.log(`⏱️  Processing time: ${Math.round(duration/1000)}s`);
  
  if (CONFIG.dryRun) {
    console.log('\n🧪 This was a dry run - no database changes were made');
    console.log('Remove --dry-run flag to apply changes');
  } else {
    console.log('\n✅ Database updated successfully!');
  }
  
  await pool.end();
}

main().catch(console.error);