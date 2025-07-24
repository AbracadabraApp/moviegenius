#!/usr/bin/env node

/**
 * Cache Warming Script for MovieGenius
 * 
 * Pre-populates Redis cache with popular movie content for maximum speed.
 * Designed for low-traffic sites to ensure instant responses.
 */

import { createClient } from '@supabase/supabase-js';
import { getCache } from '../lib/cache.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class CacheWarmer {
  constructor() {
    this.cache = getCache();
    this.stats = {
      warmed: 0,
      skipped: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  async warmPopularMovies(limit = 100) {
    console.log(`🔥 Starting cache warming for top ${limit} movies...`);

    try {
      // Get popular movies with analysis
      const { data: movies, error } = await supabase
        .from('movies')
        .select(`
          id, title, year, tmdb_id, slug, poster_url,
          movie_analyses!inner(claude_response)
        `)
        .eq('movie_analyses.analysis_type', 'page_analysis')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Failed to fetch movies:', error);
        return;
      }

      console.log(`📊 Found ${movies.length} movies with analysis to warm`);

      // Warm caches concurrently but with rate limiting
      const batchSize = 5;
      for (let i = 0; i < movies.length; i += batchSize) {
        const batch = movies.slice(i, i + batchSize);
        await Promise.all(batch.map(movie => this.warmMovieCache(movie)));
        
        // Brief pause between batches to avoid overwhelming the system
        if (i + batchSize < movies.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.printStats();

    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    }
  }

  async warmMovieCache(movie) {
    const movieKey = `${movie.title}_${movie.year}`;
    
    try {
      // Check if already cached to avoid waste
      const existingCache = await this.cache.get(`movie_analysis:${movieKey}:complete_analysis`);
      
      if (existingCache) {
        console.log(`⏭️  Skipping ${movie.title} (${movie.year}) - already cached`);
        this.stats.skipped++;
        return;
      }

      // Warm the cache with analysis data
      const analysisData = movie.movie_analyses[0]?.claude_response;
      
      if (analysisData) {
        await this.cache.set(
          `movie_analysis:${movieKey}:complete_analysis`,
          {
            analysis: analysisData.processed_content || analysisData.raw_content,
            rawAnalysis: analysisData.raw_content,
            movie: { title: movie.title, year: movie.year },
            cached: true,
            source: 'cache_warming',
            movieData: analysisData.movie_data,
            linkingEnabled: analysisData.linking_enabled || false
          },
          30 * 24 * 60 * 60 // 30 days TTL
        );

        console.log(`🔥 Warmed cache for ${movie.title} (${movie.year})`);
        this.stats.warmed++;
      }

    } catch (error) {
      console.error(`❌ Failed to warm cache for ${movie.title}:`, error.message);
      this.stats.errors++;
    }
  }

  async warmSearchTerms() {
    console.log('🔍 Warming popular search terms...');
    
    const popularSearches = [
      'action', 'comedy', 'drama', 'thriller', 'horror',
      'science fiction', 'romance', 'adventure', 'animation',
      'christopher nolan', 'martin scorsese', 'quentin tarantino',
      'steven spielberg', 'alfred hitchcock', 'stanley kubrick'
    ];

    for (const term of popularSearches) {
      try {
        // This would typically involve calling the search API
        // For now, we'll just log the intent
        console.log(`🔍 Would warm search: "${term}"`);
      } catch (error) {
        console.error(`❌ Failed to warm search for "${term}":`, error.message);
      }
    }
  }

  printStats() {
    const duration = (Date.now() - this.stats.startTime) / 1000;
    console.log('\n📊 Cache Warming Summary:');
    console.log('═'.repeat(40));
    console.log(`✅ Warmed: ${this.stats.warmed} movies`);
    console.log(`⏭️  Skipped: ${this.stats.skipped} movies (already cached)`);
    console.log(`❌ Errors: ${this.stats.errors} movies`);
    console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);
    console.log(`🚀 Rate: ${(this.stats.warmed / duration).toFixed(1)} movies/sec`);
    
    if (this.stats.warmed > 0) {
      console.log('\n🎉 Cache warming completed successfully!');
      console.log('🏃‍♂️ Site is now primed for lightning-fast responses');
    }
  }
}

async function main() {
  console.log('🚀 MovieGenius Cache Warming Tool');
  console.log('══════════════════════════════════');
  
  const warmer = new CacheWarmer();
  
  // Get limit from command line args or default to 100
  const limit = parseInt(process.argv[2]) || 100;
  
  await warmer.warmPopularMovies(limit);
  await warmer.warmSearchTerms();
  
  console.log('\n✨ Cache warming complete - ready for prime time!');
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Cache warming failed:', error);
    process.exit(1);
  });
}

export default CacheWarmer;