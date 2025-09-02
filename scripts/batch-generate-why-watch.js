#!/usr/bin/env node

/**
 * Batch Why Watch Generation System
 * 
 * Generates enhanced Why Watch recommendations for all movies in Railway database
 * - Uses enhanced prompt with 3-6 word limits and category variety
 * - Processes 21,275 movies with cost tracking
 * - Saves results to separate Why Watch database table
 * - Progress tracking with resume capability
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';
import fs from 'fs/promises';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Progress tracking
const PROGRESS_FILE = 'why-watch-batch-progress.json';
const RESULTS_FILE = 'why-watch-batch-results.json';

/**
 * Load existing progress or create new progress tracker
 */
async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
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
 * Get all movies from Railway database that need Why Watch generation
 */
async function getMoviesForProcessing(progress) {
  const client = await pool.connect();
  
  try {
    // Get movies with analyses that haven't been processed yet
    let query = `
      SELECT 
        ma.id as analysis_id,
        ma.movie_id,
        ma.claude_response,
        ma.enhanced_sections,
        ma.enhanced_key_elements,
        m.title,
        m.year,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE (ma.claude_response IS NOT NULL AND ma.claude_response->>'raw_content' IS NOT NULL)
        OR (ma.enhanced_sections IS NOT NULL AND jsonb_array_length(ma.enhanced_sections) > 0)
    `;
    
    // Resume from last processed if needed
    const processedIds = new Set(progress.processedIds || []);
    
    const result = await client.query(query);
    
    // Filter out already processed movies
    const unprocessedMovies = result.rows.filter(movie => 
      !processedIds.has(movie.analysis_id)
    );
    
    console.log(`📊 Found ${result.rows.length} total movies with analyses`);
    console.log(`📊 Already processed: ${processedIds.size}`);
    console.log(`📊 Remaining to process: ${unprocessedMovies.length}`);
    
    return unprocessedMovies;
    
  } finally {
    client.release();
  }
}

/**
 * Generate Why Watch recommendation for a single movie
 */
async function generateWhyWatch(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;
  
  try {
    // Extract existing analysis for context - handle both formats
    let existingAnalysis;
    let movieData = {
      title: movie.title,
      year: movie.year,
      tmdb_id: movie.tmdb_id,
      genre: 'Unknown',
      director: 'Unknown'
    };

    // Handle enhanced format first
    if (movie.enhanced_sections && Array.isArray(movie.enhanced_sections)) {
      existingAnalysis = {
        sections: movie.enhanced_sections,
        keyElements: movie.enhanced_key_elements || {}
      };
      movieData.genre = existingAnalysis.keyElements?.genre || 'Unknown';
      movieData.director = existingAnalysis.keyElements?.director || 'Unknown';
    }
    // Handle legacy format
    else if (movie.claude_response && movie.claude_response.raw_content) {
      existingAnalysis = JSON.parse(movie.claude_response.raw_content);
      movieData.genre = existingAnalysis.keyElements?.genre || 'Unknown';
      movieData.director = existingAnalysis.keyElements?.director || 'Unknown';
    }
    else {
      throw new Error('No valid analysis content found');
    }
    
    const prompt = buildWhyWatchPrompt(movieTitle, movieData);
    
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
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
      ],
    });

    const processingTime = Date.now() - startTime;
    const rawResponse = message.content[0].text;
    
    // Parse and validate JSON response
    let response;
    try {
      response = JSON.parse(rawResponse);
    } catch (parseError) {
      throw new Error(`JSON Parse Error: ${parseError.message}`);
    }

    // Validate response format
    const validation = validateWhyWatchResponse(response);
    
    const cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1000000;
    
    return {
      success: true,
      movie: movieTitle,
      analysisId: movie.analysis_id,
      movieId: movie.movie_id,
      tmdbId: movie.tmdb_id,
      whyWatch: response.whyWatch,
      metadata: {
        processingTime,
        tokens: message.usage.input_tokens + message.usage.output_tokens,
        cost
      },
      validation,
      rawResponse: validation.valid ? null : rawResponse.substring(0, 500)
    };
    
  } catch (error) {
    return {
      success: false,
      movie: movieTitle,
      analysisId: movie.analysis_id,
      movieId: movie.movie_id,
      tmdbId: movie.tmdb_id,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Save Why Watch result to database
 */
async function saveWhyWatchResult(result) {
  if (!result.success) return false;
  
  const client = await pool.connect();
  
  try {
    // Insert or update enhanced Why Watch data
    const query = `
      INSERT INTO enhanced_why_watch (
        analysis_id, 
        movie_id, 
        tmdb_id,
        recommendation,
        reasons,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (analysis_id) 
      DO UPDATE SET
        recommendation = EXCLUDED.recommendation,
        reasons = EXCLUDED.reasons,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;
    
    await client.query(query, [
      result.analysisId,
      result.movieId,
      result.tmdbId,
      result.whyWatch.recommendation,
      JSON.stringify(result.whyWatch.reasons),
      JSON.stringify(result.metadata)
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
 * Process movies in batches with gentler rate limiting
 */
async function processBatch(movies, progress, batchSize = 10) {
  const results = [];
  
  // Gentler rate limiting configuration
  const RATE_LIMITS = {
    batchSize: 10,           // Reduced from 50 to 10 movies per batch
    batchDelay: 8000,        // Increased from 2000ms to 8000ms between batches
    requestDelay: 1500,      // New: 1.5s delay between individual requests
    retryDelay: 30000,       // 30s delay on rate limit errors
    maxRetries: 3            // Retry failed requests up to 3 times
  };
  
  for (let i = 0; i < movies.length; i += RATE_LIMITS.batchSize) {
    const batch = movies.slice(i, i + RATE_LIMITS.batchSize);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i/RATE_LIMITS.batchSize) + 1}/${Math.ceil(movies.length/RATE_LIMITS.batchSize)}`);
    console.log(`   Movies ${i + 1}-${Math.min(i + RATE_LIMITS.batchSize, movies.length)} of ${movies.length}`);
    console.log(`   🐌 Gentle rate limiting: ${RATE_LIMITS.batchSize} movies, ${RATE_LIMITS.requestDelay}ms delays`);
    
    // Process batch sequentially with delays (not parallel) to avoid rate limits
    const batchResults = [];
    for (const movie of batch) {
      let attempts = 0;
      let result = null;
      
      while (attempts <= RATE_LIMITS.maxRetries) {
        try {
          result = await generateWhyWatch(movie);
          
          // If rate limited, wait and retry
          if (result && !result.success && result.error?.includes('rate_limit_error')) {
            attempts++;
            if (attempts <= RATE_LIMITS.maxRetries) {
              console.log(`   ⏳ Rate limit hit for ${movie.title}, waiting ${RATE_LIMITS.retryDelay/1000}s... (attempt ${attempts}/${RATE_LIMITS.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.retryDelay));
              continue;
            }
          }
          break;
        } catch (error) {
          attempts++;
          if (attempts <= RATE_LIMITS.maxRetries) {
            console.log(`   ❌ Error for ${movie.title}, retrying in ${RATE_LIMITS.retryDelay/1000}s... (attempt ${attempts}/${RATE_LIMITS.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.retryDelay));
          } else {
            result = {
              success: false,
              movie: `${movie.title} (${movie.year})`,
              analysisId: movie.analysis_id,
              movieId: movie.movie_id,
              tmdbId: movie.tmdb_id,
              error: error.message,
              timestamp: new Date().toISOString()
            };
            break;
          }
        }
      }
      
      batchResults.push(result);
      
      // Delay between individual requests within batch
      if (batch.indexOf(movie) < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.requestDelay));
      }
    }
    
    // Save results to database
    for (const result of batchResults) {
      if (result.success) {
        const saved = await saveWhyWatchResult(result);
        if (saved) {
          progress.successful++;
          progress.processedIds.add(result.analysisId); // Only mark as processed if saved to DB
          console.log(`✅ ${result.whyWatch.recommendation}: ${result.movie}`);
          console.log(`   ${result.whyWatch.reasons.join(' | ')}`);
        } else {
          progress.failed++;
          console.log(`❌ DB Save Failed: ${result.movie}`);
          // Don't add to processedIds - allow retry
        }
      } else {
        progress.failed++;
        progress.errors.push({
          movie: result.movie,
          error: result.error,
          timestamp: result.timestamp
        });
        console.log(`❌ Generation Failed: ${result.movie} - ${result.error}`);
        // Don't add to processedIds - allow retry
      }
      
      progress.processed++;
      progress.totalCost += result.metadata?.cost || 0;
    }
    
    results.push(...batchResults);
    
    // Save progress after each batch
    await saveProgress(progress);
    
    // Longer delay between batches
    if (i + RATE_LIMITS.batchSize < movies.length) {
      console.log(`   ⏳ Extended rate limiting delay (${RATE_LIMITS.batchDelay/1000}s)...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.batchDelay));
    }
  }
  
  return results;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Why Watch Batch Generation');
  console.log('=====================================\n');
  
  try {
    // Load progress
    let progress = await loadProgress();
    progress.processedIds = new Set(progress.processedIds || []);
    
    // Get movies to process
    const movies = await getMoviesForProcessing(progress);
    
    if (movies.length === 0) {
      console.log('🎉 All movies already processed!');
      return;
    }
    
    console.log(`💰 Estimated cost for ${movies.length} movies: $${(movies.length * 0.002).toFixed(2)}\n`);
    
    // Create enhanced_why_watch table if it doesn't exist
    await createWhyWatchTable();
    
    // Process all movies
    const startTime = Date.now();
    const results = await processBatch(movies, progress);
    const totalTime = Date.now() - startTime;
    
    // Final summary
    console.log('\n🎉 BATCH GENERATION COMPLETE');
    console.log('============================');
    console.log(`Total Processed: ${progress.processed}`);
    console.log(`Successful: ${progress.successful}`);
    console.log(`Failed: ${progress.failed}`);
    console.log(`Total Cost: $${progress.totalCost.toFixed(4)}`);
    console.log(`Processing Time: ${Math.round(totalTime / 60000)} minutes`);
    
    // Save final results
    await fs.writeFile(RESULTS_FILE, JSON.stringify({
      summary: {
        totalProcessed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        totalCost: progress.totalCost,
        processingTime: totalTime
      },
      errors: progress.errors,
      completedAt: new Date().toISOString()
    }, null, 2));
    
    if (progress.failed > 0) {
      console.log(`\n⚠️  ${progress.failed} movies failed. Check ${RESULTS_FILE} for details.`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Create enhanced_why_watch table if it doesn't exist
 */
async function createWhyWatchTable() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS enhanced_why_watch (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID REFERENCES movie_analyses(id) ON DELETE CASCADE,
        movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
        tmdb_id INTEGER,
        recommendation VARCHAR(3) NOT NULL CHECK (recommendation IN ('YES', 'NO')),
        reasons JSONB NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(analysis_id)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_why_watch_movie_id 
      ON enhanced_why_watch(movie_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enhanced_why_watch_tmdb_id 
      ON enhanced_why_watch(tmdb_id)
    `);
    
  } finally {
    client.release();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as generateEnhancedWhyWatch };