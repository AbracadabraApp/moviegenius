/**
 * Batch Processing Optimizer
 *
 * Provides high-performance parallel processing for large-scale operations
 * while respecting API rate limits and maintaining system stability.
 *
 * Features:
 * - Controlled concurrency with p-limit pattern
 * - Progress tracking and error recovery
 * - Circuit breakers for external API protection
 * - Batch database operations optimization
 * - Performance measurement and monitoring
 */

import { getPerformanceMonitor } from './performance-monitor.js';
import { getPool } from './railway-db.js';

/**
 * Batch Processing Utilities
 *
 * Provides optimized parallel processing patterns for common operations
 * with built-in error handling, progress tracking, and performance monitoring.
 */
class BatchOptimizer {
  constructor() {
    this.monitor = getPerformanceMonitor();

    // Default concurrency limits for different services
    this.concurrencyLimits = {
      claude: 5, // Claude API rate limits
      tmdb: 10, // TMDB allows higher concurrency
      database: 15, // Database can handle more concurrent operations
      default: 8, // Conservative default
    };

    // Circuit breaker state for external APIs
    this.circuitBreakers = new Map();
  }

  /**
   * Create a concurrency-limited function
   *
   * @param {number} limit - Maximum concurrent operations
   * @returns {Function} Limiter function
   */
  createConcurrencyLimiter(limit = this.concurrencyLimits.default) {
    let running = 0;
    const queue = [];

    return async fn => {
      return new Promise((resolve, reject) => {
        const run = async () => {
          running++;
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            running--;
            if (queue.length > 0) {
              const next = queue.shift();
              next();
            }
          }
        };

        if (running < limit) {
          run();
        } else {
          queue.push(run);
        }
      });
    };
  }

  /**
   * Process array in parallel with controlled concurrency
   *
   * @param {Array} items - Items to process
   * @param {Function} processor - Processing function
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Processing results
   */
  async processInParallel(items, processor, options = {}) {
    const {
      concurrency = this.concurrencyLimits.default,
      batchName = 'parallel_processing',
      onProgress = null,
      chunkSize = null,
    } = options;

    const startTime = Date.now();
    const limiter = this.createConcurrencyLimiter(concurrency);
    const results = [];
    const errors = [];
    let completed = 0;

    console.log(
      `🚀 Starting parallel processing: ${items.length} items with concurrency ${concurrency}`
    );

    // Process in chunks if specified
    if (chunkSize && items.length > chunkSize) {
      return await this.processInChunks(items, processor, { ...options, chunkSize });
    }

    // Create promises for all items
    const promises = items.map(async (item, index) => {
      try {
        const result = await limiter(async () => {
          const itemStartTime = Date.now();
          const itemResult = await processor(item, index);

          // Track individual item performance
          this.monitor.trackMetric(`${batchName}_item_duration`, Date.now() - itemStartTime, {
            item_index: index,
            batch_size: items.length,
          });

          return itemResult;
        });

        completed++;

        // Progress callback
        if (onProgress) {
          onProgress({
            completed,
            total: items.length,
            percentage: ((completed / items.length) * 100).toFixed(1),
            item,
            result,
          });
        }

        return { index, success: true, result };
      } catch (error) {
        completed++;
        errors.push({ index, item, error });

        console.warn(`⚠️ Item ${index} failed:`, error.message);

        if (onProgress) {
          onProgress({
            completed,
            total: items.length,
            percentage: ((completed / items.length) * 100).toFixed(1),
            item,
            error,
          });
        }

        return { index, success: false, error };
      }
    });

    // Wait for all operations to complete
    const allResults = await Promise.allSettled(promises);

    // Separate successful results from errors
    for (const promiseResult of allResults) {
      if (promiseResult.status === 'fulfilled') {
        const { success, result, error } = promiseResult.value;
        if (success) {
          results.push(result);
        }
      }
    }

    const duration = Date.now() - startTime;
    const successRate = (((items.length - errors.length) / items.length) * 100).toFixed(1);

    console.log(
      `✅ Parallel processing completed: ${results.length}/${items.length} successful (${successRate}%) in ${duration}ms`
    );

    // Track batch performance
    this.monitor.trackMetric(`${batchName}_batch_complete`, duration, {
      total_items: items.length,
      successful_items: results.length,
      failed_items: errors.length,
      success_rate: parseFloat(successRate),
      concurrency,
      items_per_second: ((items.length / duration) * 1000).toFixed(2),
    });

    return {
      results,
      errors,
      metrics: {
        totalItems: items.length,
        successfulItems: results.length,
        failedItems: errors.length,
        successRate: parseFloat(successRate),
        duration,
        itemsPerSecond: (items.length / duration) * 1000,
      },
    };
  }

  /**
   * Process large arrays in chunks to manage memory and API limits
   */
  async processInChunks(items, processor, options = {}) {
    const { chunkSize = 50, chunkDelay = 1000, batchName = 'chunked_processing' } = options;

    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    console.log(`📦 Processing ${items.length} items in ${chunks.length} chunks of ${chunkSize}`);

    const allResults = [];
    const allErrors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📦 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);

      const chunkResult = await this.processInParallel(chunk, processor, {
        ...options,
        batchName: `${batchName}_chunk_${i}`,
        chunkSize: null, // Prevent recursive chunking
      });

      allResults.push(...chunkResult.results);
      allErrors.push(...chunkResult.errors);

      // Delay between chunks to respect rate limits
      if (i < chunks.length - 1 && chunkDelay > 0) {
        console.log(`⏳ Waiting ${chunkDelay}ms before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }

    return {
      results: allResults,
      errors: allErrors,
      metrics: {
        totalItems: items.length,
        successfulItems: allResults.length,
        failedItems: allErrors.length,
        successRate: ((allResults.length / items.length) * 100).toFixed(1),
        chunksProcessed: chunks.length,
      },
    };
  }

  /**
   * Optimized database batch operations
   */
  async batchDatabaseOperation(operation, data, options = {}) {
    const { table, batchSize = 100, operation: dbOperation = 'upsert' } = options;

    const startTime = Date.now();

    if (!table) {
      throw new Error('Table name is required for batch database operations');
    }

    console.log(`💾 Starting batch ${dbOperation} on ${table}: ${data.length} records`);

    try {
      const results = [];
      const pool = getPool();

      // Process in batches to avoid hitting database limits
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        let batchResult;
        switch (dbOperation) {
          case 'upsert':
            // For Railway PostgreSQL, we need to implement upsert with ON CONFLICT
            // This is simplified - in reality you'd need proper column mapping
            console.log(`⚠️ Batch upsert not fully implemented for Railway - using basic insert`);
            batchResult = { data: [] }; // Placeholder
            break;
          case 'insert':
            // Basic batch insert implementation
            console.log(`⚠️ Batch insert not fully implemented for Railway`);
            batchResult = { data: [] }; // Placeholder
            break;
          case 'update':
            console.log(`⚠️ Batch update not fully implemented for Railway`);
            batchResult = { data: [] }; // Placeholder
            break;
          default:
            throw new Error(`Unsupported batch operation: ${dbOperation}`);
        }

        if (batchResult.error) {
          console.error(`❌ Batch ${dbOperation} failed:`, batchResult.error);
          throw batchResult.error;
        }

        results.push(...(batchResult.data || []));

        console.log(
          `💾 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`
        );
      }

      const duration = Date.now() - startTime;

      console.log(`✅ Batch ${dbOperation} completed: ${results.length} records in ${duration}ms`);

      this.monitor.trackMetric(`database_batch_${dbOperation}`, duration, {
        table,
        records_processed: data.length,
        records_inserted: results.length,
        batch_size: batchSize,
        records_per_second: ((results.length / duration) * 1000).toFixed(2),
      });

      return {
        success: true,
        results,
        metrics: {
          recordsProcessed: data.length,
          recordsInserted: results.length,
          duration,
          recordsPerSecond: (results.length / duration) * 1000,
        },
      };
    } catch (error) {
      console.error(`💥 Batch database operation failed:`, error);

      this.monitor.trackMetric(`database_batch_${dbOperation}_error`, Date.now() - startTime, {
        table,
        error: error.message,
        records_attempted: data.length,
      });

      throw error;
    }
  }

  /**
   * API call optimization with circuit breaker pattern
   */
  async makeResilientAPICall(apiName, callFunction, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      circuitBreakerThreshold = 5,
      circuitBreakerTimeout = 30000,
    } = options;

    // Check circuit breaker
    const breaker = this.circuitBreakers.get(apiName) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed', // closed, open, half-open
    };

    // If circuit is open, check if enough time has passed
    if (breaker.state === 'open') {
      if (Date.now() - breaker.lastFailure < circuitBreakerTimeout) {
        throw new Error(`Circuit breaker is open for ${apiName}`);
      } else {
        breaker.state = 'half-open';
      }
    }

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await callFunction();

        // Success - reset circuit breaker
        breaker.failures = 0;
        breaker.state = 'closed';
        this.circuitBreakers.set(apiName, breaker);

        // Track successful API call
        this.monitor.trackMetric(`api_call_${apiName}`, Date.now() - startTime, {
          attempt,
          success: true,
        });

        return result;
      } catch (error) {
        lastError = error;

        console.warn(`⚠️ API call ${apiName} attempt ${attempt} failed:`, error.message);

        // Update circuit breaker
        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= circuitBreakerThreshold) {
          breaker.state = 'open';
          console.error(
            `🔴 Circuit breaker opened for ${apiName} after ${breaker.failures} failures`
          );
        }

        this.circuitBreakers.set(apiName, breaker);

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Retrying ${apiName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.monitor.trackMetric(`api_call_${apiName}_failed`, 0, {
      max_attempts: maxRetries,
      final_error: lastError.message,
    });

    throw lastError;
  }

  /**
   * Progress tracking for long-running operations
   */
  createProgressTracker(totalItems, updateInterval = 5000) {
    let completed = 0;
    let lastUpdate = Date.now();
    const startTime = Date.now();

    return {
      update: (increment = 1) => {
        completed += increment;
        const now = Date.now();

        if (now - lastUpdate >= updateInterval || completed === totalItems) {
          const elapsed = now - startTime;
          const percentage = ((completed / totalItems) * 100).toFixed(1);
          const itemsPerSecond = ((completed / elapsed) * 1000).toFixed(2);
          const estimated =
            totalItems > completed
              ? ((totalItems - completed) / (completed / elapsed)).toFixed(0)
              : 0;

          console.log(
            `📊 Progress: ${completed}/${totalItems} (${percentage}%) | ${itemsPerSecond} items/sec | ETA: ${estimated}ms`
          );
          lastUpdate = now;
        }
      },

      getMetrics: () => ({
        completed,
        total: totalItems,
        percentage: ((completed / totalItems) * 100).toFixed(1),
        duration: Date.now() - startTime,
        itemsPerSecond: (completed / (Date.now() - startTime)) * 1000,
      }),
    };
  }

  /**
   * Get performance summary for batch operations
   */
  getBatchPerformanceStats() {
    // Implementation would aggregate metrics from performance monitor
    // This is a placeholder for now
    return {
      totalOperations: 0,
      averageItemsPerSecond: 0,
      successRate: 0,
      topPerformingOperations: [],
      recommendedOptimizations: [],
    };
  }
}

// Singleton instance
let batchOptimizer = null;

export function getBatchOptimizer() {
  if (!batchOptimizer) {
    batchOptimizer = new BatchOptimizer();
  }
  return batchOptimizer;
}

export default getBatchOptimizer;
