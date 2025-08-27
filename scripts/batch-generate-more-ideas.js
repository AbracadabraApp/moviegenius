#!/usr/bin/env node

/**
 * Batch More Ideas Generator
 * 
 * Generates movie recommendations using Anthropic's batch API with:
 * - Streamlined prompt (40% token reduction)
 * - Prompt caching (90% cost savings)
 * - Beta batch processing (50% cost reduction vs individual calls)
 * - Progress tracking and cost monitoring
 * 
 * LESSONS LEARNED FROM MOVIE PAGE GENERATION:
 * 1. Shorter prompts maintain quality while cutting costs significantly
 * 2. Batch API + caching provides massive cost savings (95% total reduction)
 * 3. JSON-only responses are more reliable than mixed text/JSON
 * 4. Clear tier structure (1-5, 6-10, 11-15) works better than vague guidelines
 * 5. Real-time cost tracking prevents budget overruns on large builds
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
 * Configuration for batch processing
 */
const BATCH_CONFIG = {
  batchSize: 50,             // Movies per batch (will be reduced to 10 in debug mode)
  maxConcurrentBatches: 3,   // Max parallel batches
  costPerMovie: 0.002,       // Base cost estimate before savings
  cacheSavings: 0.9,         // 90% savings from prompt caching
  batchSavings: 0.5,         // 50% savings from batch API
  pollInterval: 300000,      // 5 minutes between status checks
  maxWaitHours: 6            // Max wait time for batch completion
};

/**
 * Debug function to find problematic characters in movie titles
 */
function findProblematicCharacters(movieList) {
  const problematic = [];
  movieList.forEach((movie, index) => {
    try {
      JSON.stringify({ title: movie.title });
    } catch (error) {
      console.log(`🚨 Problematic movie at index ${index}:`, movie.title);
      console.log('Error:', error.message);
      problematic.push({ index, title: movie.title, error: error.message });
    }
  });
  return problematic;
}

/**
 * Sanitize movie title to prevent JSON serialization errors
 */
function sanitizeMovieTitle(title) {
  if (!title) return '';
  
  return title
    .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes  
    .replace(/[\u2013\u2014]/g, '-')  // Em/en dashes
    .replace(/\u2026/g, '...')        // Ellipsis
    .replace(/[\u00BD\u00BC\u00BE]/g, '') // Fractions
    .replace(/[^\x00-\x7F]/g, '')     // Remove all non-ASCII
    .trim();
}

/**
 * Build tracker for cost and progress monitoring
 */
class BatchTracker {
  constructor(totalMovies) {
    this.totalMovies = totalMovies;
    this.processedMovies = 0;
    this.successful = 0;
    this.failed = 0;
    this.totalCost = 0;
    this.startTime = Date.now();
  }

  logBatchComplete(batchResults, actualCost) {
    const successful = batchResults.filter(r => r.success).length;
    const failed = batchResults.length - successful;
    
    this.processedMovies += batchResults.length;
    this.successful += successful;
    this.failed += failed;
    this.totalCost += actualCost;

    const percentComplete = (this.processedMovies / this.totalMovies * 100).toFixed(1);
    const avgCostPerMovie = this.totalCost / this.processedMovies;
    const projectedTotal = avgCostPerMovie * this.totalMovies;
    const timeElapsed = (Date.now() - this.startTime) / 1000 / 60;
    const eta = timeElapsed / this.processedMovies * (this.totalMovies - this.processedMovies);

    console.log(`\n📊 BATCH COMPLETE`);
    console.log(`Progress: ${this.processedMovies}/${this.totalMovies} (${percentComplete}%)`);
    console.log(`Results: ${this.successful} successful, ${this.failed} failed`);
    console.log(`Cost: $${this.totalCost.toFixed(3)} spent, ~$${projectedTotal.toFixed(2)} projected`);
    console.log(`ETA: ${eta > 0 ? eta.toFixed(1) + ' minutes' : 'Complete!'}`);
    console.log(`Avg: $${avgCostPerMovie.toFixed(4)} per movie\n`);
  }
}

/**
 * Get movies that need More Ideas generated
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
  
  return result.rows;
}

/**
 * Create batch requests for Anthropic API
 */
function createBatchRequests(movies) {
  return movies.map((movie, index) => {
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
                cache_control: { type: 'ephemeral' } // 90% cost savings
              }
            ]
          },
          {
            role: 'assistant',
            content: '' // No prefill - let Claude generate complete JSON
          }
        ]
      }
    };
  });
}

/**
 * Submit batch to Anthropic API
 */
async function submitBatch(requests, batchNumber) {
  console.log(`🚀 Submitting batch ${batchNumber} (${requests.length} movies)...`);
  
  try {
    const batch = await anthropic.beta.messages.batches.create({
      requests: requests,
    });

    console.log(`✅ Batch ${batchNumber} submitted (ID: ${batch.id})`);
    console.log(`📊 Status: ${batch.processing_status}`);
    
    return batch;
  } catch (error) {
    console.error(`❌ Batch ${batchNumber} submission failed:`, error.message);
    throw error;
  }
}

/**
 * Poll batch status until complete
 */
async function waitForBatchCompletion(batchId, batchNumber) {
  console.log(`⏳ Waiting for batch ${batchNumber} completion...`);
  
  const startTime = Date.now();
  const maxWaitTime = BATCH_CONFIG.maxWaitHours * 60 * 60 * 1000;
  let pollCount = 0;
  
  while (Date.now() - startTime < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.pollInterval));
    
    try {
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      pollCount++;
      
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
      console.log(`🔍 Poll ${pollCount} (${elapsed}m): ${batch.processing_status}`);
      
      if (batch.processing_status === 'ended') {
        console.log(`✅ Batch ${batchNumber} completed in ${elapsed} minutes`);
        console.log(`📊 Results: ${batch.request_counts.succeeded} succeeded, ${batch.request_counts.errored} failed`);
        return batch;
      }
      
      if (batch.processing_status === 'failed') {
        throw new Error(`Batch ${batchNumber} failed processing`);
      }
      
    } catch (error) {
      console.error(`❌ Error polling batch ${batchNumber}:`, error.message);
      throw error;
    }
  }
  
  throw new Error(`Batch ${batchNumber} timed out after ${BATCH_CONFIG.maxWaitHours} hours`);
}

/**
 * Process batch results and save to database
 */
async function processBatchResults(completedBatch, movies, batchNumber) {
  console.log(`📥 Processing batch ${batchNumber} results...`);
  
  try {
    // Get results using async iterator
    const resultsStream = await anthropic.beta.messages.batches.results(completedBatch.id);
    
    const results = [];
    const successful = [];
    const failed = [];
    
    // Process each result
    for await (const result of resultsStream) {
      results.push(result);
      
      if (result.result.type === 'succeeded') {
        try {
          // Reconstruct full JSON from prefill + response
          const prefill = '{\n  "moreIdeas": [\n    {';
          const fullResponse = prefill + result.result.message.content[0].text;
          const parsedResponse = JSON.parse(fullResponse);
          
          // Validate response
          const validation = validateMoreIdeasResponse(parsedResponse);
          if (!validation.valid) {
            console.warn(`⚠️  Validation failed for ${result.custom_id}:`, validation.errors);
          }
          
          // Extract TMDB ID from custom_id
          const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
          
          // Save to database (no conflict resolution since analysis_id is unique, not tmdb_id)
          await pool.query(`
            INSERT INTO more_ideas (tmdb_id, ideas, metadata, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [
            tmdbId,
            JSON.stringify(parsedResponse.moreIdeas),
            JSON.stringify(parsedResponse.metadata || {})
          ]);
          
          successful.push({
            tmdbId,
            title: movies.find(m => m.tmdb_id === tmdbId)?.title || 'Unknown',
            recommendations: parsedResponse.moreIdeas.length,
            success: true
          });
          
        } catch (parseError) {
          console.error(`❌ Parse error for ${result.custom_id}:`, parseError.message);
          failed.push({
            customId: result.custom_id,
            error: parseError.message,
            success: false
          });
        }
      } else {
        failed.push({
          customId: result.custom_id,
          error: result.result.error?.message || 'Unknown error',
          success: false
        });
      }
    }
    
    // Calculate actual cost (with savings applied correctly)
    const usage = completedBatch.usage || { input_tokens: 0, output_tokens: 0 };
    const inputCost = usage.input_tokens * 3 / 1000000;
    const outputCost = usage.output_tokens * 15 / 1000000;
    
    // Apply caching savings to input tokens only
    const cachedInputCost = inputCost * (1 - BATCH_CONFIG.cacheSavings);
    const totalCostBeforeBatch = cachedInputCost + outputCost;
    
    // Apply batch savings to total cost
    const actualCost = totalCostBeforeBatch * (1 - BATCH_CONFIG.batchSavings);
    
    const baseCost = inputCost + outputCost;
    console.log(`💰 Batch ${batchNumber} cost: $${actualCost.toFixed(4)} (base: $${baseCost.toFixed(4)})`);
    console.log(`📊 Saved: ${successful.length} movies, failed: ${failed.length}`);
    
    return { successful, failed, cost: actualCost };
    
  } catch (error) {
    console.error(`❌ Error processing batch ${batchNumber} results:`, error.message);
    throw error;
  }
}

/**
 * Main batch processing function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
    const dryRun = args.includes('--dry-run');
    const debugMode = args.includes('--debug');
    
    // Adjust batch size for debugging
    if (debugMode) {
      BATCH_CONFIG.batchSize = 10;
      BATCH_CONFIG.maxConcurrentBatches = 1;
    }
    
    console.log('🎬 More Ideas Batch Generator');
    console.log('============================');
    console.log('Optimized with streamlined prompts + batch API + caching');
    console.log(`Limit: ${limit || 'All movies'}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log(`Debug mode: ${debugMode ? 'ENABLED (10 movies per batch)' : 'DISABLED'}`);
    console.log();
    
    // Get movies needing More Ideas
    console.log('📊 Finding movies needing More Ideas...');
    const rawMovies = await getMoviesNeedingMoreIdeas(limit);
    console.log(`Found ${rawMovies.length} movies needing More Ideas generation`);
    
    if (rawMovies.length === 0) {
      console.log('✅ All movies already have More Ideas!');
      return;
    }
    
    // Debug: Check for problematic characters
    console.log('🔍 Checking for problematic characters in movie titles...');
    const problematic = findProblematicCharacters(rawMovies);
    if (problematic.length > 0) {
      console.log(`⚠️  Found ${problematic.length} movies with problematic characters`);
      if (debugMode) {
        problematic.forEach(p => {
          console.log(`  ${p.index}: "${p.title}" - ${p.error}`);
        });
      }
    } else {
      console.log('✅ No problematic characters found in movie titles');
    }
    
    // Sanitize all movie titles
    console.log('🧹 Sanitizing movie titles...');
    const movies = rawMovies.map(movie => ({
      ...movie,
      title: sanitizeMovieTitle(movie.title),
      originalTitle: movie.title // Keep original for reference
    }));
    
    // Log sanitization results
    const sanitizedCount = movies.filter(m => m.title !== m.originalTitle).length;
    if (sanitizedCount > 0) {
      console.log(`🔧 Sanitized ${sanitizedCount} movie titles`);
      if (debugMode) {
        movies.filter(m => m.title !== m.originalTitle).slice(0, 5).forEach(m => {
          console.log(`  "${m.originalTitle}" → "${m.title}"`);
        });
      }
    } else {
      console.log('✅ No titles needed sanitization');
    }
    
    // Calculate costs with optimizations (applied correctly)
    const baseCostTotal = movies.length * BATCH_CONFIG.costPerMovie;
    
    // Assume typical prompt uses ~1000 input tokens, generates ~500 output tokens
    const estimatedInputCost = baseCostTotal * 0.8; // ~80% of cost is input tokens
    const estimatedOutputCost = baseCostTotal * 0.2; // ~20% of cost is output tokens
    
    // Apply savings correctly
    const cachedInputCost = estimatedInputCost * (1 - BATCH_CONFIG.cacheSavings);
    const totalBeforeBatch = cachedInputCost + estimatedOutputCost;
    const optimizedCost = totalBeforeBatch * (1 - BATCH_CONFIG.batchSavings);
    const savings = baseCostTotal - optimizedCost;
    
    console.log(`\n💰 COST ESTIMATE:`);
    console.log(`Base cost: $${baseCostTotal.toFixed(2)}`);
    console.log(`Optimized: $${optimizedCost.toFixed(2)}`);
    console.log(`Savings: $${savings.toFixed(2)} (${((savings/baseCostTotal)*100).toFixed(1)}%)`);
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - No batches submitted');
      return;
    }
    
    // Initialize progress tracker
    const tracker = new BatchTracker(movies.length);
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < movies.length; i += BATCH_CONFIG.batchSize) {
      const batchMovies = movies.slice(i, i + BATCH_CONFIG.batchSize);
      batches.push(batchMovies);
    }
    
    console.log(`\n🚀 Processing ${movies.length} movies in ${batches.length} batches`);
    console.log(`Batch size: ${BATCH_CONFIG.batchSize}, Max concurrent: ${BATCH_CONFIG.maxConcurrentBatches}\n`);
    
    // Process batches with concurrency control
    for (let i = 0; i < batches.length; i += BATCH_CONFIG.maxConcurrentBatches) {
      const concurrentBatches = batches.slice(i, i + BATCH_CONFIG.maxConcurrentBatches);
      
      const batchPromises = concurrentBatches.map(async (batchMovies, batchIndex) => {
        const globalBatchNumber = i + batchIndex + 1;
        
        try {
          // Create and submit batch
          const requests = createBatchRequests(batchMovies);
          const batch = await submitBatch(requests, globalBatchNumber);
          
          // Wait for completion
          const completedBatch = await waitForBatchCompletion(batch.id, globalBatchNumber);
          
          // Process results
          const batchResults = await processBatchResults(completedBatch, batchMovies, globalBatchNumber);
          
          // Update tracker
          tracker.logBatchComplete([...batchResults.successful, ...batchResults.failed], batchResults.cost);
          
          return batchResults;
          
        } catch (error) {
          console.error(`❌ Batch ${globalBatchNumber} failed:`, error.message);
          return { successful: [], failed: batchMovies.map(m => ({ tmdbId: m.tmdb_id, error: error.message })), cost: 0 };
        }
      });
      
      // Wait for this set of concurrent batches
      await Promise.all(batchPromises);
    }
    
    console.log('\n🎉 More Ideas batch generation complete!');
    console.log(`📊 Final: ${tracker.successful}/${tracker.totalMovies} successful (${((tracker.successful/tracker.totalMovies)*100).toFixed(1)}%)`);
    console.log(`💰 Total cost: $${tracker.totalCost.toFixed(2)}`);
    console.log(`⚡ Avg cost: $${(tracker.totalCost/tracker.successful).toFixed(4)} per movie`);
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}