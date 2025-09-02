#!/usr/bin/env node

/**
 * Reliable Enhanced Analysis Batch Generator
 * 
 * Fixed version with accurate metrics tracking, proper database schema handling,
 * and strict limit enforcement.
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { buildEnhancedAnalysisPrompt } from '../lib/prompts/enhanced-analysis-generator.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configuration
const CONFIG = {
  batchSize: 25,
  maxConcurrentBatches: 2,
  pollInterval: 60000,
  maxWaitHours: 6,
  progressFile: './enhanced-analysis-progress.json'
};

/**
 * Comprehensive metrics tracker with validation
 */
class MetricsTracker {
  constructor(totalMovies) {
    this.totalMovies = totalMovies;
    this.submittedBatches = [];
    this.processedMovies = new Set(); // Track unique processed movies
    this.successfulMovies = new Set();
    this.failedMovies = new Map(); // Map of tmdbId -> error
    this.totalCost = 0;
    this.startTime = Date.now();
  }

  addBatch(batchInfo) {
    this.submittedBatches.push(batchInfo);
    this.saveProgress();
  }

  recordResult(tmdbId, success, error = null, cost = 0) {
    this.processedMovies.add(tmdbId);
    
    if (success) {
      this.successfulMovies.add(tmdbId);
      this.failedMovies.delete(tmdbId); // Remove from failed if previously failed
    } else {
      this.failedMovies.set(tmdbId, error);
      this.successfulMovies.delete(tmdbId); // Remove from successful if previously successful
    }
    
    this.totalCost += cost;
  }

  getMetrics() {
    const processed = this.processedMovies.size;
    const successful = this.successfulMovies.size;
    const failed = this.failedMovies.size;
    
    // Validation: processed should equal successful + failed
    if (processed !== successful + failed) {
      console.warn(`Metrics validation failed: processed(${processed}) != successful(${successful}) + failed(${failed})`);
    }
    
    return {
      totalRequested: this.totalMovies,
      submitted: this.submittedBatches.reduce((sum, batch) => sum + batch.movies.length, 0),
      processed,
      successful,
      failed,
      totalCost: this.totalCost,
      avgCost: successful > 0 ? this.totalCost / successful : 0,
      successRate: processed > 0 ? (successful / processed * 100) : 0
    };
  }

  logProgress() {
    const metrics = this.getMetrics();
    const timeElapsed = (Date.now() - this.startTime) / 1000 / 60;
    
    console.log('\n--- PROGRESS UPDATE ---');
    console.log(`Processed: ${metrics.processed}/${metrics.totalRequested}`);
    console.log(`Success: ${metrics.successful}, Failed: ${metrics.failed}`);
    console.log(`Success Rate: ${metrics.successRate.toFixed(1)}%`);
    console.log(`Cost: $${metrics.totalCost.toFixed(3)} total, $${metrics.avgCost.toFixed(4)} avg`);
    console.log(`Time: ${timeElapsed.toFixed(1)}m elapsed`);
    console.log('----------------------\n');
  }

  saveProgress() {
    const data = {
      totalMovies: this.totalMovies,
      submittedBatches: this.submittedBatches,
      processedMovies: Array.from(this.processedMovies),
      successfulMovies: Array.from(this.successfulMovies),
      failedMovies: Object.fromEntries(this.failedMovies),
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
        this.submittedBatches = data.submittedBatches || [];
        this.processedMovies = new Set(data.processedMovies || []);
        this.successfulMovies = new Set(data.successfulMovies || []);
        this.failedMovies = new Map(Object.entries(data.failedMovies || {}));
        this.totalCost = data.totalCost || 0;
        this.startTime = data.startTime || Date.now();
        
        console.log(`Loaded progress: ${this.processedMovies.size} processed, ${this.successfulMovies.size} successful`);
        return true;
      } catch (error) {
        console.warn('Could not load progress:', error.message);
        return false;
      }
    }
    return false;
  }

  getPendingBatches() {
    return this.submittedBatches.filter(batch => !batch.completed);
  }
}

/**
 * Check and fix database schema
 */
async function ensureProperSchema() {
  const client = await pool.connect();
  
  try {
    // Check current table structure
    const schemaResult = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'movie_analyses' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current movie_analyses schema:');
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check existing constraints
    const constraintResult = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'movie_analyses'::regclass
    `);
    
    console.log('\nExisting constraints:');
    constraintResult.rows.forEach(row => {
      console.log(`  ${row.conname} (${row.contype}): ${row.definition}`);
    });
    
    await client.query('BEGIN');
    
    // Add enhanced columns if they don't exist
    const enhancedColumns = ['enhanced_sections', 'enhanced_key_elements', 'enhanced_format', 'enhanced_processed_at'];
    
    for (const column of enhancedColumns) {
      const columnExists = schemaResult.rows.some(row => row.column_name === column);
      
      if (!columnExists) {
        let columnDef;
        switch (column) {
          case 'enhanced_sections':
          case 'enhanced_key_elements':
            columnDef = 'JSONB';
            break;
          case 'enhanced_format':
            columnDef = 'BOOLEAN DEFAULT FALSE';
            break;
          case 'enhanced_processed_at':
            columnDef = 'TIMESTAMP';
            break;
        }
        
        await client.query(`ALTER TABLE movie_analyses ADD COLUMN ${column} ${columnDef}`);
        console.log(`Added column: ${column}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Schema validation complete');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Schema validation failed: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Get movies needing enhanced analysis with strict limit enforcement
 */
async function getMoviesNeedingAnalysis(requestedLimit) {
  console.log(`Querying for movies needing enhanced analysis (limit: ${requestedLimit || 'none'})`);
  
  const query = `
    SELECT DISTINCT m.tmdb_id, m.title, m.year, m.id as movie_db_id
    FROM movies m
    INNER JOIN movie_analyses ma ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND (ma.enhanced_format IS NOT TRUE OR ma.enhanced_format IS NULL)
    ORDER BY m.tmdb_id
    ${requestedLimit ? 'LIMIT $1' : ''}
  `;

  const params = requestedLimit ? [requestedLimit] : [];
  const result = await pool.query(query, params);
  
  console.log(`Found ${result.rows.length} movies needing enhanced analysis`);
  
  // Validate we didn't exceed the limit
  if (requestedLimit && result.rows.length > requestedLimit) {
    throw new Error(`Query returned ${result.rows.length} movies but limit was ${requestedLimit}`);
  }
  
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
        max_tokens: 2500,
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
 * Submit batch with validation
 */
async function submitBatch(movies, batchNumber, metrics) {
  if (movies.length === 0) {
    throw new Error(`Batch ${batchNumber} has no movies`);
  }
  
  console.log(`Submitting batch ${batchNumber} with ${movies.length} movies`);
  
  const requests = createBatchRequests(movies);
  
  const batch = await anthropic.beta.messages.batches.create({
    requests: requests
  });
  
  console.log(`Batch ${batchNumber} submitted: ${batch.id}`);
  console.log(`Request counts: ${JSON.stringify(batch.request_counts)}`);
  
  // Validate batch was created properly
  const expectedCount = movies.length;
  const actualCount = (batch.request_counts?.processing || 0) + (batch.request_counts?.pending || 0);
  
  if (actualCount !== expectedCount) {
    console.warn(`Batch ${batchNumber}: Expected ${expectedCount} requests, got ${actualCount} processing/pending`);
  }
  
  const batchInfo = {
    id: batch.id,
    number: batchNumber,
    movies: movies,
    submittedAt: new Date().toISOString(),
    completed: false
  };
  
  metrics.addBatch(batchInfo);
  
  return batch;
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
      console.log(`Results: ${batch.request_counts?.succeeded || 0} success, ${batch.request_counts?.errored || 0} failed`);
      return batch;
    }
    
    if (batch.processing_status === 'failed') {
      throw new Error(`Batch ${batchNumber} failed processing`);
    }
  }
  
  throw new Error(`Batch ${batchNumber} timed out after ${CONFIG.maxWaitHours} hours`);
}

/**
 * Process individual result with proper database handling
 */
async function processResult(result, movies, metrics) {
  const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
  const movie = movies.find(m => m.tmdb_id === tmdbId);
  
  if (result.result.type !== 'succeeded') {
    const error = result.result.error?.message || 'API request failed';
    metrics.recordResult(tmdbId, false, error);
    return { tmdbId, success: false, error };
  }

  try {
    const content = result.result.message.content[0].text;
    const response = JSON.parse(content);
    
    if (!response.sections || !Array.isArray(response.sections) || response.sections.length !== 4) {
      throw new Error('Invalid response structure - expected 4 sections');
    }
    
    // Use the correct database constraint - update by movie_db_id from our query
    const updateResult = await pool.query(`
      UPDATE movie_analyses 
      SET enhanced_sections = $1,
          enhanced_key_elements = $2,
          enhanced_format = TRUE,
          enhanced_processed_at = NOW()
      WHERE movie_id = $3
      AND analysis_type = 'general'
    `, [
      JSON.stringify(response.sections),
      JSON.stringify(response.keyElements || {}),
      movie.movie_db_id
    ]);
    
    if (updateResult.rowCount === 0) {
      throw new Error(`No analysis record updated for movie ${tmdbId} (movie_db_id: ${movie.movie_db_id})`);
    }
    
    const totalWords = response.sections.reduce((sum, section) => 
      sum + (section.text ? section.text.split(' ').length : 0), 0
    );
    
    // Calculate cost from actual usage data in result (Batch API rates - 50% discount)
    const usage = result.result.message.usage || { input_tokens: 0, output_tokens: 0 };
    const cost = (usage.input_tokens * 0.0015 + usage.output_tokens * 0.0075) / 1000;
    
    metrics.recordResult(tmdbId, true, null, cost);
    
    return {
      tmdbId,
      success: true,
      title: movie.title,
      sections: response.sections.length,
      totalWords
    };
    
  } catch (error) {
    console.error(`Error processing movie ${tmdbId}:`, error.message);
    metrics.recordResult(tmdbId, false, error.message);
    return { tmdbId, success: false, error: error.message };
  }
}

/**
 * Process all results from completed batch
 */
async function processResults(batch, movies, batchNumber, metrics) {
  console.log(`Processing results for batch ${batchNumber}...`);
  
  const resultsStream = await anthropic.beta.messages.batches.results(batch.id);
  let processedCount = 0;
  let batchSuccessful = 0;
  let batchFailed = 0;
  
  for await (const result of resultsStream) {
    const processed = await processResult(result, movies, metrics);
    
    if (processed.success) {
      batchSuccessful++;
      console.log(`  SUCCESS: ${processed.title} (${processed.sections} sections, ${processed.totalWords} words)`);
    } else {
      batchFailed++;
      console.log(`  FAILED: TMDB ${processed.tmdbId} - ${processed.error}`);
    }
    
    processedCount++;
    if (processedCount % 10 === 0) {
      console.log(`  Processed ${processedCount}/${movies.length} results...`);
    }
  }
  
  // Cost is calculated per result in processResult function
  // Batch object doesn't contain usage data - it's in individual results
  const batchCost = 0; // Will be accumulated from individual results
  
  console.log(`Batch ${batchNumber}: ${batchSuccessful} successful, ${batchFailed} failed`);
  console.log(`Cost: $${batchCost.toFixed(4)} total`);
  
  // Mark batch as completed
  const batchInfo = metrics.submittedBatches.find(b => b.id === batch.id);
  if (batchInfo) {
    batchInfo.completed = true;
    batchInfo.completedAt = new Date().toISOString();
  }
  
  return { successful: batchSuccessful, failed: batchFailed, cost: batchCost };
}

/**
 * Main function with strict validation
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit=') || arg.startsWith('--count='));
    const requestedLimit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
    const dryRun = args.includes('--dry-run');
    const resume = args.includes('--resume');

    console.log('Reliable Enhanced Analysis Batch Generator');
    console.log('=========================================');
    console.log(`Requested limit: ${requestedLimit || 'No limit'}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : resume ? 'RESUME' : 'PRODUCTION'}`);
    console.log();

    // Validate and fix schema
    await ensureProperSchema();
    
    let metrics;

    if (resume) {
      metrics = new MetricsTracker(0);
      if (!metrics.loadProgress()) {
        console.log('No progress file found for resume');
        return;
      }
      
      const pendingBatches = metrics.getPendingBatches();
      if (pendingBatches.length === 0) {
        console.log('No pending batches to resume');
        return;
      }
      
      console.log(`Resuming ${pendingBatches.length} pending batches...`);
      
      for (const batchInfo of pendingBatches) {
        try {
          const completedBatch = await waitForCompletion(batchInfo.id, batchInfo.number);
          await processResults(completedBatch, batchInfo.movies, batchInfo.number, metrics);
        } catch (error) {
          console.error(`Error resuming batch ${batchInfo.number}:`, error.message);
        }
      }
      
    } else {
      // Get movies with strict limit enforcement
      const movies = await getMoviesNeedingAnalysis(requestedLimit);
      
      if (movies.length === 0) {
        console.log('No movies need enhanced analysis');
        return;
      }
      
      // Validate we're not exceeding the requested limit
      if (requestedLimit && movies.length > requestedLimit) {
        throw new Error(`Found ${movies.length} movies but limit was ${requestedLimit}`);
      }
      
      metrics = new MetricsTracker(movies.length);
      
      const batchCount = Math.ceil(movies.length / CONFIG.batchSize);
      console.log(`Processing exactly ${movies.length} movies in ${batchCount} batches`);
      
      if (dryRun) {
        console.log('DRY RUN - No actual processing');
        return;
      }
      
      // Submit batches
      console.log('\n=== SUBMITTING BATCHES ===');
      for (let i = 0; i < movies.length; i += CONFIG.batchSize) {
        const batchMovies = movies.slice(i, i + CONFIG.batchSize);
        const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
        
        try {
          await submitBatch(batchMovies, batchNumber, metrics);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to submit batch ${batchNumber}:`, error.message);
        }
      }
      
      // Process all batches
      console.log('\n=== WAITING FOR COMPLETION ===');
      const submittedBatches = metrics.submittedBatches.filter(b => !b.completed);
      
      for (const batchInfo of submittedBatches) {
        try {
          const completedBatch = await waitForCompletion(batchInfo.id, batchInfo.number);
          await processResults(completedBatch, batchInfo.movies, batchInfo.number, metrics);
          metrics.logProgress();
        } catch (error) {
          console.error(`Error processing batch ${batchInfo.number}:`, error.message);
        }
      }
    }
    
    // Final validated summary
    const finalMetrics = metrics.getMetrics();
    
    console.log('\n=== FINAL VALIDATED METRICS ===');
    console.log(`Movies requested: ${requestedLimit || 'unlimited'}`);
    console.log(`Movies found needing analysis: ${finalMetrics.totalRequested}`);
    console.log(`Movies submitted in batches: ${finalMetrics.submitted}`);
    console.log(`Movies actually processed: ${finalMetrics.processed}`);
    console.log(`Successful analyses: ${finalMetrics.successful}`);
    console.log(`Failed analyses: ${finalMetrics.failed}`);
    console.log(`Success rate: ${finalMetrics.successRate.toFixed(1)}%`);
    console.log(`Total cost: $${finalMetrics.totalCost.toFixed(2)}`);
    console.log(`Average cost per success: $${finalMetrics.avgCost.toFixed(4)}`);
    
    // Validation checks
    if (finalMetrics.processed !== finalMetrics.successful + finalMetrics.failed) {
      console.error('\nERROR: Metrics validation failed - counts do not add up!');
    } else {
      console.log('\nMetrics validation: PASSED');
    }
    
    // Save final progress
    metrics.saveProgress();
    
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