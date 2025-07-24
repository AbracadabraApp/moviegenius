#!/usr/bin/env node

/**
 * Optimized Nuclear Batch Processing Script
 *
 * Combines proven performance-batch-processor.js approach with nuclear infrastructure optimizations:
 * - Individual API calls (stable, reliable)
 * - Prompt caching for 90% cost savings
 * - Comprehensive performance monitoring
 * - Nuclear batch-style processing with concurrency control
 *
 * Usage:
 *   node scripts/optimized-nuclear-batch.js --count 100 --dry-run
 *   node scripts/optimized-nuclear-batch.js --start 1 --end 500
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../lib/prompts/builder.js';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Processing configuration optimized for rate limits
const PROCESSING_CONFIG = {
  MAX_CONCURRENT: 2, // Reduced for rate limit compliance
  DELAY_BETWEEN_REQUESTS: 1000, // Increased to 1s for rate limiting
  COST_PER_ANALYSIS: 0.015, // Base cost estimate
  CACHE_SAVINGS: 0.9, // 90% savings from prompt caching
  RATE_LIMIT_TOKENS_PER_MINUTE: 75000, // Conservative under 80k limit
  TOKENS_PER_ANALYSIS: 1800, // Average tokens per analysis
};

class OptimizedNuclearProcessor {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      totalCost: 0,
      processingTimes: [],
      startTime: null,
    };
    this.progressFile = `scripts/.optimized-nuclear-progress.json`;
  }

  /**
   * Load progress from previous run
   */
  loadProgress() {
    if (existsSync(this.progressFile)) {
      try {
        const data = JSON.parse(readFileSync(this.progressFile, 'utf8'));
        console.log(`📂 Resumed from progress: ${data.processed} movies processed`);
        return new Set(data.processedIds || []);
      } catch (error) {
        console.log('⚠️ Could not load progress file, starting fresh');
      }
    }
    return new Set();
  }

  /**
   * Save progress to file
   */
  saveProgress(processedIds) {
    const data = {
      processed: processedIds.size,
      processedIds: Array.from(processedIds),
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(this.progressFile, JSON.stringify(data, null, 2));
  }

  /**
   * Process a single movie with detailed timing
   */
  async processMovie(movie, processedIds) {
    const movieStart = Date.now();
    const stages = { database: 0, api: 0, storage: 0 };

    try {
      // Stage 1: Database lookup
      const dbStart = Date.now();
      
      // Check for existing analysis (zero-waste protection)
      const { data: existingAnalysis } = await supabase
        .from('movie_analyses')
        .select('id')
        .eq('movie_id', movie.id)
        .eq('analysis_type', 'page_analysis')
        .single();

      stages.database = Date.now() - dbStart;

      if (existingAnalysis) {
        console.log(`✅ Skipped ${movie.title} (${movie.year}) - analysis exists`);
        processedIds.add(movie.id);
        return { success: true, skipped: true, stages };
      }

      // Stage 2: Claude API call with prompt caching
      const apiStart = Date.now();
      
      const promptConfig = buildPrompt(
        'MOVIE_ANALYSIS',
        'Include 3-4 accessibly written Explore Further topics for additional explorations'
      );

      const response = await anthropic.messages.create({
        ...promptConfig,
        messages: [
          {
            role: 'user',
            content: `${movie.title} (${movie.year})`,
          },
        ],
      });

      stages.api = Date.now() - apiStart;

      const analysis = response.content[0].text;
      const usage = response.usage;

      // Calculate cost with caching savings
      const baseCost = (usage.input_tokens * 3) / 1000000 + (usage.output_tokens * 15) / 1000000;
      const costWithCaching = baseCost * (1 - PROCESSING_CONFIG.CACHE_SAVINGS);

      // Stage 3: Storage
      const storageStart = Date.now();

      const analysisData = {
        raw_content: analysis,
        generated_at: new Date().toISOString(),
        cost_estimate: costWithCaching,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        model: promptConfig.model,
        optimized_processing: true,
        entity_data: null,
      };

      await supabase.from('movie_analyses').insert({
        movie_id: movie.id,
        analysis_type: 'page_analysis',
        claude_response: analysisData,
        query_text: `Optimized nuclear analysis for ${movie.title} (${movie.year})`,
      });

      stages.storage = Date.now() - storageStart;

      const totalTime = Date.now() - movieStart;
      processedIds.add(movie.id);

      console.log(
        `✅ ${movie.title} (${movie.year}) - ${(totalTime / 1000).toFixed(1)}s ` +
        `(DB: ${stages.database}ms, API: ${(stages.api / 1000).toFixed(1)}s, Storage: ${stages.storage}ms) ` +
        `Cost: $${costWithCaching.toFixed(4)}`
      );

      this.stats.totalCost += costWithCaching;
      this.stats.processingTimes.push(totalTime);

      return { 
        success: true, 
        skipped: false, 
        stages, 
        cost: costWithCaching,
        tokens: usage.input_tokens + usage.output_tokens 
      };

    } catch (error) {
      const totalTime = Date.now() - movieStart;
      console.error(`❌ ${movie.title} (${movie.year}) failed in ${(totalTime / 1000).toFixed(1)}s:`, error.message);
      return { success: false, error: error.message, stages };
    }
  }

  /**
   * Process movies with concurrency control
   */
  async processMoviesConcurrently(movies, maxConcurrency = PROCESSING_CONFIG.MAX_CONCURRENT) {
    const processedIds = this.loadProgress();
    const pendingMovies = movies.filter(m => !processedIds.has(m.id));
    
    console.log(`🎯 Processing ${pendingMovies.length} pending movies (${processedIds.size} already processed)`);
    
    if (pendingMovies.length === 0) {
      console.log('✅ All movies already processed');
      return { success: true };
    }

    let activePromises = [];
    let results = [];

    for (const movie of pendingMovies) {
      // Wait for available slot
      if (activePromises.length >= maxConcurrency) {
        const completed = await Promise.race(activePromises);
        activePromises = activePromises.filter(p => p !== completed);
        results.push(await completed);
        
        // Update stats
        if ((await completed).success && !(await completed).skipped) {
          this.stats.successfulAnalyses++;
        } else if (!(await completed).success) {
          this.stats.failedAnalyses++;
        }
        this.stats.totalProcessed++;

        // Save progress periodically
        if (this.stats.totalProcessed % 10 === 0) {
          this.saveProgress(processedIds);
          this.printProgress();
        }
      }

      // Start processing this movie
      const moviePromise = this.processMovie(movie, processedIds);
      activePromises.push(moviePromise);

      // Rate limiting
      if (PROCESSING_CONFIG.DELAY_BETWEEN_REQUESTS > 0) {
        await new Promise(resolve => setTimeout(resolve, PROCESSING_CONFIG.DELAY_BETWEEN_REQUESTS));
      }
    }

    // Wait for remaining movies
    const remainingResults = await Promise.all(activePromises);
    results.push(...remainingResults);

    // Final stats update
    for (const result of remainingResults) {
      if (result.success && !result.skipped) {
        this.stats.successfulAnalyses++;
      } else if (!result.success) {
        this.stats.failedAnalyses++;
      }
      this.stats.totalProcessed++;
    }

    // Save final progress
    this.saveProgress(processedIds);

    return { success: true, results };
  }

  /**
   * Print progress update
   */
  printProgress() {
    const elapsed = Date.now() - this.stats.startTime;
    const avgTime = this.stats.processingTimes.length > 0 
      ? this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length 
      : 0;

    console.log(
      `📊 Progress: ${this.stats.totalProcessed} processed, ` +
      `${this.stats.successfulAnalyses} successful, ` +
      `${this.stats.failedAnalyses} failed, ` +
      `Avg: ${(avgTime / 1000).toFixed(1)}s, ` +
      `Cost: $${this.stats.totalCost.toFixed(4)}`
    );
  }

  /**
   * Print final summary
   */
  printSummary(moviesToProcess) {
    const totalTime = Date.now() - this.stats.startTime;
    const avgTimePerMovie = this.stats.processingTimes.length > 0 
      ? this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length 
      : 0;

    console.log('\n✅ Optimized nuclear processing complete!');
    console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`⚡ Average per movie: ${(avgTimePerMovie / 1000).toFixed(1)}s`);
    console.log(`📊 Results: ${this.stats.successfulAnalyses} successful, ${this.stats.failedAnalyses} failed`);
    console.log(`💰 Total cost: $${this.stats.totalCost.toFixed(4)} (with 90% prompt caching savings)`);
    console.log(`🎯 Success rate: ${((this.stats.successfulAnalyses / moviesToProcess.length) * 100).toFixed(1)}%`);
    
    // Calculate cost savings vs non-cached calls
    const nonCachedCost = moviesToProcess.length * PROCESSING_CONFIG.COST_PER_ANALYSIS;
    const savings = ((nonCachedCost - this.stats.totalCost) / nonCachedCost * 100);
    console.log(`💡 Cost savings vs non-cached: ${savings.toFixed(1)}% ($${(nonCachedCost - this.stats.totalCost).toFixed(4)} saved)`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    count: 100,
    start: 1,
    end: null,
    dryRun: false,
    maxConcurrency: PROCESSING_CONFIG.MAX_CONCURRENT,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
        options.count = parseInt(args[++i]) || 100;
        break;
      case '--start':
        options.start = parseInt(args[++i]) || 1;
        break;
      case '--end':
        options.end = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--concurrency':
        options.maxConcurrency = parseInt(args[++i]) || PROCESSING_CONFIG.MAX_CONCURRENT;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }

  console.log('🚀 Optimized Nuclear Batch Processing');
  console.log('Combines individual API reliability with prompt caching optimization');
  console.log('Options:', options);
  console.log('');

  try {
    // Get ALL movies with TMDB data for complete processing (bypass 1000 limit)
    let allMovies = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: batch, error: moviesError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .not('tmdb_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);
      
      if (moviesError) {
        console.error('❌ Error fetching movies:', moviesError.message);
        process.exit(1);
      }
      
      if (!batch || batch.length === 0) break;
      
      allMovies = allMovies.concat(batch);
      from += batchSize;
      
      if (batch.length < batchSize) break; // Last batch
    }
    
    if (!allMovies || allMovies.length === 0) {
      console.log('❌ No movies found with TMDB data');
      process.exit(0);
    }
    
    console.log(`📊 Found ${allMovies.length} movies with TMDB data`);
    
    // Get existing analyses to filter out movies that already have them
    const movieIds = allMovies.map(m => m.id);
    const { data: existingAnalyses } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis')
      .in('movie_id', movieIds);
    
    const analyzedMovieIds = new Set(existingAnalyses?.map(a => a.movie_id) || []);
    
    // Filter out movies that already have analysis (zero-waste protection)
    const nuclearCandidates = allMovies
      .filter(movie => !analyzedMovieIds.has(movie.id));

    if (!nuclearCandidates || nuclearCandidates.length === 0) {
      console.log('❌ No nuclear candidates found - all movies have complete analysis');
      process.exit(0);
    }

    console.log(`📊 Found ${nuclearCandidates.length} nuclear candidates`);

    // Determine which movies to process
    let moviesToProcess;

    if (options.end) {
      // Process specific range
      const startIndex = options.start - 1;
      const endIndex = options.end;
      moviesToProcess = nuclearCandidates.slice(startIndex, endIndex);
      console.log(
        `🎯 Processing movies ${options.start}-${options.end} (${moviesToProcess.length} movies)`
      );
    } else {
      // Process next N movies
      moviesToProcess = nuclearCandidates.slice(0, options.count);
      console.log(`🎯 Processing next ${moviesToProcess.length} movies`);
    }

    if (moviesToProcess.length === 0) {
      console.log('✅ No movies need processing');
      process.exit(0);
    }

    // Show what will be processed
    console.log('\n📋 Movies to process:');
    moviesToProcess.slice(0, 10).forEach((movie, index) => {
      console.log(`  ${index + 1}. ${movie.title} (${movie.year}) [ID: ${movie.tmdb_id}]`);
    });

    if (moviesToProcess.length > 10) {
      console.log(`  ... and ${moviesToProcess.length - 10} more`);
    }

    const estimatedCost = moviesToProcess.length * PROCESSING_CONFIG.COST_PER_ANALYSIS * (1 - PROCESSING_CONFIG.CACHE_SAVINGS);
    console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(2)} (with 90% prompt caching savings)`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - No actual processing will occur');
      process.exit(0);
    }

    // Confirm before proceeding
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const proceed = await new Promise(resolve => {
      rl.question('\n❓ Proceed with optimized processing? (y/N): ', answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });

    rl.close();

    if (!proceed) {
      console.log('❌ Cancelled by user');
      process.exit(0);
    }

    // Initialize processor and start processing
    const processor = new OptimizedNuclearProcessor();
    processor.stats.startTime = Date.now();

    console.log('\n🚀 Starting optimized nuclear processing with performance monitoring...');
    console.log(`📊 Using individual API calls with 90% prompt caching savings`);

    const results = await processor.processMoviesConcurrently(moviesToProcess, options.maxConcurrency);

    processor.printSummary(moviesToProcess);

    if (processor.stats.failedAnalyses > 0) {
      console.log('\n⚠️ Some analyses failed. Check logs for details.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Optimized processing failed:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Optimized Nuclear Batch Processing Script

Usage:
  node scripts/optimized-nuclear-batch.js [options]

Options:
  --count <n>        Process next N pending movies (default: 100)
  --start <n>        Start at movie rank N (default: 1)
  --end <n>          End at movie rank N
  --concurrency <n>  Max concurrent requests (default: ${PROCESSING_CONFIG.MAX_CONCURRENT})
  --dry-run          Show what would be processed without doing it
  --help             Show this help

Examples:
  # Process next 50 pending movies
  node scripts/optimized-nuclear-batch.js --count 50
  
  # Process movies ranked 101-200
  node scripts/optimized-nuclear-batch.js --start 101 --end 200
  
  # Dry run to see what would be processed
  node scripts/optimized-nuclear-batch.js --count 100 --dry-run
  
  # Conservative processing with lower concurrency
  node scripts/optimized-nuclear-batch.js --count 25 --concurrency 3
`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n❌ Interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n❌ Terminated');
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});