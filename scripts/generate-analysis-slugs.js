/**
 * Generate Slugs for Analyzed Movies
 * 
 * Finds movies with analysis but no slugs, then generates 
 * Claude-powered SEO-optimized slugs for them
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const PROGRESS_FILE = 'scripts/.slug-generation-progress.json';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/generate-organic-slug`;
const DELAY_MS = 500; // Conservative rate limiting for Claude calls
const RETRY_DELAY = 2000;
const MAX_RETRIES = 3;

// Database connection
const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8'
);

class AnalysisSlugGenerator {
  constructor() {
    this.stats = {
      processed: 0,
      generated: 0,
      skipped: 0,
      errors: 0,
      startTime: Date.now()
    };
    this.progress = this.loadProgress();
    this.moviesNeedingSlugs = [];
  }
  
  loadProgress() {
    if (existsSync(PROGRESS_FILE)) {
      try {
        const data = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
        console.log(`📂 Resuming from ${data.processedMovies?.length || 0} processed movies`);
        return data;
      } catch (e) {
        console.log('🆕 Starting fresh - no valid progress file');
      }
    }
    return { processedMovies: [], lastProcessed: null };
  }
  
  saveProgress() {
    try {
      const data = {
        processedMovies: this.progress.processedMovies || [],
        lastProcessed: this.progress.lastProcessed,
        stats: this.stats,
        timestamp: new Date().toISOString()
      };
      writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to save progress:', e.message);
    }
  }
  
  async getMoviesNeedingSlugs() {
    console.log('🔍 Finding analyzed movies without slugs...');
    
    try {
      // Get all movie_ids from movie_analyses
      const { data: analysisData, error: analysisError } = await supabase
        .from('movie_analyses')
        .select('movie_id')
        .eq('analysis_type', 'page_analysis');
        
      if (analysisError) {
        console.error('Failed to fetch analysis data:', analysisError);
        return [];
      }
      
      // Get unique movie IDs
      const uniqueMovieIds = [...new Set(analysisData.map(a => a.movie_id))];
      console.log(`📊 Found ${uniqueMovieIds.length} unique movies with analysis`);
      
      // Process in batches to find movies without slugs
      const batchSize = 50;
      let moviesWithoutSlugs = [];
      
      for (let i = 0; i < uniqueMovieIds.length; i += batchSize) {
        const batch = uniqueMovieIds.slice(i, i + batchSize);
        const { data: batchData, error: batchError } = await supabase
          .from('movies')
          .select('id, title, year, slug')
          .in('id', batch)
          .or('slug.is.null,slug.eq.');
          
        if (batchError) {
          console.error(`Error fetching batch ${i}-${i + batchSize}:`, batchError);
          continue;
        }
        
        moviesWithoutSlugs.push(...batchData);
        console.log(`📋 Batch ${Math.floor(i / batchSize) + 1}: Found ${batchData.length} movies without slugs`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`🎯 Total movies needing slugs: ${moviesWithoutSlugs.length}`);
      return moviesWithoutSlugs;
      
    } catch (error) {
      console.error('Failed to get movies needing slugs:', error);
      return [];
    }
  }
  
  async generateSlugForMovie(movie, retryCount = 0) {
    try {
      // Skip if already processed
      if (this.progress.processedMovies?.includes(movie.id)) {
        this.stats.skipped++;
        return 'skipped';
      }
      
      console.log(`🎬 [${this.stats.processed + 1}] Generating slug for "${movie.title}" (${movie.year})`);
      
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Call the slug generation API
      const requestData = JSON.stringify({
        title: movie.title,
        year: movie.year
      });
      
      const curlCommand = `curl -s -X POST "${API_BASE}" -H "Content-Type: application/json" -d '${requestData}'`;
      const { stdout } = await execAsync(curlCommand);
      const result = JSON.parse(stdout);
      
      this.stats.processed++;
      
      if (result.slug && !result.error) {
        // Update the movie with the generated slug
        const { error: updateError } = await supabase
          .from('movies')
          .update({ slug: result.slug })
          .eq('id', movie.id);
          
        if (updateError) {
          console.error(`❌ Failed to save slug for ${movie.title}:`, updateError);
          this.stats.errors++;
          return 'error';
        }
        
        this.stats.generated++;
        this.progress.processedMovies = this.progress.processedMovies || [];
        this.progress.processedMovies.push(movie.id);
        this.progress.lastProcessed = movie.id;
        
        console.log(`✅ [${this.stats.processed}] "${movie.title}" (${movie.year}) → "${result.slug}"`);
        return 'generated';
      } else {
        console.log(`⚠️ [${this.stats.processed}] No slug generated for "${movie.title}" (${movie.year}): ${result.error || 'Unknown error'}`);
        this.stats.errors++;
        return 'failed';
      }
      
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 [${this.stats.processed}] "${movie.title}" - Retry ${retryCount + 1}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return await this.generateSlugForMovie(movie, retryCount + 1);
      } else {
        this.stats.errors++;
        console.error(`💥 [${this.stats.processed}] "${movie.title}" - Failed after ${MAX_RETRIES} retries: ${error.message}`);
        return 'error';
      }
    }
  }
  
  printProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000 / 60;
    const rate = this.stats.processed / elapsed;
    const successRate = ((this.stats.generated / this.stats.processed) * 100).toFixed(1);
    
    console.log(`\n📊 Progress Update:`);
    console.log(`  • Processed: ${this.stats.processed}`);
    console.log(`  • Slugs generated: ${this.stats.generated}`);
    console.log(`  • Skipped: ${this.stats.skipped}`);
    console.log(`  • Errors: ${this.stats.errors}`);
    console.log(`  • Success rate: ${successRate}%`);
    console.log(`  • Rate: ${rate.toFixed(1)} movies/min`);
  }
  
  async run() {
    console.log('🧠 Analysis Slug Generator');
    console.log('🎯 Generating Claude-powered slugs for analyzed movies without slugs\n');
    
    // Get movies that need slugs
    this.moviesNeedingSlugs = await this.getMoviesNeedingSlugs();
    
    if (this.moviesNeedingSlugs.length === 0) {
      console.log('🎉 All analyzed movies already have slugs!');
      return;
    }
    
    // Filter out already processed movies
    const remainingMovies = this.moviesNeedingSlugs.filter(movie => 
      !this.progress.processedMovies?.includes(movie.id)
    );
    
    console.log(`📋 ${remainingMovies.length} movies remaining to process\n`);
    
    for (const movie of remainingMovies) {
      await this.generateSlugForMovie(movie);
      
      // Save progress every 10 movies
      if (this.stats.processed % 10 === 0) {
        this.saveProgress();
        this.printProgress();
      }
      
      // Rate limiting - be conservative with Claude API calls
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    // Final save and summary
    this.saveProgress();
    this.printFinalSummary();
  }
  
  printFinalSummary() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000 / 60;
    
    console.log('\n🎯 Slug Generation Complete!');
    console.log('═══════════════════════════');
    console.log(`📊 Final Results:`);
    console.log(`  • Total processed: ${this.stats.processed}`);
    console.log(`  • Slugs generated: ${this.stats.generated}`);
    console.log(`  • Skipped (already done): ${this.stats.skipped}`);
    console.log(`  • Errors: ${this.stats.errors}`);
    console.log(`  • Success rate: ${((this.stats.generated / this.stats.processed) * 100).toFixed(1)}%`);
    console.log(`  • Duration: ${elapsed.toFixed(1)} minutes`);
    console.log(`  • Rate: ${(this.stats.processed / elapsed).toFixed(1)} movies/minute`);
    console.log(`\n🎬 Your analyzed movies now have SEO-optimized slugs!`);
    console.log(`💾 Progress saved to: ${PROGRESS_FILE}`);
    console.log(`🔄 Can resume anytime with: node scripts/generate-analysis-slugs.js`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Gracefully shutting down...');
  if (global.slugGenerator) {
    global.slugGenerator.saveProgress();
    global.slugGenerator.printProgress();
    console.log('💾 Progress saved. Run again to resume.');
  }
  process.exit(0);
});

// Run the slug generator
const slugGenerator = new AnalysisSlugGenerator();
global.slugGenerator = slugGenerator; // For graceful shutdown
slugGenerator.run();