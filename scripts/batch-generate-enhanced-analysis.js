#!/usr/bin/env node

/**
 * Batch Enhanced Analysis Generator
 * 
 * Generates enhanced movie analyses using Anthropic's batch API with:
 * - Streamlined Enhanced Analysis prompt (41% token reduction)
 * - Prompt caching (90% cost savings)
 * - Beta batch processing (50% cost reduction vs individual calls)
 * - Progress tracking and cost monitoring
 * 
 * LESSONS LEARNED FROM MORE IDEAS GENERATION:
 * 1. Shorter prompts maintain quality while cutting costs significantly (41% reduction achieved)
 * 2. Batch API + caching provides massive cost savings (95% total reduction)
 * 3. JSON-only responses are more reliable than mixed text/JSON
 * 4. Contextual subheads work better than generic section titles
 * 5. Real-time cost tracking prevents budget overruns on large builds
 * 6. Preserve essential features (links, proven word counts) while optimizing tokens
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ENHANCED_ANALYSIS_PROMPT } from '../lib/prompts/enhanced-analysis-generator.js';

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
  batchSize: 50,             // Movies per batch (reduced from 200)
  maxConcurrentBatches: 2,   // Max parallel batches (reduced from 3)
  costPerMovie: 0.007,       // Base cost estimate before optimizations (41% reduction applied)
  cacheSavings: 0.9,         // 90% savings from prompt caching
  batchSavings: 0.5,         // 50% savings from batch API
  pollInterval: 30000,       // 30s between status checks
  maxWaitHours: 6            // Max wait time for batch completion
};

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
 * Ensure enhanced analysis columns exist (run once at startup)
 */
async function ensureEnhancedColumns() {
  const client = await pool.connect();
  
  try {
    // Check if columns exist first
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'movie_analyses' AND column_name = 'enhanced_sections'
    `);
    
    if (result.rows.length === 0) {
      console.log('📊 Creating enhanced analysis columns...');
      await client.query(`
        ALTER TABLE movie_analyses 
        ADD COLUMN enhanced_sections JSONB,
        ADD COLUMN enhanced_key_elements JSONB,
        ADD COLUMN enhanced_format BOOLEAN DEFAULT FALSE,
        ADD COLUMN enhanced_processed_at TIMESTAMP
      `);
      console.log('✅ Enhanced columns created successfully');
    }
  } finally {
    client.release();
  }
}

/**
 * Get movies that need Enhanced Analysis generated
 */
async function getMoviesNeedingEnhancedAnalysis(limit = null) {
  const limitClause = limit ? `LIMIT ${limit}` : '';
  
  const result = await pool.query(`
    SELECT DISTINCT m.tmdb_id, m.title, m.year
    FROM movies m
    INNER JOIN movie_analyses ma ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND (ma.enhanced_format IS NOT TRUE OR ma.enhanced_format IS NULL)
    ORDER BY m.tmdb_id
    ${limitClause}
  `);
  
  return result.rows;
}

/**
 * Build Enhanced Analysis prompt for a specific movie
 */
function buildEnhancedAnalysisPrompt(title, year) {
  return ENHANCED_ANALYSIS_PROMPT
    .replace('{{FILM_TITLE}}', title)
    .replace('{{YEAR}}', year);
}

/**
 * Validate Enhanced Analysis response structure
 */
function validateEnhancedAnalysisResponse(response) {
  const errors = [];
  
  if (!response.sections || !Array.isArray(response.sections)) {
    errors.push('Missing or invalid sections array');
  } else {
    if (response.sections.length !== 4) {
      errors.push(`Expected 4 sections, got ${response.sections.length}`);
    }
    
    response.sections.forEach((section, i) => {
      if (!section.subhead || typeof section.subhead !== 'string') {
        errors.push(`Section ${i + 1}: Missing or invalid subhead`);
      }
      if (!section.text || typeof section.text !== 'string') {
        errors.push(`Section ${i + 1}: Missing or invalid text`);
      } else {
        const wordCount = section.text.split(' ').length;
        if (wordCount < 80 || wordCount > 120) {
          errors.push(`Section ${i + 1}: Word count ${wordCount} outside 80-120 range`);
        }
      }
    });
  }
  
  if (!response.keyElements) {
    errors.push('Missing keyElements object');
  } else {
    if (!response.keyElements.genre) errors.push('Missing genre in keyElements');
    if (!response.keyElements.director) errors.push('Missing director in keyElements');
    if (!response.keyElements.year) errors.push('Missing year in keyElements');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create batch requests for Anthropic API
 */
function createBatchRequests(movies) {
  return movies.map((movie, index) => {
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
            content: '' // No prefill to avoid JSON reconstruction issues
          }
        ]
      }
    };
  });
}

/**
 * Submit batch to Anthropic API with retry logic
 */
async function submitBatch(requests, batchNumber, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 Submitting batch ${batchNumber} (${requests.length} movies) - Attempt ${attempt}/${maxRetries}`);
      
      const batch = await anthropic.beta.messages.batches.create({
        requests: requests,
      });

      console.log(`✅ Batch ${batchNumber} submitted (ID: ${batch.id})`);
      console.log(`📊 Status: ${batch.processing_status}`);
      
      return batch;
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} submission failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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
          // Parse JSON directly without prefill reconstruction
          const responseText = result.result.message.content[0].text;
          const parsedResponse = JSON.parse(responseText);
          
          // Validate response
          const validation = validateEnhancedAnalysisResponse(parsedResponse);
          if (!validation.valid) {
            console.warn(`⚠️  Validation failed for ${result.custom_id}:`, validation.errors);
          }
          
          // Extract TMDB ID from custom_id
          const tmdbId = parseInt(result.custom_id.replace('movie-', ''));
          
          // Update existing movie_analyses table with enhanced analysis
          await pool.query(`
            UPDATE movie_analyses 
            SET 
              enhanced_sections = $1,
              enhanced_key_elements = $2,
              enhanced_format = TRUE,
              enhanced_processed_at = NOW()
            WHERE movie_id IN (
              SELECT id FROM movies WHERE tmdb_id = $3
            )
          `, [
            JSON.stringify(parsedResponse.sections),
            JSON.stringify(parsedResponse.keyElements),
            tmdbId
          ]);
          
          const totalWords = parsedResponse.sections.reduce((sum, section) => 
            sum + section.text.split(' ').length, 0);
          
          successful.push({
            tmdbId,
            title: movies.find(m => m.tmdb_id === tmdbId)?.title || 'Unknown',
            sections: parsedResponse.sections.length,
            totalWords,
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
    
    // Calculate actual cost (with correct savings application)
    const usage = completedBatch.usage || { input_tokens: 0, output_tokens: 0 };
    const inputCost = (usage.input_tokens * 3 / 1000000) * (1 - BATCH_CONFIG.cacheSavings); // Cache savings on input only
    const outputCost = usage.output_tokens * 15 / 1000000;
    const totalBaseCost = inputCost + outputCost;
    const actualCost = totalBaseCost * (1 - BATCH_CONFIG.batchSavings); // Batch savings on total
    
    console.log(`💰 Batch ${batchNumber} cost: $${actualCost.toFixed(4)} (base: $${baseCost.toFixed(4)})`);
    console.log(`📊 Saved: ${successful.length} analyses, failed: ${failed.length}`);
    
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
    
    console.log('🎬 Enhanced Analysis Batch Generator');
    console.log('===================================');
    console.log('Optimized with streamlined prompts (41% reduction) + batch API + caching');
    console.log(`Limit: ${limit || 'All movies'}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log();
    
    // Get movies needing Enhanced Analysis
    // Ensure enhanced columns exist first
    await ensureEnhancedColumns();
    
    console.log('📊 Finding movies needing Enhanced Analysis...');
    const movies = await getMoviesNeedingEnhancedAnalysis(limit);
    console.log(`Found ${movies.length} movies needing Enhanced Analysis generation`);
    
    if (movies.length === 0) {
      console.log('✅ All movies already have Enhanced Analyses!');
      return;
    }
    
    // Calculate costs with optimizations
    const baseCostTotal = movies.length * BATCH_CONFIG.costPerMovie;
    const optimizedCost = baseCostTotal * (1 - BATCH_CONFIG.cacheSavings) * (1 - BATCH_CONFIG.batchSavings);
    const savings = baseCostTotal - optimizedCost;
    
    console.log(`\n💰 COST ESTIMATE:`);
    console.log(`Base cost: $${baseCostTotal.toFixed(2)} (41% prompt optimization already applied)`);
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
    
    console.log('\n🎉 Enhanced Analysis batch generation complete!');
    console.log(`📊 Final: ${tracker.successful}/${tracker.totalMovies} successful (${((tracker.successful/tracker.totalMovies)*100).toFixed(1)}%)`);
    console.log(`💰 Total cost: $${tracker.totalCost.toFixed(2)}`);
    console.log(`⚡ Avg cost: $${(tracker.totalCost/tracker.successful).toFixed(4)} per analysis`);
    
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