/**
 * Nuclear Batch Generator - Smart batching system for mass Claude analysis generation
 * 
 * Features:
 * - Claude Batch API integration (50% cost savings)
 * - Intelligent rate limiting and back-off
 * - Parallel processing with concurrency controls
 * - Progress tracking and resumable builds
 * - Cost optimization and monitoring
 * 
 * @version 1.0.0
 */

// Load environment variables if not already loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  import('dotenv').then(({ config }) => {
    import('path').then(({ resolve, dirname }) => {
      import('url').then(({ fileURLToPath }) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        config({ path: resolve(__dirname, '../.env.local') });
      });
    });
  });
}

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from './prompts/builder.js';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Batch processing configuration
const BATCH_CONFIG = {
  // Claude Batch API limits
  MAX_BATCH_SIZE: 100, // Maximum requests per batch (Claude limit)
  MAX_CONCURRENT_BATCHES: 3, // Maximum parallel batches
  
  // Rate limiting
  REQUESTS_PER_MINUTE: 50, // Conservative rate limit
  BATCH_DELAY_MS: 2000, // Delay between batch submissions
  
  // Back-off configuration
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
  BACKOFF_MULTIPLIER: 2,
  MAX_RETRIES: 5,
  
  // Cost optimization
  BATCH_API_DISCOUNT: 0.5, // 50% savings with batch API
  TARGET_COST_PER_HOUR: 10.00, // Maximum spend per hour
};

class NuclearBatchGenerator {
  constructor() {
    this.activeBatches = new Map();
    this.rateLimiter = new RateLimiter(BATCH_CONFIG.REQUESTS_PER_MINUTE);
    this.costTracker = new CostTracker(BATCH_CONFIG.TARGET_COST_PER_HOUR);
    this.progressTracker = new ProgressTracker();
  }

  /**
   * Generate analysis for a large set of movies using smart batching
   */
  async generateBulkAnalysis(movieIds, options = {}) {
    const {
      maxConcurrency = BATCH_CONFIG.MAX_CONCURRENT_BATCHES,
      batchSize = BATCH_CONFIG.MAX_BATCH_SIZE,
      resumeFromFailures = true
    } = options;

    console.log(`🚀 NUCLEAR BATCH: Starting bulk analysis for ${movieIds.length} movies`);
    console.log(`📊 Batch size: ${batchSize}, Max concurrency: ${maxConcurrency}`);

    // Filter out movies that already have analysis
    const filteredMovies = await this.filterExistingAnalysis(movieIds);
    console.log(`🎯 Filtered to ${filteredMovies.length} movies needing analysis`);

    if (filteredMovies.length === 0) {
      console.log('✅ All movies already have analysis');
      return { success: true, generated: 0, cached: movieIds.length };
    }

    // Create batches
    const batches = this.createBatches(filteredMovies, batchSize);
    console.log(`📦 Created ${batches.length} batches`);

    // Initialize progress tracking
    this.progressTracker.initialize(filteredMovies.length);

    // Process batches with concurrency control
    const results = await this.processBatchesConcurrently(batches, maxConcurrency);

    return this.compileFinalResults(results);
  }

  /**
   * Filter out movies that already have analysis to avoid duplicate work
   */
  async filterExistingAnalysis(movieIds) {
    const { data: existingAnalyses } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis')
      .in('movie_id', movieIds);

    const existingMovieIds = new Set(existingAnalyses?.map(a => a.movie_id) || []);
    
    // Get movie data for IDs that don't have analysis
    const { data: moviesNeedingAnalysis } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .in('id', movieIds.filter(id => !existingMovieIds.has(id)));

    return moviesNeedingAnalysis || [];
  }

  /**
   * Create optimally sized batches for Claude Batch API
   */
  createBatches(movies, batchSize) {
    const batches = [];
    for (let i = 0; i < movies.length; i += batchSize) {
      batches.push(movies.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process multiple batches concurrently with smart throttling
   */
  async processBatchesConcurrently(batches, maxConcurrency) {
    const results = [];
    const activeBatches = [];

    for (let i = 0; i < batches.length; i++) {
      // Wait for rate limiter
      await this.rateLimiter.waitForSlot();
      
      // Check cost limits before proceeding
      if (!this.costTracker.canProceed()) {
        console.warn('⚠️ Cost limit reached, pausing batch processing');
        await this.costTracker.waitForReset();
      }

      // Start batch processing
      const batchPromise = this.processBatch(batches[i], i + 1)
        .then(result => {
          // Remove from active batches when complete
          const index = activeBatches.indexOf(batchPromise);
          if (index > -1) activeBatches.splice(index, 1);
          return result;
        });

      activeBatches.push(batchPromise);

      // Wait if we've hit concurrency limit
      if (activeBatches.length >= maxConcurrency) {
        const completed = await Promise.race(activeBatches);
        results.push(completed);
      }

      // Add delay between batch submissions
      if (i < batches.length - 1) {
        await this.sleep(BATCH_CONFIG.BATCH_DELAY_MS);
      }
    }

    // Wait for remaining batches to complete
    const remainingResults = await Promise.all(activeBatches);
    results.push(...remainingResults);

    return results;
  }

  /**
   * Process a single batch using Claude Batch API
   */
  async processBatch(movies, batchNumber) {
    console.log(`📦 Processing batch ${batchNumber} with ${movies.length} movies`);
    
    try {
      // Prepare batch requests for Claude
      const batchRequests = movies.map((movie, index) => {
        const promptConfig = buildPrompt('MOVIE_ANALYSIS', 
          'Include 3-4 accessibly written Explore Further topics for additional explorations');
        
        return {
          custom_id: `movie_${movie.id}`,
          method: 'POST',
          url: '/v1/messages',
          body: {
            ...promptConfig,
            messages: [{ 
              role: 'user', 
              content: `${movie.title} (${movie.year})` 
            }]
          }
        };
      });

      // Submit batch to Claude
      const batch = await anthropic.batches.create({
        requests: batchRequests
      });

      console.log(`🚀 Submitted batch ${batchNumber} to Claude (ID: ${batch.id})`);

      // Wait for batch completion with smart polling
      const completedBatch = await this.waitForBatchCompletion(batch.id, batchNumber);

      // Process batch results
      const results = await this.processBatchResults(completedBatch, movies);

      // Update progress
      this.progressTracker.updateProgress(movies.length);

      return {
        batchNumber,
        batchId: batch.id,
        moviesProcessed: movies.length,
        results,
        success: true
      };

    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed:`, error);
      
      // Implement exponential backoff for retries
      return await this.retryBatchWithBackoff(movies, batchNumber, error);
    }
  }

  /**
   * Wait for Claude batch completion with exponential polling
   */
  async waitForBatchCompletion(batchId, batchNumber) {
    let pollInterval = 5000; // Start with 5 seconds
    const maxPollInterval = 60000; // Max 1 minute between polls
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes max wait
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const batch = await anthropic.batches.retrieve(batchId);
        
        if (batch.processing_status === 'completed') {
          console.log(`✅ Batch ${batchNumber} completed in ${Math.round((Date.now() - startTime) / 1000)}s`);
          return batch;
        }
        
        if (batch.processing_status === 'failed') {
          throw new Error(`Batch ${batchNumber} failed: ${batch.errors?.[0]?.message || 'Unknown error'}`);
        }
        
        console.log(`⏳ Batch ${batchNumber} status: ${batch.processing_status}, waiting ${pollInterval}ms...`);
        await this.sleep(pollInterval);
        
        // Exponential backoff for polling
        pollInterval = Math.min(pollInterval * 1.2, maxPollInterval);
        
      } catch (error) {
        console.warn(`⚠️ Error checking batch ${batchNumber} status:`, error);
        await this.sleep(pollInterval);
      }
    }
    
    throw new Error(`Batch ${batchNumber} timed out after ${maxWaitTime}ms`);
  }

  /**
   * Process and save batch results
   */
  async processBatchResults(completedBatch, movies) {
    const results = [];
    
    try {
      // Download batch results
      const batchResults = await anthropic.batches.results.retrieve(completedBatch.id);
      
      // Process each result
      for (const result of batchResults) {
        try {
          const movie = movies.find(m => `movie_${m.id}` === result.custom_id);
          if (!movie) continue;

          if (result.result.type === 'succeeded') {
            const analysis = result.result.message.content[0].text;
            const usage = result.result.message.usage;
            
            // Calculate cost with batch discount
            const costEstimate = (
              (usage.input_tokens * 3 / 1000000) + 
              (usage.output_tokens * 15 / 1000000)
            ) * BATCH_CONFIG.BATCH_API_DISCOUNT;

            // Save to database
            await this.saveAnalysis(movie, analysis, usage, costEstimate);
            
            results.push({
              movieId: movie.id,
              title: movie.title,
              success: true,
              cost: costEstimate,
              tokens: usage.input_tokens + usage.output_tokens
            });

            // Track cost
            this.costTracker.addCost(costEstimate);
            
          } else {
            console.error(`❌ Analysis failed for ${movie.title}:`, result.result.error);
            results.push({
              movieId: movie.id,
              title: movie.title,
              success: false,
              error: result.result.error
            });
          }
        } catch (error) {
          console.error(`❌ Error processing result for movie:`, error);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error downloading batch results:`, error);
      throw error;
    }
    
    return results;
  }

  /**
   * Save analysis to database
   */
  async saveAnalysis(movie, analysis, usage, costEstimate) {
    const analysisData = {
      raw_content: analysis,
      generated_at: new Date().toISOString(),
      cost_estimate: costEstimate,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      model: 'claude-3-5-sonnet-20241022',
      batch_generated: true, // Flag for batch processing
      entity_data: null
    };

    await supabase
      .from('movie_analyses')
      .insert({
        movie_id: movie.id,
        analysis_type: 'page_analysis',
        claude_response: analysisData,
        query_text: `Nuclear batch analysis for ${movie.title} (${movie.year})`
      });
  }

  /**
   * Retry failed batch with exponential backoff
   */
  async retryBatchWithBackoff(movies, batchNumber, originalError, retryCount = 0) {
    if (retryCount >= BATCH_CONFIG.MAX_RETRIES) {
      console.error(`❌ Batch ${batchNumber} failed after ${BATCH_CONFIG.MAX_RETRIES} retries`);
      return {
        batchNumber,
        moviesProcessed: 0,
        results: [],
        success: false,
        error: originalError
      };
    }

    const backoffTime = Math.min(
      BATCH_CONFIG.INITIAL_BACKOFF_MS * Math.pow(BATCH_CONFIG.BACKOFF_MULTIPLIER, retryCount),
      BATCH_CONFIG.MAX_BACKOFF_MS
    );

    console.log(`🔄 Retrying batch ${batchNumber} in ${backoffTime}ms (attempt ${retryCount + 1})`);
    await this.sleep(backoffTime);

    return this.processBatch(movies, batchNumber);
  }

  /**
   * Compile final results from all batches
   */
  compileFinalResults(batchResults) {
    const totalMovies = batchResults.reduce((sum, batch) => sum + batch.moviesProcessed, 0);
    const totalCost = batchResults
      .flatMap(batch => batch.results || [])
      .reduce((sum, result) => sum + (result.cost || 0), 0);
    
    const successfulAnalyses = batchResults
      .flatMap(batch => batch.results || [])
      .filter(result => result.success).length;

    console.log(`✅ NUCLEAR BATCH COMPLETE:`);
    console.log(`📊 Total movies processed: ${totalMovies}`);
    console.log(`💰 Total cost: $${totalCost.toFixed(4)} (with 50% batch discount)`);
    console.log(`✅ Successful analyses: ${successfulAnalyses}`);
    console.log(`❌ Failed analyses: ${totalMovies - successfulAnalyses}`);

    return {
      success: true,
      totalMovies,
      successfulAnalyses,
      failedAnalyses: totalMovies - successfulAnalyses,
      totalCost,
      batchResults
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  constructor(requestsPerMinute) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    // If we're at the limit, wait
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 60000 - now;
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursive call after waiting
      }
    }
    
    // Add current request
    this.requests.push(now);
  }
}

/**
 * Cost tracker to prevent exceeding budget
 */
class CostTracker {
  constructor(maxCostPerHour) {
    this.maxCostPerHour = maxCostPerHour;
    this.costs = [];
  }

  addCost(cost) {
    this.costs.push({ cost, timestamp: Date.now() });
  }

  canProceed() {
    const oneHourAgo = Date.now() - 3600000;
    const recentCosts = this.costs.filter(c => c.timestamp > oneHourAgo);
    const totalCost = recentCosts.reduce((sum, c) => sum + c.cost, 0);
    
    return totalCost < this.maxCostPerHour;
  }

  async waitForReset() {
    // Wait until cost window resets
    const oneHourAgo = Date.now() - 3600000;
    const oldestRecentCost = this.costs.find(c => c.timestamp > oneHourAgo);
    
    if (oldestRecentCost) {
      const waitTime = oldestRecentCost.timestamp + 3600000 - Date.now();
      if (waitTime > 0) {
        console.log(`💰 Waiting ${waitTime}ms for cost window reset`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

/**
 * Progress tracker for build monitoring
 */
class ProgressTracker {
  constructor() {
    this.total = 0;
    this.completed = 0;
    this.startTime = null;
  }

  initialize(total) {
    this.total = total;
    this.completed = 0;
    this.startTime = Date.now();
    console.log(`📊 Initialized progress tracking for ${total} items`);
  }

  updateProgress(increment) {
    this.completed += increment;
    const percentage = ((this.completed / this.total) * 100).toFixed(1);
    const elapsed = Date.now() - this.startTime;
    const eta = elapsed * (this.total / this.completed) - elapsed;
    
    console.log(`📈 Progress: ${this.completed}/${this.total} (${percentage}%) - ETA: ${Math.round(eta / 1000)}s`);
  }
}

export { NuclearBatchGenerator, BATCH_CONFIG };