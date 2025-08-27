#!/usr/bin/env node

/**
 * Unified Batch More Ideas Generator
 * 
 * Single script that:
 * 1. Submits batches to Anthropic API
 * 2. Waits for completion 
 * 3. Processes and saves results to database
 * 
 * Fixes from separate scripts:
 * - Consistent JSON handling throughout
 * - Unified error handling and recovery
 * - Atomic operations with proper cleanup
 * - Accurate cost tracking
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { buildMoreIdeasPrompt, validateMoreIdeasResponse } from '../lib/prompts/more-ideas-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Configuration
 */
const CONFIG = {
  batchSize: 20,             // Reduced from 50 for reliability
  maxConcurrentBatches: 2,   // Conservative for API limits
  pollInterval: 300000,      // 5 minutes
  maxWaitHours: 8,           // Extended wait time
  progressFile: '.batch-progress.json'
};

/**
 * Progress tracker with persistence
 */
class BatchProgressTracker {
  constructor(totalMovies) {
    this.totalMovies = totalMovies;
    this.submittedBatches = [];
    this.completedBatches = [];
    this.processedMovies = 0;
    this.successfulMovies = 0;
    this.failedMovies = 0;
    this.totalCost = 0;
    this.startTime = Date.now();
    this.loadProgress();
  }

  addSubmittedBatch(batchInfo) {
    this.submittedBatches.push(batchInfo);
    this.saveProgress();
  }

  markBatchComplete(batchId, results) {
    const batch = this.submittedBatches.find(b => b.id === batchId);
    if (batch) {
      batch.completed = true;
      batch.results = results;
    }
    this.completedBatches.push(batchId);
    this.processedMovies += results.successful.length + results.failed.length;
    this.successfulMovies += results.successful.length;
    this.failedMovies += results.failed.length;
    this.totalCost += results.cost;
    this.saveProgress();
    this.logProgress();
  }

  logProgress() {
    const percentComplete = (this.processedMovies / this.totalMovies * 100).toFixed(1);
    const timeElapsed = (Date.now() - this.startTime) / 1000 / 60;
    const avgCostPerMovie = this.totalCost / Math.max(this.successfulMovies, 1);
    const eta = this.processedMovies > 0 ? 
      timeElapsed / this.processedMovies * (this.totalMovies - this.processedMovies) : 0;

    console.log('\n--- PROGRESS UPDATE ---');
    console.log(`Progress: ${this.processedMovies}/${this.totalMovies} (${percentComplete}%)`);
    console.log(`Success: ${this.successfulMovies}, Failed: ${this.failedMovies}`);
    console.log(`Cost: ${this.totalCost.toFixed(3)} total, ${avgCostPerMovie.toFixed(4)} avg per movie`);
    console.log(`Time: ${timeElapsed.toFixed(1)}m elapsed, ${eta > 0 ? eta.toFixed(1) + 'm remaining' : 'complete'}`);
    console.log('----------------------\n');
  }

  saveProgress() {
    const progress = {
      totalMovies: this.totalMovies,
      submittedBatches: this.submittedBatches,
      completedBatches: this.completedBatches,
      processedMovies: this.processedMovies,
      successfulMovies: this.successfulMovies,
      failedMovies: this.failedMovies,
      totalCost: this.totalCost,
      startTime: this.startTime,
      lastUpdate: Date.now()
    };
    writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
  }

  loadProgress() {
    if (existsSync(CONFIG.progressFile)) {
      try {
        const saved = JSON.parse(readFileSync(CONFIG.progressFile, 'utf8'));
        Object.assign(this, saved);
        console.log('Loaded previous progress - resuming from where we left off');
      } catch (error) {
        console.warn('Failed to load progress file:', error.message);
      }
    }
  }

  getPendingBatches() {
    return this.submittedBatches.filter(b => !b.completed && !this.completedBatches.includes(b.id));
  }

  cleanup() {
    if (existsSync(CONFIG.progressFile)) {
      writeFileSync(CONFIG.progressFile + '.final', readFileSync(CONFIG.progressFile));
      // Don't delete - keep for reference
    }
  }
}

/**
 * Sanitize movie title to prevent JSON errors
 */
function sanitizeMovieTitle(title) {
  if (!title) return '';
  
  return title
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')  
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00BD\u00BC\u00BE]/g, '')
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
}

/**
 * Get movies needing More Ideas
 */
async function getMoviesNeedingMoreIdeas(limit = null) {
  const limitClause = limit ? `LIMIT ${limit}` : '';
  
  const result = await pool.query(`
    SELECT m.tmdb_id, m.title, m.year
    FROM movies m
    LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
    WHERE mi.tmdb_id IS NULL
    ORDER BY m.tmdb_id
    ${limitClause}
  `);
  
  return result.rows.map(movie => ({
    ...movie,
    title: sanitizeMovieTitle(movie.title)
  }));
}

/**
 * Create batch requests for API
 */
function createBatchRequests(movies) {
  return movies.map(movie => {
    const movieTitle = `${movie.title} (${movie.year})`;
    const prompt = buildMoreIdeasPrompt(movieTitle);
    
    return {
      custom_id: `movie-${movie.tmdb_id}`,
      params: {
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
          }
          // No assistant prefill - let Claude generate complete JSON
        ]
      }
    };
  });
}

/**
 * Submit batch with retry logic
 */
async function submitBatchWithRetry(requests, batchNumber, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Submitting batch ${batchNumber} (${requests.length} movies)...`);
      
      const batch = await anthropic.beta.messages.batches.create({
        requests: requests,
      });

      console.log(`✅ Batch ${batchNumber} submitted (ID: ${batch.id})`);
      return batch;
      
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} submission attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Wait for batch completion
 */
async function waitForBatchCompletion(batchId, batchNumber) {
  console.log(`Waiting for batch ${batchNumber} (${batchId}) completion...`);
  
  const startTime = Date.now();
  const maxWaitTime = CONFIG.maxWaitHours * 60 * 60 * 1000;
  let pollCount = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
    
    try {
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      pollCount++;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
      console.log(`Poll ${pollCount} (${elapsed}m): ${batch.processing_status}`);
      
      if (batch.processing_status === 'ended') {
        console.log(`✅ Batch ${batchNumber} completed in ${elapsed} minutes`);
        return batch;
      }
      
      if (batch.processing_status === 'failed') {
        throw new Error(`Batch ${batchNumber} failed processing`);
      }
      
    } catch (error) {
      console.error(`Error polling batch ${batchNumber}:`, error.message);
      throw error;
    }
  }
  
  throw new Error(`Batch ${batchNumber} timed out after ${CONFIG.maxWaitHours} hours`);
}

/**
 * Process individual result safely
 */
async function processIndividualResult(result, movies) {
  const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
  const movie = movies.find(m => m.tmdb_id === tmdbId);
  const movieTitle = movie ? `${movie.title} (${movie.year})` : `TMDB ${tmdbId}`;
  
  try {
    if (result.result.type !== 'succeeded') {
      return {
        success: false,
        tmdbId,
        title: movieTitle,
        error: result.result.error?.message || 'API request failed'
      };
    }

    // Parse JSON response directly (no prefill reconstruction)
    const content = result.result.message.content[0].text;
    const parsedResponse = JSON.parse(content);
    
    // Validate response structure
    const validation = validateMoreIdeasResponse(parsedResponse);
    if (!validation.valid) {
      console.warn(`Validation failed for ${movieTitle}:`, validation.errors);
    }
    
    // Save to database with conflict resolution
    await pool.query(`
      INSERT INTO more_ideas (tmdb_id, ideas, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (tmdb_id) DO UPDATE SET
        ideas = EXCLUDED.ideas,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `, [
      tmdbId,
      JSON.stringify(parsedResponse.moreIdeas),
      JSON.stringify({
        sourceMovie: movieTitle,
        totalRecommendations: parsedResponse.moreIdeas?.length || 0,
        processedAt: new Date().toISOString(),
        validationPassed: validation.valid
      })
    ]);
    
    return {
      success: true,
      tmdbId,
      title: movieTitle,
      recommendations: parsedResponse.moreIdeas?.length || 0
    };
    
  } catch (error) {
    console.error(`Failed to process ${movieTitle}:`, error.message);
    return {
      success: false,
      tmdbId,
      title: movieTitle,
      error: error.message
    };
  }
}

/**
 * Process all results from a completed batch
 */
async function processCompletedBatch(completedBatch, movies, batchNumber) {
  console.log(`Processing results for batch ${batchNumber}...`);
  
  try {
    const resultsStream = await anthropic.beta.messages.batches.results(completedBatch.id);
    
    const successful = [];
    const failed = [];
    let processedCount = 0;
    
    // Process results one by one to avoid memory issues
    for await (const result of resultsStream) {
      try {
        const processed = await processIndividualResult(result, movies);
        
        if (processed.success) {
          successful.push(processed);
        } else {
          failed.push(processed);
        }
        
        processedCount++;
        if (processedCount % 10 === 0) {
          console.log(`  Processed ${processedCount} results...`);
        }
        
      } catch (error) {
        console.error(`Critical error processing result:`, error.message);
        failed.push({
          success: false,
          tmdbId: 'unknown',
          title: 'unknown',
          error: error.message
        });
      }
    }
    
    // Calculate actual cost based on usage
    const usage = completedBatch.usage || { input_tokens: 0, output_tokens: 0 };
    
    // More realistic cost calculation:
    // Base cost: input @ $0.003/1K + output @ $0.015/1K  
    // Cache savings: 90% on input tokens only
    // Batch savings: 50% on total cost
    const inputCost = usage.input_tokens * 0.003 / 1000;
    const outputCost = usage.output_tokens * 0.015 / 1000;
    const cachedInputCost = inputCost * 0.1; // 90% savings on input
    const totalBaseCost = cachedInputCost + outputCost;
    const finalCost = totalBaseCost * 0.5; // 50% batch discount
    
    console.log(`Batch ${batchNumber} complete: ${successful.length} success, ${failed.length} failed`);
    console.log(`Cost: ${finalCost.toFixed(4)} (base: ${(inputCost + outputCost).toFixed(4)})`);
    
    return { successful, failed, cost: finalCost };
    
  } catch (error) {
    console.error(`Critical error processing batch ${batchNumber}:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
    const dryRun = args.includes('--dry-run');
    const resumeOnly = args.includes('--resume');
    
    console.log('🎬 Unified More Ideas Batch Generator');
    console.log('=====================================');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : resumeOnly ? 'RESUME ONLY' : 'PRODUCTION'}`);
    console.log(`Limit: ${limit || 'All movies'}\n`);
    
    // Get movies needing processing (skip if resuming)
    let movies = [];
    let tracker;
    
    if (resumeOnly) {
      // Load existing progress and resume waiting for batches
      tracker = new BatchProgressTracker(0);
      const pendingBatches = tracker.getPendingBatches();
      
      if (pendingBatches.length === 0) {
        console.log('No pending batches found. Exiting.');
        return;
      }
      
      console.log(`Resuming ${pendingBatches.length} pending batches...`);
      
      // Wait for and process pending batches
      for (const batchInfo of pendingBatches) {
        try {
          console.log(`\nResuming batch ${batchInfo.number} (${batchInfo.id})...`);
          const completedBatch = await waitForBatchCompletion(batchInfo.id, batchInfo.number);
          const results = await processCompletedBatch(completedBatch, batchInfo.movies, batchInfo.number);
          tracker.markBatchComplete(batchInfo.id, results);
        } catch (error) {
          console.error(`Failed to resume batch ${batchInfo.number}:`, error.message);
        }
      }
      
    } else {
      // Normal flow: get movies and create new batches
      movies = await getMoviesNeedingMoreIdeas(limit);
      console.log(`Found ${movies.length} movies needing More Ideas generation\n`);
      
      if (movies.length === 0) {
        console.log('✅ All movies already have More Ideas!');
        return;
      }
      
      tracker = new BatchProgressTracker(movies.length);
      
      if (dryRun) {
        console.log('🧪 DRY RUN - Would process in', Math.ceil(movies.length / CONFIG.batchSize), 'batches');
        return;
      }
      
      // Split into batches
      const batches = [];
      for (let i = 0; i < movies.length; i += CONFIG.batchSize) {
        const batchMovies = movies.slice(i, i + CONFIG.batchSize);
        batches.push(batchMovies);
      }
      
      console.log(`Processing ${movies.length} movies in ${batches.length} batches\n`);
      
      // Phase 1: Submit all batches
      console.log('=== PHASE 1: SUBMITTING BATCHES ===\n');
      
      for (let i = 0; i < batches.length; i++) {
        const batchMovies = batches[i];
        const batchNumber = i + 1;
        
        try {
          const requests = createBatchRequests(batchMovies);
          const batch = await submitBatchWithRetry(requests, batchNumber);
          
          tracker.addSubmittedBatch({
            id: batch.id,
            number: batchNumber,
            movies: batchMovies,
            submittedAt: new Date().toISOString(),
            completed: false
          });
          
          // Small delay between submissions
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`Failed to submit batch ${batchNumber}:`, error.message);
          // Continue with other batches
        }
      }
    }
    
    // Phase 2: Wait for completion and process results
    console.log('\n=== PHASE 2: WAITING FOR COMPLETION ===\n');
    
    const submittedBatches = tracker.submittedBatches.filter(b => !b.completed);
    
    for (const batchInfo of submittedBatches) {
      try {
        console.log(`\nWaiting for batch ${batchInfo.number}...`);
        const completedBatch = await waitForBatchCompletion(batchInfo.id, batchInfo.number);
        const results = await processCompletedBatch(completedBatch, batchInfo.movies, batchInfo.number);
        tracker.markBatchComplete(batchInfo.id, results);
        
      } catch (error) {
        console.error(`Failed to process batch ${batchInfo.number}:`, error.message);
      }
    }
    
    // Final summary
    console.log('\n🎉 BATCH PROCESSING COMPLETE!');
    console.log(`📊 Final Results: ${tracker.successfulMovies}/${tracker.totalMovies} successful (${((tracker.successfulMovies/tracker.totalMovies)*100).toFixed(1)}%)`);
    console.log(`💰 Total Cost: ${tracker.totalCost.toFixed(2)}`);
    console.log(`⚡ Average: ${(tracker.totalCost/Math.max(tracker.successfulMovies, 1)).toFixed(4)} per movie`);
    
    tracker.cleanup();
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export for testing
export { 
  sanitizeMovieTitle,
  createBatchRequests,
  processIndividualResult,
  BatchProgressTracker
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}