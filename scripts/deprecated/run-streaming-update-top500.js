#!/usr/bin/env node
/**
 * Run streaming update for top 500 popular movies
 * This is the production run script
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

async function main() {
  console.log('🎬 STREAMING UPDATE: All 13,495 Popular Movies\n');
  
  // Load top 8k popular TMDB IDs from full ranked list
  if (!fs.existsSync('popular-tmdb-ids-ranked.json')) {
    console.error('❌ popular-tmdb-ids-ranked.json not found. Run extract-popular-tmdb-ids.js first.');
    process.exit(1);
  }
  
  const allTmdbIds = JSON.parse(fs.readFileSync('popular-tmdb-ids-ranked.json', 'utf8'));
  const tmdbIds = allTmdbIds; // Process ALL movies in the popularity ranking
  console.log(`📊 Processing ${tmdbIds.length} most popular movies (from ${allTmdbIds.length} total available)\n`);
  
  // Step 1: Zero out ALL existing streaming data
  console.log('🔄 Step 1: Zeroing out ALL existing streaming_data...');
  const zeroResult = await pool.query(`
    UPDATE movies 
    SET streaming_data = NULL 
    WHERE streaming_data IS NOT NULL
  `);
  console.log(`✅ Zeroed out streaming_data for ${zeroResult.rowCount} movies\n`);
  
  // Step 2: Update popular movies with fresh TMDB data
  console.log('🔄 Step 2: Updating popular movies with TMDB streaming data...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let noDataCount = 0;
  const batchSize = 100; // Larger batches for better progress reporting
  const startTime = Date.now();
  
  for (let i = 0; i < tmdbIds.length; i += batchSize) {
    const batch = tmdbIds.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tmdbIds.length/batchSize)} (${batch.length} movies)`);
    
    for (const tmdbId of batch) {
      try {
        const streamingResult = await getTMDBStreamingData(tmdbId);
        
        if (streamingResult.error) {
          console.log(`❌ TMDB ${tmdbId}: ${streamingResult.error}`);
          errorCount++;
        } else if (streamingResult.streaming_data) {
          await pool.query(
            'UPDATE movies SET streaming_data = $1 WHERE tmdb_id = $2',
            [streamingResult.streaming_data, tmdbId]
          );
          console.log(`✅ TMDB ${tmdbId}: ${streamingResult.streaming_data}`);
          successCount++;
        } else {
          console.log(`⚪ TMDB ${tmdbId}: No streaming services`);
          noDataCount++;
        }
        
        // Rate limiting - be respectful to TMDB
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ TMDB ${tmdbId}: Database error - ${error.message}`);
        errorCount++;
      }
    }
    
    // Progress update
    const processed = Math.min(i + batchSize, tmdbIds.length);
    const progress = Math.round((processed / tmdbIds.length) * 100);
    console.log(`\n--- Progress: ${processed}/${tmdbIds.length} (${progress}%) ---`);
    console.log(`✅ Success: ${successCount} | ⚪ No data: ${noDataCount} | ❌ Errors: ${errorCount}\n`);
  }
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  const successRate = Math.round((successCount / tmdbIds.length) * 100);
  
  console.log('📊 FINAL RESULTS:');
  console.log(`✅ Successfully updated: ${successCount}/${tmdbIds.length} (${successRate}%)`);
  console.log(`⚪ No streaming data: ${noDataCount}/${tmdbIds.length} (${Math.round((noDataCount/tmdbIds.length)*100)}%)`);
  console.log(`❌ Errors: ${errorCount}/${tmdbIds.length} (${Math.round((errorCount/tmdbIds.length)*100)}%)`);
  console.log(`⏱️  Total processing time: ${duration}s`);
  
  // Verification query
  const finalCheck = await pool.query('SELECT COUNT(*) as total, COUNT(streaming_data) as with_streaming FROM movies');
  console.log(`\n🎯 Database final state: ${finalCheck.rows[0].total} total movies, ${finalCheck.rows[0].with_streaming} have streaming data`);
  
  console.log('\n🎉 STREAMING UPDATE COMPLETE!');
  console.log('✅ Database now has fresh TMDB streaming data for most popular movies');
  console.log('✅ All other movies have NULL streaming_data (clean slate)');
  
  await pool.end();
}

main().catch(console.error);