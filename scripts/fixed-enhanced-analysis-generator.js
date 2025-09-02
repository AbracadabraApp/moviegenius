#!/usr/bin/env node

/**
 * Fixed Enhanced Analysis Batch Generator
 * 
 * Generates enhanced movie analyses using Anthropic's batch API with corrected
 * cost calculations, proper error handling, and memory-efficient processing.
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { buildEnhancedAnalysisPrompt } from '../lib/prompts/enhanced-analysis-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configuration
const CONFIG = {
  batchSize: 25,              // Smaller, more reliable batch size
  maxConcurrentBatches: 2,    // Conservative concurrency
  pollInterval: 60000,        // 1 minute polling
  maxWaitHours: 6,            // Max wait time
  progressFile: './enhanced-analysis-progress.json'
};

/**
 * Progress tracker
 */
class BatchTracker {
  constructor() {
    this.batches = [];
    this.totalCost = 0;
    this.startTime = Date.now();
    this.loadProgress();
  }

  addBatch(batchInfo) {
    this.batches.push(batchInfo);
    this.saveProgress();
  }

  updateBatch(batchId, updates) {
    const batch = this.batches.find(b => b.id === batchId);
    if (batch) {
      Object.assign(batch, updates);
      this.saveProgress();
    }
  }

  getPendingBatches() {
    return this.batches.filter(b => !b.completed);
  }

  saveProgress() {
    const data = {
      batches: this.batches,
      totalCost: this.totalCost,
      startTime: this.startTime,
      savedAt: new Date().toISOString()
    };
    writeFileSync(CONFIG.progressFile, JSON.stringify(data, null, 2));
  }

  loadProgress() {
    if (existsSync(CONFIG.progressFile)) {
      try {
        const data = JSON.parse(readFileSync(CONFIG.progressFile, 'utf8'));
        this.batches = data.batches || [];
        this.totalCost = data.totalCost || 0;
        this.startTime = data.startTime || Date.now();
        console.log(`Loaded ${this.batches.length} batches from progress`);
      } catch (error) {
        console.warn('Could not load progress:', error.message);
      }
    }
  }
}

/**
 * Safely ensure enhanced columns exist
 */
async function ensureEnhancedColumns() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Use ADD COLUMN IF NOT EXISTS to prevent conflicts
    await client.query(`
      ALTER TABLE movie_analyses 
      ADD COLUMN IF NOT EXISTS enhanced_sections JSONB,
      ADD COLUMN IF NOT EXISTS enhanced_key_elements JSONB,
      ADD COLUMN IF NOT EXISTS enhanced_format BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS enhanced_processed_at TIMESTAMP
    `);
    
    await client.query('COMMIT');
    console.log('Enhanced columns ensured');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to ensure columns: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Get movies needing enhanced analysis
 */
async function getMoviesNeedingAnalysis(limit) {
  const query = `
    SELECT DISTINCT m.tmdb_id, m.title, m.year, m.id
    FROM movies m
    INNER JOIN movie_analyses ma ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND (ma.enhanced_format IS NOT TRUE OR ma.enhanced_format IS NULL)
    ORDER BY m.tmdb_id
    ${limit ? 'LIMIT $1' : ''}
  `;

  const params = limit ? [limit] : [];
  const result = await pool.query(query, params);
  
  console.log(`Found ${result.rows.length} movies needing enhanced analysis`);
  return result.rows;
}

/**
 * Create batch requests
 */
function createBatchRequests(movies) {
  return movies.map(movie => {
    const prompt = buildEnhancedAnalysisPrompt(movie.title, movie.year);
    
    return {
      custom_id: `movie-${movie.tmdb_id}`,
      params: {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }
    };
  });
}

/**
 * Submit batch with retry logic
 */
async function submitBatch(movies, batchNumber) {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Submitting batch ${batchNumber} (${movies.length} movies) - Attempt ${attempt}`);
      
      const requests = createBatchRequests(movies);
      const batch = await anthropic.beta.messages.batches.create({
        requests: requests
      });

      console.log(`Batch ${batchNumber} submitted: ${batch.id}`);
      console.log(`Status: ${batch.processing_status}`);
      
      return batch;
      
    } catch (error) {
      console.error(`Batch ${batchNumber} submission failed (attempt ${attempt}):`, error.message);
      
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Wait for batch completion
 */
async function waitForCompletion(batchId, batchNumber) {
  console.log(`Waiting for batch ${batchNumber} completion...`);
  
  const startTime = Date.now();
  const maxWait = CONFIG.maxWaitHours * 60 * 60 * 1000;
  let pollCount = 0;

  while (Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
    
    const batch = await anthropic.beta.messages.batches.retrieve(batchId);
    pollCount++;
    
    const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`Poll ${pollCount} (${elapsed}m): ${batch.processing_status}`);
    
    if (batch.processing_status === 'ended') {
      console.log(`Batch ${batchNumber} completed in ${elapsed} minutes`);
      return batch;
    }
    
    if (batch.processing_status === 'failed') {
      throw new Error(`Batch ${batchNumber} failed`);
    }
  }
  
  throw new Error(`Batch ${batchNumber} timed out`);
}

/**
 * Process individual result
 */
async function processResult(result, movies) {
  const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
  const movie = movies.find(m => m.tmdb_id === tmdbId);
  
  if (result.result.type === 'error') {
    return {
      tmdbId,
      success: false,
      error: result.result.error?.message || 'Request failed'
    };
  }

  try {
    // Parse JSON response directly
    const content = result.result.message.content[0].text;
    const response = JSON.parse(content);
    
    // Basic validation
    if (!response.sections || !Array.isArray(response.sections) || response.sections.length !== 4) {
      throw new Error('Invalid response structure');
    }
    
    // Get the specific movie record first
    const movieResult = await pool.query(
      'SELECT id FROM movies WHERE tmdb_id = $1', 
      [tmdbId]
    );
    
    if (movieResult.rows.length === 0) {
      throw new Error(`Movie not found: ${tmdbId}`);
    }
    
    // Update with enhanced analysis
    const updateResult = await pool.query(`
      UPDATE movie_analyses 
      SET enhanced_sections = $1,
          enhanced_key_elements = $2,
          enhanced_format = TRUE,
          enhanced_processed_at = NOW()
      WHERE movie_id = $3
    `, [
      JSON.stringify(response.sections),
      JSON.stringify(response.keyElements || {}),
      movieResult.rows[0].id
    ]);
    
    if (updateResult.rowCount === 0) {
      throw new Error(`No analysis record found for movie ${tmdbId}`);
    }
    
    const totalWords = response.sections.reduce((sum, section) => 
      sum + (section.text ? section.text.split(' ').length : 0), 0
    );
    
    return {
      tmdbId,
      success: true,
      title: movie?.title || 'Unknown',
      sections: response.sections.length,
      totalWords
    };
    
  } catch (error) {
    console.error(`Error processing movie ${tmdbId}:`, error.message);
    return {
      tmdbId,
      success: false,
      error: error.message
    };
  }
}

/**
 * Process all results from completed batch
 */
async function processResults(batch, movies, batchNumber) {
  console.log(`Processing results for batch ${batchNumber}...`);
  
  const resultsStream = await anthropic.beta.messages.batches.results(batch.id);
  const results = { successful: 0, failed: 0, cost: 0 };
  let processedCount = 0;
  
  // Process results as they stream (memory efficient)
  for await (const result of resultsStream) {
    const processed = await processResult(result, movies);
    
    if (processed.success) {
      results.successful++;
      console.log(`  SUCCESS: ${processed.title} (${processed.sections} sections, ${processed.totalWords} words)`);
    } else {
      results.failed++;
      console.log(`  FAILED: TMDB ${processed.tmdbId} - ${processed.error}`);
    }
    
    processedCount++;
    if (processedCount % 10 === 0) {
      console.log(`  Processed ${processedCount} results...`);
    }
  }
  
  // Calculate cost correctly with both batch and cache savings
  const usage = batch.usage || { input_tokens: 0, output_tokens: 0 };
  
  // Base costs (Claude 3.5 Sonnet pricing)
  const inputTokenCost = usage.input_tokens * 0.003 / 1000;
  const outputTokenCost = usage.output_tokens * 0.015 / 1000;
  const baseCost = inputTokenCost + outputTokenCost;
  
  // Apply both optimizations:
  // 1. Cache savings: 95% reduction on input tokens (shared prompts)
  const cachedInputCost = inputTokenCost * 0.05; // 5% of original input cost
  const costWithCache = cachedInputCost + outputTokenCost;
  
  // 2. Batch API discount: 50% reduction on total
  const finalCost = costWithCache * 0.5;
  results.cost = finalCost;
  
  console.log(`Batch ${batchNumber}: ${results.successful} successful, ${results.failed} failed`);
  console.log(`Cost: ${results.cost.toFixed(4)} (base: ${baseCost.toFixed(4)}, with cache: ${costWithCache.toFixed(4)})`);
  
  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit=') || arg.startsWith('--count='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
    const dryRun = args.includes('--dry-run');
    const resume = args.includes('--resume');

    console.log('Enhanced Analysis Batch Generator');
    console.log('=================================');
    console.log(`Limit: ${limit || 'No limit'}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : resume ? 'RESUME' : 'PRODUCTION'}`);
    console.log('');

    // Ensure database schema
    await ensureEnhancedColumns();
    
    const tracker = new BatchTracker();

    if (resume) {
      // Resume pending batches
      const pendingBatches = tracker.getPendingBatches();
      
      if (pendingBatches.length === 0) {
        console.log('No pending batches found');
        return;
      }
      
      console.log(`Resuming ${pendingBatches.length} pending batches...`);
      
      for (const batchInfo of pendingBatches) {
        try {
          console.log(`\nResuming batch ${batchInfo.number} (${batchInfo.id})`);
          const completedBatch = await waitForCompletion(batchInfo.id, batchInfo.number);
          const results = await processResults(completedBatch, batchInfo.movies, batchInfo.number);
          
          tracker.updateBatch(batchInfo.id, {
            completed: true,
            results: results,
            completedAt: new Date().toISOString()
          });
          tracker.totalCost += results.cost;
          
        } catch (error) {
          console.error(`Error resuming batch ${batchInfo.number}:`, error.message);
        }
      }
      
    } else {
      // Normal mode: create new batches
      const movies = await getMoviesNeedingAnalysis(limit);
      
      if (movies.length === 0) {
        console.log('No movies need enhanced analysis');
        return;
      }
      
      const batchCount = Math.ceil(movies.length / CONFIG.batchSize);
      console.log(`Processing ${movies.length} movies in ${batchCount} batches`);
      
      if (dryRun) {
        console.log('DRY RUN - No batches will be submitted');
        return;
      }
      
      // Submit all batches
      console.log('\n=== SUBMITTING BATCHES ===');
      for (let i = 0; i < movies.length; i += CONFIG.batchSize) {
        const batchMovies = movies.slice(i, i + CONFIG.batchSize);
        const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
        
        try {
          const batch = await submitBatch(batchMovies, batchNumber);
          
          tracker.addBatch({
            id: batch.id,
            number: batchNumber,
            movies: batchMovies,
            submittedAt: new Date().toISOString(),
            completed: false
          });
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`Failed to submit batch ${batchNumber}:`, error.message);
        }
      }
      
      // Wait for all to complete
      console.log('\n=== WAITING FOR COMPLETION ===');
      const submittedBatches = tracker.batches.filter(b => !b.completed);
      
      for (const batchInfo of submittedBatches) {
        try {
          console.log(`\nWaiting for batch ${batchInfo.number}...`);
          const completedBatch = await waitForCompletion(batchInfo.id, batchInfo.number);
          const results = await processResults(completedBatch, batchInfo.movies, batchInfo.number);
          
          tracker.updateBatch(batchInfo.id, {
            completed: true,
            results: results,
            completedAt: new Date().toISOString()
          });
          tracker.totalCost += results.cost;
          
        } catch (error) {
          console.error(`Error processing batch ${batchInfo.number}:`, error.message);
        }
      }
    }
    
    // Final summary
    const completedBatches = tracker.batches.filter(b => b.completed);
    const totalSuccessful = completedBatches.reduce((sum, b) => sum + (b.results?.successful || 0), 0);
    const totalFailed = completedBatches.reduce((sum, b) => sum + (b.results?.failed || 0), 0);
    
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Completed batches: ${completedBatches.length}/${tracker.batches.length}`);
    console.log(`Successful analyses: ${totalSuccessful}`);
    console.log(`Failed analyses: ${totalFailed}`);
    console.log(`Total cost: ${tracker.totalCost.toFixed(2)}`);
    if (totalSuccessful > 0) {
      console.log(`Average cost per analysis: ${(tracker.totalCost / totalSuccessful).toFixed(4)}`);
    }
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}