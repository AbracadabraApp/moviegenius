#!/usr/bin/env node

/**
 * Railway Analysis Batch Generator
 * 
 * Generates new movie analyses using Railway PostgreSQL database
 * - Uses proven Railway database patterns from existing scripts
 * - Processes movies that need new analysis generation
 * - Saves results to movie_analyses table with analysis_type = 'general'
 * - Progress tracking with resume capability
 * - Command line arguments for production/test modes
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
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Progress tracking files
const PROGRESS_FILE = 'railway-analysis-progress.json';
const RESULTS_FILE = 'railway-analysis-results.json';

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
      errors: []
    };
  }
}

/**
 * Save progress to disk
 */
async function saveProgress(progress) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify({
    ...progress,
    processedIds: Array.from(progress.processedIds) // Convert Set to Array for JSON
  }, null, 2));
}

/**
 * Get movies from Railway database that need analysis generation
 */
async function getMoviesForProcessing(options, progress) {
  const client = await pool.connect();
  
  try {
    let query;
    let params = [];
    
    if (options.testMode) {
      // Test mode: get movies without existing analyses (limited count)
      query = `
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
        LIMIT $1
      `;
      params = [options.maxMovies || 50];
    } else {
      // Production mode: get all movies without existing analyses
      query = `
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
      
      if (options.maxMovies) {
        query += ` LIMIT $1`;
        params = [options.maxMovies];
      }
    }
    
    const result = await client.query(query, params);
    
    // Filter out already processed movies from previous runs
    const processedIds = progress.processedIds;
    const unprocessedMovies = result.rows.filter(movie => 
      !processedIds.has(movie.movie_id)
    );
    
    console.log(`📊 Found ${result.rows.length} movies needing analysis`);
    console.log(`📊 Already processed: ${processedIds.size}`);
    console.log(`📊 Remaining to process: ${unprocessedMovies.length}`);
    
    return unprocessedMovies;
    
  } finally {
    client.release();
  }
}

/**
 * Generate movie analysis for a single movie
 */
async function generateAnalysis(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;
  
  try {
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-5 Explore Further topics for deeper analysis'
    );
    
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: movieTitle,
        },
      ],
    });

    const processingTime = Date.now() - startTime;
    const rawResponse = message.content[0].text;
    
    const cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
    
    return {
      success: true,
      movie: movieTitle,
      movieId: movie.movie_id,
      tmdbId: movie.tmdb_id,
      analysis: rawResponse,
      metadata: {
        processingTime,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cost
      }
    };
    
  } catch (error) {
    return {
      success: false,
      movie: movieTitle,
      movieId: movie.movie_id,
      tmdbId: movie.tmdb_id,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Save analysis result to Railway database
 */
async function saveAnalysisResult(result) {
  const client = await pool.connect();
  
  try {
    const analysisData = {
      raw_content: result.analysis,
      input_tokens: result.metadata.inputTokens,
      output_tokens: result.metadata.outputTokens,
      cost: result.metadata.cost
    };
    
    // Delete existing analysis first
    await client.query(`
      DELETE FROM movie_analyses 
      WHERE movie_id = $1 AND analysis_type = 'general'
    `, [result.movieId]);
    
    // Insert new analysis
    const query = `
      INSERT INTO movie_analyses (
        movie_id,
        analysis_type, 
        claude_response,
        query_text,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `;
    
    await client.query(query, [
      result.movieId,
      'general',
      JSON.stringify(analysisData),
      `Railway batch analysis for ${result.movie}`
    ]);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Database save error for ${result.movie}:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Process movies in batches with rate limiting
 */
async function processBatch(movies, progress, options) {
  const batchSize = options.batchSize || 5;
  const results = [];
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    
    console.log(`\\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movies.length/batchSize)}`);
    console.log(`   Movies ${i + 1}-${Math.min(i + batchSize, movies.length)} of ${movies.length}`);
    
    // Process batch sequentially to avoid rate limits
    for (const movie of batch) {
      const result = await generateAnalysis(movie);
      
      if (result.success) {
        const saved = await saveAnalysisResult(result);
        if (saved) {
          progress.successful++;
          console.log(`✅ ${result.movie} - $${result.metadata.cost.toFixed(4)}`);
        } else {
          progress.failed++;
          console.log(`❌ DB Save Failed: ${result.movie}`);
        }
      } else {
        progress.failed++;
        progress.errors.push({
          movie: result.movie,
          error: result.error,
          timestamp: result.timestamp
        });
        console.log(`❌ Generation Failed: ${result.movie} - ${result.error}`);
      }
      
      progress.processed++;
      progress.totalCost += result.metadata?.cost || 0;
      progress.processedIds.add(result.movieId);
      progress.lastProcessedId = result.movieId;
      
      // Save progress every 5 movies
      if (progress.processed % 5 === 0) {
        await saveProgress(progress);
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    results.push(...batch);
  }
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    testMode: args.includes('--test') || args.includes('--test-mode'),
    production: args.includes('--production'),
    maxMovies: null,
    batchSize: 5,
    resume: !args.includes('--restart')
  };
  
  // Parse --count argument
  const countIndex = args.indexOf('--count');
  if (countIndex !== -1 && args[countIndex + 1]) {
    options.maxMovies = parseInt(args[countIndex + 1]);
  }
  
  // Parse --batch-size argument  
  const batchIndex = args.indexOf('--batch-size');
  if (batchIndex !== -1 && args[batchIndex + 1]) {
    options.batchSize = parseInt(args[batchIndex + 1]);
  }
  
  // Show help
  if (args.includes('--help')) {
    console.log(`
Railway Analysis Batch Generator

USAGE:
  node scripts/railway-analysis-batch-generator.js [OPTIONS]

OPTIONS:
  --production        Process all movies needing analysis from Railway database
  --test, --test-mode Process limited movies for testing (default: 50)
  --count N           Limit processing to N movies
  --batch-size N      Process N movies in each batch (default: 5)
  --resume            Resume from previous progress (default)
  --restart           Start fresh, ignoring previous progress
  --help              Show this help message

EXAMPLES:
  # Test with 10 movies
  node scripts/railway-analysis-batch-generator.js --test --count 10
  
  # Production processing with 100 movies
  node scripts/railway-analysis-batch-generator.js --production --count 100
  
  # Resume previous session
  node scripts/railway-analysis-batch-generator.js --production --resume
    `);
    process.exit(0);
  }
  
  // Validate required options
  if (!options.testMode && !options.production) {
    console.error('❌ Must specify either --test or --production mode');
    process.exit(1);
  }
  
  try {
    console.log('🚀 Starting Railway Analysis Batch Generator');
    console.log(`📊 Mode: ${options.testMode ? 'Test' : 'Production'}`);
    console.log(`📊 Max movies: ${options.maxMovies || 'unlimited'}`);
    console.log(`📊 Batch size: ${options.batchSize}`);
    console.log(`📊 Resume: ${options.resume}`);
    
    // Load progress
    const progress = options.resume ? await loadProgress() : {
      startTime: new Date().toISOString(),
      processed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0,
      lastProcessedId: null,
      processedIds: new Set(),
      errors: []
    };
    
    console.log(`📊 Previous progress: ${progress.processed} processed, $${progress.totalCost.toFixed(4)} spent`);
    
    // Get movies to process
    const movies = await getMoviesForProcessing(options, progress);
    
    if (movies.length === 0) {
      console.log('✅ No movies need processing');
      return;
    }
    
    // Process movies
    await processBatch(movies, progress, options);
    
    // Save final progress
    await saveProgress(progress);
    
    // Summary
    console.log('\\n📊 Final Summary:');
    console.log(`   Total processed: ${progress.processed}`);
    console.log(`   Successful: ${progress.successful}`);
    console.log(`   Failed: ${progress.failed}`);
    console.log(`   Total cost: $${progress.totalCost.toFixed(4)}`);
    console.log(`   Average cost per movie: $${(progress.totalCost / progress.successful).toFixed(4)}`);
    
    if (progress.errors.length > 0) {
      console.log('\\n❌ Errors:');
      progress.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.movie}: ${error.error}`);
      });
    }
    
    console.log('✅ Analysis generation complete');
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run if called directly
if (process.argv[1] === __filename) {
  main().catch(error => {
    console.error('💥 Startup error:', error.message);
    process.exit(1);
  });
}