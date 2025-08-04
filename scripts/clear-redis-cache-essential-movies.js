#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function clearRedisCacheForEssentialMovies() {
  console.log('🧹 Clearing Redis cache for 49 essential movies...');

  // Read the test list (excluding 996 which we already tested)
  const testList = readFileSync(resolve(__dirname, '../PROMPT_C3_Test_LIST.txt'), 'utf-8')
    .split('\n')
    .map(id => id.trim())
    .filter(id => id && id !== '996');

  console.log(`📋 Processing ${testList.length} movies`);

  let cleared = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < testList.length; i++) {
    const tmdbId = testList[i];
    const progress = `[${i + 1}/${testList.length}]`;
    
    try {
      console.log(`${progress} Clearing cache for TMDB ID: ${tmdbId}`);
      
      // Find movie in database to get title and year
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('title, year')
        .eq('tmdb_id', tmdbId)
        .single();

      if (!movie) {
        console.log(`⚠️  Movie ${tmdbId} not found in database`);
        notFound++;
        continue;
      }

      console.log(`✅ Found: "${movie.title}" (${movie.year})`);

      // Generate the cache key that would be used by the API
      // Format: {title}_{year}_complete_analysis
      const cacheKey = `${movie.title}_${movie.year}_complete_analysis`;
      
      // Delete from Redis cache
      const deleted = await redis.del(cacheKey);
      
      if (deleted > 0) {
        console.log(`🗑️  Cleared Redis cache for "${movie.title}" (${movie.year})`);
        cleared++;
      } else {
        console.log(`📄 No Redis cache found for "${movie.title}" (${movie.year})`);
      }

    } catch (error) {
      console.error(`❌ Failed to process ${tmdbId}:`, error.message);
      errors++;
    }
  }

  // Close Redis connection
  await redis.quit();

  // Print summary
  console.log('\n🧹 REDIS CACHE CLEARING SUMMARY');
  console.log('==============================');
  console.log(`🗑️  Cache entries cleared: ${cleared}`);
  console.log(`⚠️  Movies not found: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total movies processed: ${testList.length}`);
  
  console.log('\n✅ Redis cache cleared - ready for fresh generation!');
}

clearRedisCacheForEssentialMovies().catch(console.error);