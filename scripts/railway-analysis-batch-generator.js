/**
 * Railway Analysis Batch Generator - UUID FIXED VERSION
 * 
 * Generates movie analyses using Anthropic's Batch API for 50% cost savings
 * - Handles UUID movie IDs correctly
 * - Processes movies in batches of 25-100 for efficiency
 * - Saves results to movie_analyses table with analysis_type = 'general'
 * - Full progress tracking with resume capability
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildPrompt } from '../lib/prompts/builder.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Properly configured connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Batch processing configuration
const CONFIG = {
  batchSize: 25,           // Movies per batch (max 100 for Anthropic)
  pollInterval: 60000,     // 1 minute polling
  maxWaitHours: 6,         // Max wait time for batch completion
  progressFile: 'railway-analysis-batch-progress.json'
};

/**
 * Progress tracker for batch processing
 */
class BatchProgressTracker {
  constructor() {
    this.batches = [];
    this.processedMovieIds = new Set();
    this.startTime = Date.now();
    this.stats = {
      totalSubmitted: 0,
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalCost: 0
    };
    this.failedMovies = []; // Track failed movies for debugging
  }

  async load() {
    if (existsSync(CONFIG.progressFile)) {
      try {
        const data = JSON.parse(await fs.readFile(CONFIG.progressFile, 'utf-8'));
        this.batches = data.batches || [];
        this.processedMovieIds = new Set(data.processedMovieIds || []);
        this.startTime = data.startTime || Date.now();
        this.stats = data.stats || this.stats;
        this.failedMovies = data.failedMovies || [];
        console.log(`📊 Loaded progress: ${this.batches.length} batches, ${this.processedMovieIds.size} movies processed`);
        return true;
      } catch (error) {
        console.warn('⚠️  Could not load progress file:', error.message);
        return false;
      }
    }
    return false;
  }

  async save() {
    try {
      const data = {
        batches: this.batches,
        processedMovieIds: Array.from(this.processedMovieIds),
        startTime: this.startTime,
        stats: this.stats,
        failedMovies: this.failedMovies,
        savedAt: new Date().toISOString()
      };
      await fs.writeFile(CONFIG.progressFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('⚠️  Failed to save progress:', error.message);
    }
  }

  addBatch(batchInfo) {
    this.batches.push(batchInfo);
    this.stats.totalSubmitted += batchInfo.movieCount;
  }

  updateBatch(batchId, updates) {
    const batch = this.batches.find(b => b.id === batchId);
    if (batch) {
      Object.assign(batch, updates);
    }
  }

  getPendingBatches() {
    return this.batches.filter(b => !b.completed);
  }

  updateStats(successful, failed, cost) {
    this.stats.totalProcessed += successful + failed;
    this.stats.totalSuccessful += successful;
    this.stats.totalFailed += failed;
    this.stats.totalCost += cost;
  }

  addFailedMovie(movie, error) {
    this.failedMovies.push({
      movieId: movie.movieId,
      title: movie.movie,
      error: error,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get movies that need analysis from database
 */
async function getMoviesForProcessing(options, processedIds) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        m.id as movie_id,
        m.title,
        m.year,
        m.tmdb_id
      FROM movies m
      LEFT JOIN movie_analyses ma ON m.id = ma.movie_id AND ma.analysis_type = 'general'
      WHERE ma.id IS NULL
        AND m.title IS NOT NULL
        AND m.year IS NOT NULL
      ORDER BY m.tmdb_id
    `;
    
    const params = [];
    if (options.limit) {
      query += ` LIMIT $1`;
      params.push(options.limit);
    }
    
    const result = await client.query(query, params);
    
    // Filter out already processed movies (UUIDs)
    const unprocessedMovies = result.rows.filter(movie => 
      !processedIds.has(movie.movie_id)
    );
    
    console.log(`📊 Found ${result.rows.length} movies needing analysis`);
    console.log(`📊 Already processed: ${processedIds.size}`);
    console.log(`📊 Remaining to process: ${unprocessedMovies.length}`);
    
    // Log sample movie ID to verify UUID format
    if (unprocessedMovies.length > 0) {
      console.log(`📊 Sample movie_id format: ${unprocessedMovies[0].movie_id}`);
    }
    
    return unprocessedMovies;
    
  } finally {
    client.release();
  }
}

/**
 * Create batch API requests for a group of movies
 */
function createBatchRequests(movies) {
  return movies.map(movie => {
    const movieTitle = `${movie.title} (${movie.year})`;
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-5 Explore Further topics for deeper analysis'
    );
    
    // Use the UUID directly in custom_id
    return {
      custom_id: `movie-${movie.movie_id}`, // This will be like "movie-90116f24-783a-4f2e-b435-948449cbf171"
      params: {
        model: promptConfig.model,
        max_tokens: promptConfig.max_tokens,
        temperature: promptConfig.temperature || 0.4,
        system: promptConfig.system[0]?.text || promptConfig.system, // Extract system prompt text for Batch API
        messages: [
          {
            role: 'user',
            content: movieTitle
          }
        ]
      }
    };
  });
}

/**
 * Submit a batch to Anthropic API
 */
async function submitBatch(movies, batchNumber) {
  if (!movies || movies.length === 0) {
    throw new Error(`Batch ${batchNumber} has no movies`);
  }

  console.log(`📤 Submitting batch ${batchNumber} with ${movies.length} movies...`);
  
  const requests = createBatchRequests(movies);
  
  try {
    const batch = await anthropic.beta.messages.batches.create({
      requests: requests
    });
    
    console.log(`✅ Batch ${batchNumber} submitted: ${batch.id}`);
    console.log(`   Status: ${batch.processing_status}`);
    console.log(`   Requests: ${JSON.stringify(batch.request_counts)}`);
    
    // Validate batch was created properly
    if (!batch.request_counts?.processing && !batch.request_counts?.pending) {
      throw new Error(`Batch ${batchNumber} has no processing/pending requests`);
    }

    return batch;
  } catch (error) {
    console.error(`❌ Failed to submit batch ${batchNumber}:`, error.message);
    throw error;
  }
}

/**
 * Wait for batch completion with polling
 */
async function waitForBatchCompletion(batchId, batchNumber) {
  console.log(`⏳ Waiting for batch ${batchNumber} to complete...`);
  
  const startTime = Date.now();
  const maxWait = CONFIG.maxWaitHours * 60 * 60 * 1000;
  let pollCount = 0;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  while (Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
    
    try {
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      consecutiveErrors = 0; // Reset on success
      pollCount++;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
      console.log(`   Poll ${pollCount} (${elapsed}m): ${batch.processing_status}`);
      console.log(`   Counts: ${JSON.stringify(batch.request_counts)}`);
      
      if (batch.processing_status === 'ended') {
        console.log(`✅ Batch ${batchNumber} completed in ${elapsed} minutes`);
        console.log(`   Final Results: ${batch.request_counts?.succeeded || 0} success, ${batch.request_counts?.errored || 0} failed`);
        return batch;
      }
      
      if (batch.processing_status === 'failed' || batch.processing_status === 'canceled') {
        throw new Error(`Batch ${batchNumber} ${batch.processing_status}`);
      }
    } catch (error) {
      consecutiveErrors++;
      console.error(`⚠️  Failed to retrieve batch ${batchNumber} (attempt ${consecutiveErrors}/${maxConsecutiveErrors}):`, error.message);
      
      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new Error(`Failed to retrieve batch after ${maxConsecutiveErrors} attempts`);
      }
    }
  }
  
  throw new Error(`Batch ${batchNumber} timed out after ${CONFIG.maxWaitHours} hours`);
}

/**
 * Process a single result from batch and save to database
 */
async function processBatchResult(result, moviesMap, tracker) {
  // Validate result structure
  if (!result || !result.custom_id) {
    return {
      success: false,
      error: 'Invalid result structure - missing custom_id'
    };
  }

  // Extract UUID from custom_id (remove "movie-" prefix)
  // custom_id format: "movie-90116f24-783a-4f2e-b435-948449cbf171"
  const movieId = result.custom_id.replace('movie-', ''); // Keep as string UUID
  
  // Lookup movie using UUID string
  const movie = moviesMap.get(movieId);
  
  if (!movie) {
    console.error(`   Debug: Looking for movieId "${movieId}" in map with ${moviesMap.size} entries`);
    console.error(`   Debug: First 3 map keys:`, Array.from(moviesMap.keys()).slice(0, 3));
    return {
      success: false,
      movieId,
      error: `Movie not found in batch (UUID: ${movieId})`
    };
  }

  if (result.result?.type !== 'succeeded') {
    const errorMsg = result.result?.error?.message || 'Request failed';
    tracker.addFailedMovie({
      movieId,
      movie: `${movie.title} (${movie.year})`
    }, errorMsg);
    
    return {
      success: false,
      movieId,
      movie: `${movie.title} (${movie.year})`,
      error: errorMsg
    };
  }

  try {
    // Extract and validate response content
    const content = result.result?.message?.content?.[0]?.text;
    if (!content) {
      throw new Error('Empty response content');
    }

    // Calculate token usage for this specific result
    const usage = result.result?.message?.usage || {};
    const cost = ((usage.input_tokens || 0) * 3 + (usage.output_tokens || 0) * 15) / 1000000;

    // Save to database with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const analysisData = {
        raw_content: content,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cost: cost
      };
      
      // Use UPSERT with unique constraint on (movie_id, analysis_type)
      const upsertQuery = `
        INSERT INTO movie_analyses (
          movie_id,
          analysis_type, 
          claude_response,
          query_text,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (movie_id, analysis_type) 
        DO UPDATE SET 
          claude_response = EXCLUDED.claude_response,
          query_text = EXCLUDED.query_text,
          updated_at = NOW()
      `;
      
      await client.query(upsertQuery, [
        movieId, // UUID string
        'general',
        JSON.stringify(analysisData),
        `Batch analysis for ${movie.title} (${movie.year})`
      ]);
      
      await client.query('COMMIT');
      
      return {
        success: true,
        movieId,
        movie: `${movie.title} (${movie.year})`,
        cost
      };
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    tracker.addFailedMovie({
      movieId,
      movie: `${movie.title} (${movie.year})`
    }, error.message);
    
    return {
      success: false,
      movieId,
      movie: `${movie.title} (${movie.year})`,
      error: error.message
    };
  }
}

/**
 * Process all results from a completed batch
 */
async function processBatchResults(batch, movies, batchNumber, tracker) {
  console.log(`📥 Processing results for batch ${batchNumber}...`);
  
  // Create a map for quick movie lookup using UUID strings as keys
  const moviesMap = new Map(movies.map(m => [m.movie_id, m]));
  console.log(`   Created lookup map with ${moviesMap.size} movies`);
  
  let resultsStream;
  try {
    resultsStream = await anthropic.beta.messages.batches.results(batch.id);
  } catch (error) {
    console.error(`❌ Failed to get results stream for batch ${batchNumber}:`, error.message);
    return { successful: 0, failed: movies.length, cost: 0, processedIds: [] };
  }
  
  const results = { 
    successful: 0, 
    failed: 0, 
    cost: 0,
    processedIds: []
  };
  
  let resultCount = 0;
  try {
    for await (const result of resultsStream) {
      resultCount++;
      const processed = await processBatchResult(result, moviesMap, tracker);
      
      if (processed.success) {
        results.successful++;
        results.cost += processed.cost || 0;
        results.processedIds.push(processed.movieId);
        console.log(`  ✅ [${resultCount}] ${processed.movie} - ${(processed.cost || 0).toFixed(4)}`);
      } else {
        results.failed++;
        console.log(`  ❌ [${resultCount}] ${processed.movie || `Movie ${processed.movieId}`} - ${processed.error}`);
      }
    }
  } catch (streamError) {
    console.error(`⚠️  Stream processing error for batch ${batchNumber}:`, streamError.message);
  }
  
  // Calculate total batch cost from usage if available
  if (batch.usage) {
    const batchCost = ((batch.usage.input_tokens || 0) * 3 + (batch.usage.output_tokens || 0) * 15) / 1000000;
    console.log(`📊 Batch ${batchNumber} total cost from usage: ${batchCost.toFixed(4)}`);
    // Use the more accurate batch-level cost if available
    if (batchCost > 0) {
      results.cost = batchCost;
    }
  }
  
  console.log(`✅ Batch ${batchNumber} complete: ${results.successful} successful, ${results.failed} failed out of ${resultCount} total`);
  
  return results;
}

/**
 * Reprocess failed batches from a previous run
 */
async function reprocessFailedBatches(tracker) {
  const completedBatches = tracker.batches.filter(b => b.completed && b.id);
  
  if (completedBatches.length === 0) {
    console.log('No completed batches to reprocess');
    return;
  }
  
  console.log(`\n🔄 REPROCESSING ${completedBatches.length} COMPLETED BATCHES`);
  console.log('This will re-fetch results and attempt to save them to the database\n');
  
  for (const batchInfo of completedBatches) {
    try {
      console.log(`\n📥 Reprocessing batch ${batchInfo.number} (${batchInfo.id})`);
      
      // Get the batch status
      const batch = await anthropic.beta.messages.batches.retrieve(batchInfo.id);
      
      if (batch.processing_status !== 'ended') {
        console.log(`   Skipping - batch status is ${batch.processing_status}`);
        continue;
      }
      
      // Reprocess results
      const results = await processBatchResults(batch, batchInfo.movies, batchInfo.number, tracker);
      
      // Update stats
      tracker.updateStats(results.successful, results.failed, results.cost);
      results.processedIds.forEach(id => tracker.processedMovieIds.add(id));
      
      // Update batch info
      tracker.updateBatch(batchInfo.id, {
        reprocessed: true,
        reprocessedAt: new Date().toISOString(),
        reprocessResults: results
      });
      
      await tracker.save();
      
    } catch (error) {
      console.error(`❌ Error reprocessing batch ${batchInfo.number}:`, error.message);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    limit: null,
    batchSize: CONFIG.batchSize,
    resume: !args.includes('--restart'),
    dryRun: args.includes('--dry-run'),
    reprocess: args.includes('--reprocess')
  };
  
  // Parse --limit or --count argument
  const limitArg = args.find(arg => arg.startsWith('--limit=') || arg.startsWith('--count='));
  if (limitArg) {
    const limit = parseInt(limitArg.split('=')[1]);
    if (!isNaN(limit) && limit > 0) {
      options.limit = limit;
    }
  }
  
  // Parse --batch-size argument
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  if (batchSizeArg) {
    const size = parseInt(batchSizeArg.split('=')[1]);
    if (!isNaN(size) && size > 0 && size <= 100) {
      options.batchSize = size;
      CONFIG.batchSize = size;
    }
  }
  
  // Show help
  if (args.includes('--help')) {
    console.log(`
Railway Analysis Batch Generator (UUID Fixed Version)

USAGE:
  node scripts/railway-analysis-batch-generator.js [OPTIONS]

OPTIONS:
  --limit=N, --count=N  Process only N movies
  --batch-size=N        Movies per batch (default: 25, max: 100)
  --resume              Resume from previous progress (default)
  --restart             Start fresh, ignoring previous progress
  --reprocess           Reprocess completed batches (fix failed saves)
  --dry-run             Show what would be processed without submitting
  --help                Show this help message

BENEFITS:
  - Uses Anthropic Batch API for 50% cost savings
  - Handles UUID movie IDs correctly
  - Full progress tracking and resume capability
  - Can reprocess failed batches

EXAMPLES:
  # Process 100 movies in batches of 25
  node scripts/railway-analysis-batch-generator.js --limit=100
  
  # Reprocess failed saves from previous run
  node scripts/railway-analysis-batch-generator.js --reprocess
  
  # Resume previous session
  node scripts/railway-analysis-batch-generator.js --resume
    `);
    process.exit(0);
  }
  
  try {
    console.log('🚀 Railway Analysis Batch Generator (UUID Fixed Version)');
    console.log('=========================================================');
    console.log(`📊 Limit: ${options.limit || 'No limit'}`);
    console.log(`📊 Batch size: ${options.batchSize} movies per batch`);
    console.log(`📊 Mode: ${options.dryRun ? 'DRY RUN' : options.reprocess ? 'REPROCESS' : options.resume ? 'RESUME' : 'FRESH START'}`);
    console.log('');
    
    // Initialize progress tracker
    const tracker = new BatchProgressTracker();
    if (options.resume || options.reprocess) {
      await tracker.load();
    }
    
    // If reprocess mode, reprocess existing batches
    if (options.reprocess) {
      await reprocessFailedBatches(tracker);
    } else {
      // Check for pending batches from previous run
      if (options.resume) {
        const pendingBatches = tracker.getPendingBatches();
        
        if (pendingBatches.length > 0) {
          console.log(`📊 Found ${pendingBatches.length} pending batches from previous run`);
          console.log('');
          
          // Process pending batches
          for (const batchInfo of pendingBatches) {
            try {
              console.log(`\n🔄 Resuming batch ${batchInfo.number} (${batchInfo.id})`);
              
              // Wait for completion
              const completedBatch = await waitForBatchCompletion(batchInfo.id, batchInfo.number);
              
              // Process results
              const results = await processBatchResults(completedBatch, batchInfo.movies, batchInfo.number, tracker);
              
              // Update progress
              tracker.updateBatch(batchInfo.id, {
                completed: true,
                results: results,
                completedAt: new Date().toISOString()
              });
              
              tracker.updateStats(results.successful, results.failed, results.cost);
              results.processedIds.forEach(id => tracker.processedMovieIds.add(id));
              
              await tracker.save();
              
            } catch (error) {
              console.error(`❌ Error processing batch ${batchInfo.number}:`, error.message);
              tracker.updateBatch(batchInfo.id, {
                completed: true,
                failed: true,
                error: error.message
              });
            }
          }
        }
      }
      
      // Get new movies to process
      const movies = await getMoviesForProcessing(options, tracker.processedMovieIds);
      
      if (movies.length === 0) {
        console.log('\n✅ No new movies need processing');
      } else {
        const batchCount = Math.ceil(movies.length / options.batchSize);
        console.log(`\n📊 Processing ${movies.length} movies in ${batchCount} batches`);
        
        if (options.dryRun) {
          console.log('\n🔍 DRY RUN - Showing what would be processed:');
          for (let i = 0; i < Math.min(5, movies.length); i++) {
            console.log(`   - ${movies[i].title} (${movies[i].year}) [${movies[i].movie_id}]`);
          }
          if (movies.length > 5) {
            console.log(`   ... and ${movies.length - 5} more`);
          }
          return;
        }
        
        // Submit all batches first
        console.log('\n=== SUBMITTING BATCHES ===');
        const submittedBatches = [];
        
        for (let i = 0; i < movies.length; i += options.batchSize) {
          const batchMovies = movies.slice(i, i + options.batchSize);
          const batchNumber = Math.floor(i / options.batchSize) + 1;
          
          try {
            const batch = await submitBatch(batchMovies, batchNumber);
            
            const batchInfo = {
              id: batch.id,
              number: batchNumber,
              movies: batchMovies,
              movieCount: batchMovies.length,
              submittedAt: new Date().toISOString(),
              completed: false
            };
            
            tracker.addBatch(batchInfo);
            submittedBatches.push(batchInfo);
            
            await tracker.save();
            
            // Brief delay between submissions
            if (i + options.batchSize < movies.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
          } catch (error) {
            console.error(`❌ Failed to submit batch ${batchNumber}:`, error.message);
          }
        }
        
        // Wait for all batches to complete
        if (submittedBatches.length > 0) {
          console.log('\n=== WAITING FOR COMPLETION ===');
          
          for (const batchInfo of submittedBatches) {
            try {
              const completedBatch = await waitForBatchCompletion(batchInfo.id, batchInfo.number);
              const results = await processBatchResults(completedBatch, batchInfo.movies, batchInfo.number, tracker);
              
              tracker.updateBatch(batchInfo.id, {
                completed: true,
                results: results,
                completedAt: new Date().toISOString()
              });
              
              tracker.updateStats(results.successful, results.failed, results.cost);
              results.processedIds.forEach(id => tracker.processedMovieIds.add(id));
              
              await tracker.save();
              
            } catch (error) {
              console.error(`❌ Error processing batch ${batchInfo.number}:`, error.message);
              tracker.updateBatch(batchInfo.id, {
                completed: true,
                failed: true,
                error: error.message
              });
            }
          }
        }
      }
    }
    
    // Final summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`📊 Total submitted: ${tracker.stats.totalSubmitted} movies`);
    console.log(`📊 Total processed: ${tracker.stats.totalProcessed} movies`);
    console.log(`✅ Successful: ${tracker.stats.totalSuccessful}`);
    console.log(`❌ Failed: ${tracker.stats.totalFailed}`);
    console.log(`💰 Total cost: ${tracker.stats.totalCost.toFixed(4)}`);
    
    if (tracker.stats.totalSuccessful > 0) {
      const avgCost = tracker.stats.totalCost / tracker.stats.totalSuccessful;
      console.log(`📊 Average cost per movie: ${avgCost.toFixed(4)}`);
      console.log(`💡 Estimated savings vs individual API: ${(tracker.stats.totalCost).toFixed(2)} (50% reduction)`);
    }
    
    const completedBatches = tracker.batches.filter(b => b.completed && !b.failed);
    const failedBatches = tracker.batches.filter(b => b.failed);
    
    if (failedBatches.length > 0) {
      console.log(`\n⚠️  ${failedBatches.length} batches failed to complete`);
    }
    
    if (tracker.failedMovies.length > 0) {
      console.log(`\n⚠️  ${tracker.failedMovies.length} movies failed to save. Run with --reprocess to retry.`);
      console.log(`   First few failures:`);
      tracker.failedMovies.slice(0, 5).forEach(fm => {
        console.log(`   - ${fm.title}: ${fm.error}`);
      });
    }
    
    console.log('\n✅ Batch processing complete!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    try {
      await pool.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database pool:', error.message);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing pool:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing pool:', error.message);
  }
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Startup error:', error);
    process.exit(1);
  });
}