#!/usr/bin/env node

/**
 * Enhanced More Ideas Generator
 * 
 * Generates movie recommendations with:
 * - Resume functionality (checkpoint saves)
 * - Rich progress logging with timestamps
 * - Error categorization and retry logic
 * - Comprehensive stats tracking
 * - Cost monitoring and projections
 * 
 * Based on proven patterns from railway-analysis-batch-generator.js
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildMoreIdeasPrompt, validateMoreIdeasResponse } from '../lib/prompts/more-ideas-generator.js';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Progress tracking files
const PROGRESS_FILE = 'more-ideas-progress.json';
const RESULTS_FILE = 'more-ideas-results.json';

/**
 * Configuration with command line argument parsing
 */
function parseOptions() {
  const args = process.argv.slice(2);
  
  return {
    testMode: !args.includes('--production'),
    maxMovies: args.find(arg => arg.startsWith('--count='))?.split('=')[1] ? 
               parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1]) : 
               (args.includes('--production') ? null : 50),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '5'),
    resume: !args.includes('--restart'),
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help')
  };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🎬 Enhanced More Ideas Generator
==============================

USAGE:
  node scripts/enhanced-more-ideas-generator.js [options]

OPTIONS:
  --production        Run in production mode (default: test mode with 50 movies)
  --count N           Limit processing to N movies
  --batch-size N      Process N movies in each batch (default: 5)
  --resume            Resume from previous progress (default)
  --restart           Start fresh, ignoring previous progress
  --dry-run           Show what would be processed without making API calls
  --help              Show this help message

EXAMPLES:
  # Test mode (50 movies max)
  node scripts/enhanced-more-ideas-generator.js

  # Production mode (all movies)  
  node scripts/enhanced-more-ideas-generator.js --production

  # Resume previous session
  node scripts/enhanced-more-ideas-generator.js --production --resume
    `);
}

/**
 * Load existing progress or create new progress tracker
 */
async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    const progress = JSON.parse(data);
    // Convert processedIds array back to Set
    progress.processedIds = new Set(progress.processedIds || []);
    return progress;
  } catch (error) {
    return {
      startTime: new Date().toISOString(),
      processed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0,
      lastProcessedId: null,
      processedIds: new Set(),
      errors: [],
      validationIssues: []
    };
  }
}

/**
 * Save progress to disk
 */
async function saveProgress(progress) {
  // Create checkpoint data
  const checkpoint = {
    ...progress,
    processedIds: Array.from(progress.processedIds), // Convert Set to Array for JSON
    lastSaved: new Date().toISOString()
  };
  
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(checkpoint, null, 2));
}

/**
 * Get movies that need More Ideas generated
 */
async function getMoviesForProcessing(options, progress) {
  console.log('📊 Querying database for movies needing More Ideas...');
  
  const client = await pool.connect();
  
  try {
    // Get all movies without More Ideas
    const query = `
      SELECT m.tmdb_id, m.title, m.year
      FROM movies m
      LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
      WHERE mi.tmdb_id IS NULL
      ORDER BY m.tmdb_id
      ${options.maxMovies ? `LIMIT ${options.maxMovies * 2}` : ''}
    `;
    
    const result = await client.query(query);
    console.log(`📊 Found ${result.rows.length} movies needing More Ideas`);
    
    // Filter out already processed movies
    const processedIds = progress.processedIds;
    const unprocessedMovies = result.rows.filter(movie => !processedIds.has(movie.tmdb_id));
    
    console.log(`📊 Already processed: ${processedIds.size}`);
    console.log(`📊 Remaining to process: ${unprocessedMovies.length}`);
    
    // Apply final limit after filtering
    const moviesToProcess = options.maxMovies ? 
      unprocessedMovies.slice(0, options.maxMovies) : 
      unprocessedMovies;
      
    return moviesToProcess;
    
  } finally {
    client.release();
  }
}

/**
 * Generate More Ideas for a single movie with retry logic
 */
async function generateMoreIdeasForMovie(movie, retryCount = 0) {
  const movieTitle = `${movie.title} (${movie.year})`;
  const maxRetries = 3;
  
  try {
    console.log(`   🎬 ${movieTitle}`);
    const startTime = Date.now();
    
    const prompt = buildMoreIdeasPrompt(movieTitle);
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
              cache_control: { type: 'ephemeral' }
            }
          ]
        },
        {
          role: 'assistant',
          content: '{\n  "moreIdeas": [\n    {'
        }
      ]
    });
    
    const processingTime = Date.now() - startTime;
    
    // Reconstruct full JSON
    const prefill = '{\n  "moreIdeas": [\n    {';
    const rawResponse = prefill + message.content[0].text;
    const response = JSON.parse(rawResponse);
    
    // Validate response
    const validation = validateMoreIdeasResponse(response);
    
    // Calculate cost
    const cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
    
    // Save to database
    await pool.query(`
      INSERT INTO more_ideas (tmdb_id, ideas, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
    `, [
      movie.tmdb_id,
      JSON.stringify(response.moreIdeas),
      JSON.stringify(response.metadata || {})
    ]);
    
    const result = {
      success: true,
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      recommendationCount: response.moreIdeas.length,
      cost,
      processingTime,
      validation,
      sampleRecommendation: response.moreIdeas[0] ? {
        title: response.moreIdeas[0].title,
        year: response.moreIdeas[0].year,
        connection: response.moreIdeas[0].connection
      } : null
    };
    
    // Log success with details
    const validationWarning = validation.valid ? '' : ` ⚠️  ${validation.errors.length} issues`;
    console.log(`      ✅ ${response.moreIdeas.length} recommendations | $${cost.toFixed(4)} | ${processingTime}ms${validationWarning}`);
    
    if (result.sampleRecommendation) {
      console.log(`      📋 Sample: ${result.sampleRecommendation.title} (${result.sampleRecommendation.year}) - ${result.sampleRecommendation.connection}`);
    }
    
    return result;
    
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
    
    if (retryCount < maxRetries) {
      console.log(`      🔄 Retrying... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return generateMoreIdeasForMovie(movie, retryCount + 1);
    }
    
    return {
      success: false,
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      error: error.message,
      retryCount
    };
  }
}

/**
 * Process movies in batches with progress tracking
 */
async function processMoviesBatch(movies, progress, options) {
  console.log(`\n🚀 Processing batch of ${movies.length} movies...`);
  const batchStartTime = Date.now();
  
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    
    // Skip if already processed (double-check)
    if (progress.processedIds.has(movie.tmdb_id)) {
      console.log(`   ⏭️  Skipping already processed: ${movie.title} (${movie.year})`);
      continue;
    }
    
    console.log(`\n[${progress.processed + 1}/${movies.length}] Processing: ${movie.title} (${movie.year})`);
    
    if (options.dryRun) {
      console.log(`   🧪 DRY RUN - Would process TMDB ${movie.tmdb_id}`);
      progress.processed++;
      continue;
    }
    
    // Generate More Ideas
    const result = await generateMoreIdeasForMovie(movie);
    
    // Update progress
    progress.processedIds.add(movie.tmdb_id);
    progress.processed++;
    progress.lastProcessedId = movie.tmdb_id;
    
    if (result.success) {
      progress.successful++;
      progress.totalCost += result.cost;
      
      // Track validation issues
      if (result.validation && !result.validation.valid) {
        progress.validationIssues.push({
          tmdbId: movie.tmdb_id,
          title: movie.title,
          errors: result.validation.errors
        });
      }
      
    } else {
      progress.failed++;
      progress.errors.push({
        tmdbId: movie.tmdb_id,
        title: movie.title,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
    // Save progress checkpoint every 5 movies
    if ((progress.processed % 5) === 0) {
      await saveProgress(progress);
      console.log(`   💾 Progress checkpoint saved`);
    }
    
    // Progress stats every 10 movies
    if ((progress.processed % 10) === 0) {
      const elapsed = (Date.now() - new Date(progress.startTime).getTime()) / 1000 / 60;
      const avgCost = progress.totalCost / progress.successful;
      const successRate = (progress.successful / progress.processed) * 100;
      
      console.log(`\n   📊 PROGRESS UPDATE:`);
      console.log(`      ⚡ Processed: ${progress.processed} movies`);
      console.log(`      ✅ Success rate: ${successRate.toFixed(1)}% (${progress.successful}/${progress.processed})`);
      console.log(`      💰 Total cost: $${progress.totalCost.toFixed(4)} | Avg: $${avgCost.toFixed(4)}/movie`);
      console.log(`      ⏱️  Elapsed: ${elapsed.toFixed(1)} minutes`);
    }
    
    // Small delay to avoid rate limits
    if (i < movies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const batchTime = (Date.now() - batchStartTime) / 1000;
  console.log(`\n   📊 Batch complete in ${batchTime.toFixed(1)}s`);
}

/**
 * Generate final summary report
 */
async function generateSummaryReport(progress, totalMovies) {
  const runtime = (Date.now() - new Date(progress.startTime).getTime()) / 1000 / 60;
  const successRate = progress.processed > 0 ? (progress.successful / progress.processed) * 100 : 0;
  const avgCost = progress.successful > 0 ? progress.totalCost / progress.successful : 0;
  const avgTime = runtime / progress.processed;
  
  console.log(`\n🎉 MORE IDEAS GENERATION COMPLETE`);
  console.log(`=====================================`);
  console.log(`📊 Final Summary:`);
  console.log(`   Total processed: ${progress.processed}/${totalMovies}`);
  console.log(`   ✅ Successful: ${progress.successful}`);
  console.log(`   ❌ Failed: ${progress.failed}`);
  console.log(`   📈 Success rate: ${successRate.toFixed(1)}%`);
  console.log(`   💰 Total cost: $${progress.totalCost.toFixed(4)}`);
  console.log(`   📊 Average cost: $${avgCost.toFixed(4)} per movie`);
  console.log(`   ⏱️  Total runtime: ${runtime.toFixed(1)} minutes`);
  console.log(`   ⚡ Average time: ${avgTime.toFixed(1)} minutes per movie`);
  
  if (progress.validationIssues.length > 0) {
    console.log(`   ⚠️  Movies with validation issues: ${progress.validationIssues.length}`);
  }
  
  if (progress.failed > 0) {
    console.log(`\n❌ Failed movies:`);
    progress.errors.forEach(error => {
      console.log(`   • ${error.title} (${error.tmdbId}): ${error.error}`);
    });
  }
  
  // Save detailed results
  const results = {
    summary: {
      totalProcessed: progress.processed,
      successful: progress.successful,
      failed: progress.failed,
      successRate,
      totalCost: progress.totalCost,
      avgCost,
      runtime,
      completedAt: new Date().toISOString()
    },
    errors: progress.errors,
    validationIssues: progress.validationIssues
  };
  
  await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`💾 Detailed results saved to: ${RESULTS_FILE}`);
  console.log(`💾 Progress saved to: ${PROGRESS_FILE}`);
  console.log(`🔄 Can resume anytime with: node scripts/enhanced-more-ideas-generator.js --resume`);
}

/**
 * Main processing function
 */
async function main() {
  try {
    const options = parseOptions();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    console.log('🎬 Enhanced More Ideas Generator');
    console.log('===============================');
    console.log(`📊 Mode: ${options.testMode ? 'Test' : 'Production'}`);
    console.log(`📊 Max movies: ${options.maxMovies || 'unlimited'}`);
    console.log(`📊 Batch size: ${options.batchSize}`);
    console.log(`📊 Resume: ${options.resume}`);
    console.log(`📊 Dry run: ${options.dryRun}`);
    console.log();
    
    // Load progress
    const progress = options.resume ? await loadProgress() : {
      startTime: new Date().toISOString(),
      processed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0,
      lastProcessedId: null,
      processedIds: new Set(),
      errors: [],
      validationIssues: []
    };
    
    if (options.resume && progress.processed > 0) {
      console.log(`📊 Previous progress: ${progress.processed} processed, $${progress.totalCost.toFixed(4)} spent`);
      console.log(`📊 Last processed: TMDB ${progress.lastProcessedId}`);
      console.log();
    }
    
    // Get movies to process
    const moviesToProcess = await getMoviesForProcessing(options, progress);
    
    if (moviesToProcess.length === 0) {
      console.log('✅ No movies need More Ideas generation!');
      return;
    }
    
    console.log(`\n🎬 Starting More Ideas generation for ${moviesToProcess.length} movies`);
    
    if (options.dryRun) {
      console.log('\n🧪 DRY RUN - No API calls will be made');
    } else {
      const estimatedCost = moviesToProcess.length * 0.0115; // Based on test results
      console.log(`💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
    }
    
    console.log(`🚀 Processing in batches of ${options.batchSize}`);
    
    // Process in batches
    for (let i = 0; i < moviesToProcess.length; i += options.batchSize) {
      const batch = moviesToProcess.slice(i, i + options.batchSize);
      await processMoviesBatch(batch, progress, options);
      
      // Save progress after each batch
      await saveProgress(progress);
    }
    
    // Generate final report
    await generateSummaryReport(progress, moviesToProcess.length);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error.stack);
    
    // Try to save progress even if script failed
    try {
      if (typeof progress !== 'undefined') {
        await saveProgress(progress);
        console.log('💾 Progress saved before exit');
      }
    } catch (saveError) {
      console.error('Failed to save progress:', saveError.message);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, saving progress and shutting down...');
  try {
    if (typeof progress !== 'undefined') {
      await saveProgress(progress);
      console.log('💾 Progress saved');
    }
  } catch (error) {
    console.error('Failed to save progress:', error.message);
  }
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}