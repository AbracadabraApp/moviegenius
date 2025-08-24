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
        m.title,
        m.year,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
        AND ma.claude_response->>'raw_content' IS NOT NULL
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
    // Extract existing analysis for context
    const existingAnalysis = JSON.parse(movie.claude_response.raw_content);
    const movieData = {
      title: movie.title,
      year: movie.year,
      tmdb_id: movie.tmdb_id,
      genre: existingAnalysis.keyElements?.genre || 'Unknown',
      director: existingAnalysis.keyElements?.director || 'Unknown'
    };
    
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
 * Process movies in batches with rate limiting
 */
async function processBatch(movies, progress, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movies.length/batchSize)}`);
    console.log(`   Movies ${i + 1}-${Math.min(i + batchSize, movies.length)} of ${movies.length}`);
    
    // Process batch in parallel
    const batchPromises = batch.map(movie => generateWhyWatch(movie));
    const batchResults = await Promise.all(batchPromises);
    
    // Save results to database
    for (const result of batchResults) {
      if (result.success) {
        const saved = await saveWhyWatchResult(result);
        if (saved) {
          progress.successful++;
          console.log(`✅ ${result.whyWatch.recommendation}: ${result.movie}`);
          console.log(`   ${result.whyWatch.reasons.join(' | ')}`);
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
      progress.processedIds.add(result.analysisId);
    }
    
    results.push(...batchResults);
    
    // Save progress after each batch
    await saveProgress(progress);
    
    // Rate limiting - wait between batches
    if (i + batchSize < movies.length) {
      console.log('   ⏳ Rate limiting delay...');
      await new Promise(resolve => setTimeout(resolve, 2000));
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