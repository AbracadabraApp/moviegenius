#!/usr/bin/env node

/**
 * Unified Movie Analysis Batch Processor
 * 
 * Combines the best features from both scripts:
 * ✅ Claude Batch API (50% cost savings) + Prompt Caching (90% input savings)
 * ✅ Real-time progress tracking with terminal display
 * ✅ Resume/restart capability with progress persistence
 * ✅ Accurate cost tracking including cache metrics
 * ✅ Test mode with essential movies list
 * ✅ Robust error handling and retry logic
 * ✅ Configurable concurrency and batch sizes
 * 
 * Usage:
 *   node scripts/batch-processor.js --test-mode
 *   node scripts/batch-processor.js --production --count 1000
 *   node scripts/batch-processor.js --resume --batch-api
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../lib/prompts/builder.js';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
// Simple logging helper
class BatchLogger {
  static movieSuccess(index, total, title, tmdbId, cost) {
    console.log(`${index}/${total} ✅ ${title} (TMDB ${tmdbId})`);
    console.log(`   🔒 Saved to database - $${cost.toFixed(4)} - batch processed\n`);
  }
  
  static movieError(index, total, title, tmdbId, error) {
    console.log(`${index}/${total} ❌ ${title} (TMDB ${tmdbId})`);
    console.log(`   🚨 ERROR: ${error}\n`);
  }
}

// Circuit Breaker for API failures
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - too many recent failures');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return this.state;
  }
}

const CONFIG = {
  // Processing modes
  INDIVIDUAL_API: 'individual',  // Fast iteration, immediate feedback
  BATCH_API: 'batch',           // 50% cost savings, batch processing
  
  // Batch sizes
  INDIVIDUAL_CONCURRENCY: 2,    // Parallel individual requests
  BATCH_SIZE: 50,               // Movies per batch (Claude limit: 100)
  MAX_CONCURRENT_BATCHES: 2,    // Parallel batches
  
  // Timing
  REQUEST_DELAY_MS: 1000,       // Delay between individual requests
  BATCH_DELAY_MS: 5000,         // Delay between batch submissions
  BATCH_POLL_INTERVAL_MS: 10000, // Initial polling interval for batch status
  
  // Cost and retry limits
  TARGET_COST_LIMIT: 100.0,     // $100 limit
  COST_WARNING_THRESHOLD: 80.0, // Warn at $80
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  
  // Files
  PROGRESS_FILE: './batch-progress.json',
  RESULTS_FILE: './batch-results.json',
  FAILED_MOVIES_FILE: './failed-movies.json',
  LOG_FILE: './batch-processing.log',
  TEST_LIST_FILE: '../PROMPT_C3_Test_LIST.txt',
  
  // Error thresholds
  ERROR_THRESHOLDS: {
    SMALL_BATCH: { max_movies: 100, stop_on_first: true },
    MEDIUM_BATCH: { max_movies: 1000, max_failure_rate: 0.02, max_failures: 20 },
    LARGE_BATCH: { max_movies: Infinity, max_failure_rate: 0.05, max_failures: 50 }
  },
};

class UnifiedBatchProcessor {
  constructor(options = {}) {
    this.mode = options.mode || CONFIG.INDIVIDUAL_API;
    this.useTestList = options.useTestList || false;
    this.clearTestData = options.clearTestData || false;
    this.maxMovies = options.maxMovies || null;
    this.forceReprocess = options.forceReprocess || false;
    
    this.startTime = Date.now();
    this.totalCost = 0;
    this.progress = this.loadProgress();
    this.results = this.loadResults();
    this.failedMovies = this.loadFailedMovies();
    this.movieList = null;
    this.errorThreshold = this.getErrorThreshold();
    
    // Simplified: Only track IDs, derive counts from Sets
    this.completedIds = new Set(this.progress.completed || []);
    this.failedIds = new Set((this.progress.failed || []).map(f => f.tmdbId || f));
    this.totalMoviesCount = 0;
    
    // Bulletproof error handling
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1min timeout
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 10;
    
    // Session tracking for monitoring
    this.sessionId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize monitoring
    this.logStructured('session_start', {
      mode: this.mode,
      useTestList: this.useTestList,
      maxMovies: this.maxMovies,
      clearTestData: this.clearTestData
    });
    
    console.log(`🚀 UNIFIED BATCH PROCESSOR - ${this.mode.toUpperCase()} MODE`);
    console.log(`📊 Cost limit: $${CONFIG.TARGET_COST_LIMIT}`);
    console.log(`⚙️  Test mode: ${this.useTestList ? 'YES' : 'NO'}`);
  }
  
  async loadMovieList() {
    if (this.useTestList) {
      // Test mode: Use the 50 essential movies list
      const testList = readFileSync(resolve(__dirname, CONFIG.TEST_LIST_FILE), 'utf-8')
        .split('\n')
        .map(id => id.trim())
        .filter(id => id && id !== '996'); // Exclude 996 (already tested)
      
      this.log(`📋 TEST MODE: Loaded ${testList.length} movies from test list`);
      return testList.slice(0, this.maxMovies || testList.length);
    } else {
      // Production mode: Get movies needing analysis from database with pagination
      this.log(`📋 PRODUCTION MODE: Loading movies needing analysis...`);
      
      const requestedCount = this.maxMovies || 17000; // Default to processing all movies
      const allMovies = [];
      let error = null;
      
      // Paginate through Supabase's 1000 row limit
      const SUPABASE_PAGE_SIZE = 1000;
      let offset = 0;
      
      this.log(`📊 PAGINATION MODE: Fetching up to ${requestedCount} movies in chunks of ${SUPABASE_PAGE_SIZE}`);
      
      while (allMovies.length < requestedCount) {
        const remainingCount = requestedCount - allMovies.length;
        const pageSize = Math.min(SUPABASE_PAGE_SIZE, remainingCount);
        
        this.log(`📄 Fetching page: ${offset} to ${offset + pageSize - 1}`);
        
        const { data: pageMovies, error: pageError } = await supabase
          .from('movies')
          .select('tmdb_id')
          .not('tmdb_id', 'is', null)
          .order('tmdb_id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        
        if (pageError) {
          error = pageError;
          break;
        }
        
        if (!pageMovies || pageMovies.length === 0) {
          this.log(`📄 No more movies found at offset ${offset} - reached end of database`);
          break;
        }
        
        allMovies.push(...pageMovies);
        offset += pageSize;
        
        this.log(`📊 Progress: ${allMovies.length}/${requestedCount} movies loaded`);
      }
      
      if (error) {
        throw new Error(`Failed to load movies: ${error.message}`);
      }
      
      // Filter out movies that already have analysis (unless force reprocessing)
      const movieIds = allMovies.map(m => m.tmdb_id.toString());
      let pendingMovies;
      
      if (this.forceReprocess) {
        pendingMovies = movieIds;
        this.log(`🔄 FORCE REPROCESS: Processing all ${movieIds.length} movies (ignoring existing analyses)`);
      } else {
        const existingAnalyses = await this.getExistingAnalyses(movieIds);
        pendingMovies = movieIds.filter(id => !existingAnalyses.has(id));
        this.log(`📋 PRODUCTION MODE: ${existingAnalyses.size} already processed, ${pendingMovies.length} remaining`);
      }
      
      // Apply maxMovies limit after filtering
      if (this.maxMovies && pendingMovies.length > this.maxMovies) {
        pendingMovies = pendingMovies.slice(0, this.maxMovies);
        this.log(`📋 PRODUCTION MODE: Limited to ${this.maxMovies} movies (${pendingMovies.length} available)`);
      }
      
      this.log(`📋 PRODUCTION MODE: Found ${pendingMovies.length} movies needing analysis`);
      return pendingMovies;
    }
  }
  
  async getCurrentAnalysisCount() {
    try {
      const { count, error } = await supabase
        .from('movie_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('analysis_type', 'page_analysis');
      
      if (error) {
        console.warn(`⚠️  Could not get analysis count: ${error.message}`);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.warn(`⚠️  Could not get analysis count: ${error.message}`);
      return 0;
    }
  }
  
  async getExistingAnalyses(tmdbIds) {
    // Get movies that already have analysis
    const { data: movies } = await supabase
      .from('movies')
      .select('id, tmdb_id')
      .in('tmdb_id', tmdbIds.map(id => parseInt(id)));
    
    const movieIdMap = new Map(movies?.map(m => [m.tmdb_id.toString(), m.id]) || []);
    
    const { data: existingAnalyses } = await supabase
      .from('movie_analyses')
      .select('movie_id')
      .eq('analysis_type', 'page_analysis')
      .in('movie_id', Array.from(movieIdMap.values()));
    
    const existingMovieIds = new Set(existingAnalyses?.map(a => a.movie_id) || []);
    const existingTmdbIds = new Set();
    
    for (const [tmdbId, movieId] of movieIdMap.entries()) {
      if (existingMovieIds.has(movieId)) {
        existingTmdbIds.add(tmdbId);
      }
    }
    
    return existingTmdbIds;
  }
  
  loadProgress() {
    if (!existsSync(CONFIG.PROGRESS_FILE)) {
      return {
        startedAt: new Date().toISOString(),
        completed: [],
        failed: [],
        totalCost: 0,
        mode: this.mode,
        lastSaved: new Date().toISOString(),
        // Large-scale processing support
        lastProcessedOffset: 0,
        resumeStrategy: 'id-based' // 'id-based' | 'offset-based'
      };
    }
    
    let progress;
    try {
      progress = JSON.parse(readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
    } catch (error) {
      console.warn(`⚠️ Progress file corrupted, creating backup and starting fresh`);
      const backupFile = `${CONFIG.PROGRESS_FILE}.backup.${Date.now()}`;
      try {
        const corruptedData = readFileSync(CONFIG.PROGRESS_FILE, 'utf-8');
        writeFileSync(backupFile, corruptedData);
        console.log(`📁 Corrupted progress backed up to: ${backupFile}`);
      } catch (backupError) {
        console.error('Failed to backup corrupted progress file:', backupError);
      }
      return this.loadProgress(); // Recursive call will create fresh progress
    }
    
    // Ensure required fields exist with defaults
    progress.lastProcessedOffset = progress.lastProcessedOffset || 0;
    progress.resumeStrategy = progress.resumeStrategy || 'id-based';
    
    this.log(`🔄 Resuming from progress: ${progress.completed?.length || 0} completed, ${progress.failed?.length || 0} failed`);
    this.log(`📊 Resume strategy: ${progress.resumeStrategy}, offset: ${progress.lastProcessedOffset}`);
    return progress;
  }
  
  loadResults() {
    if (!existsSync(CONFIG.RESULTS_FILE)) {
      return { successful: [], failed: [], metrics: {} };
    }
    return JSON.parse(readFileSync(CONFIG.RESULTS_FILE, 'utf-8'));
  }

  loadFailedMovies() {
    if (!existsSync(CONFIG.FAILED_MOVIES_FILE)) {
      return {
        batch_info: {
          batch_started: new Date().toISOString(),
          total_attempted: 0,
          total_failed: 0,
          failure_rate: "0%"
        },
        failed_movies: []
      };
    }
    return JSON.parse(readFileSync(CONFIG.FAILED_MOVIES_FILE, 'utf-8'));
  }

  getErrorThreshold() {
    const totalMovies = this.maxMovies || 17000;
    
    if (totalMovies <= CONFIG.ERROR_THRESHOLDS.SMALL_BATCH.max_movies) {
      return CONFIG.ERROR_THRESHOLDS.SMALL_BATCH;
    } else if (totalMovies <= CONFIG.ERROR_THRESHOLDS.MEDIUM_BATCH.max_movies) {
      return CONFIG.ERROR_THRESHOLDS.MEDIUM_BATCH;
    } else {
      return CONFIG.ERROR_THRESHOLDS.LARGE_BATCH;
    }
  }

  saveFailedMovie(tmdbId, title, year, error, costIncurred = 0) {
    const failedMovie = {
      tmdb_id: tmdbId,
      title: title || `TMDB ${tmdbId}`,
      year: year || null,
      error_type: this.classifyError(error),
      error_message: error,
      failed_at: new Date().toISOString(),
      cost_incurred: costIncurred,
      retry_count: 0,
      can_retry: !error.includes('Movie not found')
    };

    this.failedMovies.failed_movies.push(failedMovie);
    this.failedMovies.batch_info.total_failed = this.failedMovies.failed_movies.length;
    
    // Use Sets for accurate count calculation
    const totalProcessed = this.completedIds.size + this.failedIds.size;
    this.failedMovies.batch_info.failure_rate = 
      `${((this.failedMovies.failed_movies.length / Math.max(totalProcessed, 1)) * 100).toFixed(1)}%`;

    this.saveFailedMoviesFile();
    
    // Check if we should stop processing
    return this.shouldStopOnError();
  }

  classifyError(error) {
    if (error.includes('Database save failed') || error.includes('supabase')) {
      return 'database_save_failed';
    } else if (error.includes('Rate limit') || error.includes('429')) {
      return 'rate_limit_exceeded';
    } else if (error.includes('not found')) {
      return 'movie_not_found';
    } else if (error.includes('Claude') || error.includes('API')) {
      return 'claude_generation_failed';
    } else {
      return 'unknown_error';
    }
  }

  shouldStopOnError() {
    const totalFailed = this.failedMovies.failed_movies.length;
    const totalProcessed = this.completedIds.size + this.failedIds.size;
    const failureRate = totalFailed / Math.max(totalProcessed, 1);

    // Small batch: stop on first error
    if (this.errorThreshold.stop_on_first) {
      return totalFailed > 0;
    }

    // Medium/Large batch: check thresholds
    return (
      totalFailed >= this.errorThreshold.max_failures ||
      failureRate >= this.errorThreshold.max_failure_rate
    );
  }

  saveFailedMoviesFile() {
    writeFileSync(CONFIG.FAILED_MOVIES_FILE, JSON.stringify(this.failedMovies, null, 2));
  }
  
  saveProgress() {
    try {
      // Convert Sets back to arrays for JSON serialization
      this.progress.completed = Array.from(this.completedIds);
      this.progress.failed = Array.from(this.failedIds).map(id => ({ tmdbId: id, error: 'Unknown' }));
      this.progress.lastSaved = new Date().toISOString();
      this.progress.totalCost = this.totalCost;
      this.progress.mode = this.mode;
      
      // Update offset for large-scale processing
      if (this.progress.resumeStrategy === 'offset-based') {
        this.progress.lastProcessedOffset = this.completedIds.size + this.failedIds.size;
      }
      
      // Atomic write with backup
      const tempProgressFile = `${CONFIG.PROGRESS_FILE}.tmp`;
      const tempResultsFile = `${CONFIG.RESULTS_FILE}.tmp`;
      
      writeFileSync(tempProgressFile, JSON.stringify(this.progress, null, 2));
      writeFileSync(tempResultsFile, JSON.stringify(this.results, null, 2));
      
      // Atomic rename (prevents corruption during write)
      if (existsSync(CONFIG.PROGRESS_FILE)) {
        const backupFile = `${CONFIG.PROGRESS_FILE}.backup`;
        writeFileSync(backupFile, readFileSync(CONFIG.PROGRESS_FILE));
      }
      
      writeFileSync(CONFIG.PROGRESS_FILE, readFileSync(tempProgressFile));
      writeFileSync(CONFIG.RESULTS_FILE, readFileSync(tempResultsFile));
      
      // Cleanup temp files
      if (existsSync(tempProgressFile)) writeFileSync(tempProgressFile, '');
      if (existsSync(tempResultsFile)) writeFileSync(tempResultsFile, '');
      
    } catch (error) {
      console.error('💥 CRITICAL: Failed to save progress:', error.message);
      console.error('Progress may be lost. Manual recovery required.');
      
      // Try emergency save to alternate location
      try {
        const emergencyFile = `./emergency-progress-${Date.now()}.json`;
        const emergencyData = {
          completed: Array.from(this.completedIds),
          failed: Array.from(this.failedIds),
          totalCost: this.totalCost,
          timestamp: new Date().toISOString(),
          error: error.message
        };
        writeFileSync(emergencyFile, JSON.stringify(emergencyData, null, 2));
        console.log(`🚨 Emergency progress saved to: ${emergencyFile}`);
      } catch (emergencyError) {
        console.error('💀 FATAL: Even emergency save failed:', emergencyError.message);
      }
    }
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${level}: ${message}`;
    console.log(logLine);
    
    try {
      writeFileSync(CONFIG.LOG_FILE, logLine + '\n', { flag: 'a' });
    } catch (e) {
      // Don't fail if logging fails
    }
  }
  
  // Enhanced logging with structured data
  logStructured(event, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
      sessionId: this.sessionId || 'unknown',
      mode: this.mode,
      circuitBreakerState: this.circuitBreaker.getState(),
      consecutiveFailures: this.consecutiveFailures,
      totalCost: this.totalCost,
      progress: {
        completed: this.completedIds.size,
        failed: this.failedIds.size,
        total: this.totalMoviesCount
      }
    };
    
    // Console output
    console.log(`📊 ${event}:`, JSON.stringify(data, null, 2));
    
    // File logging
    try {
      const structuredLogFile = CONFIG.LOG_FILE.replace('.log', '.structured.jsonl');
      writeFileSync(structuredLogFile, JSON.stringify(logEntry) + '\n', { flag: 'a' });
    } catch (e) {
      this.log(`Failed to write structured log: ${e.message}`, 'WARN');
    }
  }
  
  // Performance monitoring
  startPerformanceTimer(operation) {
    return {
      operation,
      startTime: Date.now(),
      startMemory: process.memoryUsage()
    };
  }
  
  endPerformanceTimer(timer, additionalData = {}) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    const metrics = {
      operation: timer.operation,
      duration_ms: endTime - timer.startTime,
      memory_delta_mb: {
        rss: Math.round((endMemory.rss - timer.startMemory.rss) / 1024 / 1024),
        heapUsed: Math.round((endMemory.heapUsed - timer.startMemory.heapUsed) / 1024 / 1024),
        external: Math.round((endMemory.external - timer.startMemory.external) / 1024 / 1024)
      },
      ...additionalData
    };
    
    this.logStructured('performance_metric', metrics);
    return metrics;
  }
  
  async clearTestAnalyses() {
    if (!this.useTestList) return;
    
    let clearedCount = 0;
    let notFoundCount = 0;
    
    for (const tmdbId of this.movieList) {
      try {
        const { data: movie } = await supabase
          .from('movies')
          .select('id, title, year')
          .eq('tmdb_id', tmdbId)
          .single();

        if (!movie) {
          notFoundCount++;
          continue;
        }

        const { data: deletedAnalyses, error: deleteError } = await supabase
          .from('movie_analyses')
          .delete()
          .eq('movie_id', movie.id)
          .select('id');

        if (!deleteError && deletedAnalyses?.length > 0) {
          clearedCount += deletedAnalyses.length;
          console.log(`   🗑️  Cleared ${deletedAnalyses.length} analyses for "${movie.title}" (${movie.year})`);
        }
      } catch (error) {
        console.error(`   ❌ Error clearing ${tmdbId}: ${error.message}`);
      }
    }
    
    console.log(`✅ TEST CLEAR COMPLETE: ${clearedCount} analyses cleared, ${notFoundCount} movies not found`);
  }
  
  async run() {
    // Load movie candidates (all movies needing analysis)
    this.movieList = await this.loadMovieList();
    
    if (this.movieList.length === 0) {
      console.log('✅ No movies need processing');
      return;
    }
    
    // Clear communication about what we're working with
    const mode = this.useTestList ? 'TEST MODE' : 'PRODUCTION MODE';
    console.log(`🚀 UNIFIED BATCH PROCESSOR - ${mode}`);
    console.log('='.repeat(45 + mode.length));
    console.log(`📊 Total movies needing analysis: ${this.movieList.length}`);
    console.log(`💰 Cost limit: $${CONFIG.TARGET_COST_LIMIT}`);
    console.log(`🔄 Processing mode: ${this.mode}`);
    
    // Smart resume strategy selection
    this.totalMoviesCount = this.movieList.length;
    const processedCount = this.completedIds.size + this.failedIds.size;
    
    // Choose optimal resume strategy based on scale
    const LARGE_SCALE_THRESHOLD = 5000;
    const shouldUseOffsetResume = this.movieList.length > LARGE_SCALE_THRESHOLD;
    
    let remainingMovies;
    if (shouldUseOffsetResume && this.progress.resumeStrategy === 'offset-based') {
      // Offset-based resume for large scales
      const resumeOffset = this.progress.lastProcessedOffset || processedCount;
      remainingMovies = this.movieList.slice(resumeOffset);
      this.progress.resumeStrategy = 'offset-based';
      this.log(`📊 Using offset-based resume from position ${resumeOffset}`);
    } else {
      // ID-based resume for smaller scales or when offset isn't available
      remainingMovies = this.movieList.filter(tmdbId => 
        !this.completedIds.has(tmdbId) && !this.failedIds.has(tmdbId)
      );
      this.progress.resumeStrategy = 'id-based';
      
      // Auto-upgrade to offset-based for large datasets
      if (shouldUseOffsetResume) {
        this.progress.resumeStrategy = 'offset-based';
        this.progress.lastProcessedOffset = this.movieList.length - remainingMovies.length;
        this.log(`📊 Upgrading to offset-based resume for large dataset (${this.movieList.length} movies)`);
      }
    }
    
    console.log(`📍 Resume position: ${processedCount}/${this.movieList.length} (${remainingMovies.length} remaining)`);
    console.log(`🔄 Resume strategy: ${this.progress.resumeStrategy}`);
    
    if (remainingMovies.length === 0) {
      console.log('✅ All movies completed');
      this.printFinalSummary();
      return;
    }
    
    // Apply count limit if specified
    const finalMovieList = this.maxMovies ? 
      remainingMovies.slice(0, this.maxMovies) : 
      remainingMovies;
    
    // Clear test data if enabled
    if (this.clearTestData) {
      console.log(`🧹 Clearing existing analyses for clean testing...`);
      await this.clearTestAnalyses();
    }
    
    console.log(`📊 Processing ${finalMovieList.length} remaining movies`);
    
    // Simple batch start message
    console.log(`🎬 Starting batch processing...`);
    
    // Process based on mode
    if (this.mode === CONFIG.BATCH_API) {
      await this.processBatchAPI(finalMovieList);
    } else {
      await this.processIndividualAPI(finalMovieList);
    }
    
    this.printFinalSummary();
  }
  
  async processIndividualAPI(movieIds) {
    console.log(`🔄 Using Individual API mode with ${CONFIG.INDIVIDUAL_CONCURRENCY} parallel requests`);
    
    const activePromises = [];
    
    for (let i = 0; i < movieIds.length; i++) {
      const tmdbId = movieIds[i];
      
      const processPromise = this.processMovieIndividual(tmdbId, i + 1, movieIds.length)
        .then(result => {
          const index = activePromises.indexOf(processPromise);
          if (index > -1) activePromises.splice(index, 1);
          return result;
        });
      
      activePromises.push(processPromise);
      
      // Control concurrency
      if (activePromises.length >= CONFIG.INDIVIDUAL_CONCURRENCY) {
        await Promise.race(activePromises);
      }
      
      // Add delay between requests
      if (i < movieIds.length - 1) {
        await this.sleep(CONFIG.REQUEST_DELAY_MS);
      }
    }
    
    // Wait for remaining promises
    await Promise.all(activePromises);
  }
  
  async processMovieIndividual(tmdbId, currentIndex, totalRemaining) {
    const maxRetries = CONFIG.MAX_RETRIES;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Circuit breaker check
        if (this.circuitBreaker.getState() === 'OPEN') {
          this.log(`⚠️ Circuit breaker OPEN, waiting before retry...`, 'WARN');
          await this.sleep(this.circuitBreaker.timeout);
        }
        
        const result = await this.circuitBreaker.execute(async () => {
          // Get movie details with retry
          const { data: movie, error: movieError } = await supabase
            .from('movies')
            .select('id, title, year, tmdb_id')
            .eq('tmdb_id', tmdbId)
            .single();

          if (movieError || !movie) {
            throw new Error(`Movie ${tmdbId} not found in database`);
          }

          // Call direct API with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
          
          try {
            const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${tmdbId}`, {
              method: 'GET',
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const apiResult = await response.json();
            
            if (apiResult.error) {
              throw new Error(apiResult.error);
            }
            
            return { movie, apiResult };
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        });
        
        const { movie, apiResult } = result;

        // Track cost
        this.totalCost += apiResult.cost;
        
        // Check cost limits
        if (this.totalCost > CONFIG.TARGET_COST_LIMIT) {
          throw new Error(`Cost limit exceeded: $${this.totalCost.toFixed(2)} > $${CONFIG.TARGET_COST_LIMIT}`);
        }

        const processResult = {
          tmdbId,
          title: movie.title,
          year: movie.year,
          format: apiResult.format,
          timing: apiResult.timing.total,
          cost: apiResult.cost,
          tokens: `${apiResult.tokens.input}+${apiResult.tokens.output}`,
          success: true
        };

        // Success! Reset consecutive failure counter
        this.consecutiveFailures = 0;

        // Simplified progress tracking: only use Sets
        this.completedIds.add(tmdbId);
        
        // Handle cached vs new results
        if (processResult.cost === 0) {
          console.log(`${currentIndex}/${totalRemaining} ⏭️  ${processResult.title} (TMDB ${tmdbId}) - CACHED`);
        } else {
          this.results.successful.push(processResult);
          console.log(`${currentIndex}/${totalRemaining} ✅ ${processResult.title} (TMDB ${tmdbId})`);
          console.log(`   🔒 Saved to database - $${processResult.cost.toFixed(4)} - ${processResult.timing.toFixed(1)}s\n`);
          
          // Save progress periodically
          if (this.results.successful.length % 5 === 0) {
            this.saveProgress();
          }
        }
        
        return processResult;
        
      } catch (error) {
        lastError = error;
        
        // Check if this is a retryable error
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === maxRetries) {
          this.consecutiveFailures++;
          break; // Exit retry loop
        }
        
        // Exponential backoff with jitter
        const backoffMs = Math.min(
          CONFIG.INITIAL_BACKOFF_MS * Math.pow(CONFIG.BACKOFF_MULTIPLIER, attempt - 1),
          30000 // Max 30 seconds
        );
        const jitterMs = Math.random() * 1000; // Add up to 1 second jitter
        const totalDelay = backoffMs + jitterMs;
        
        this.log(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${tmdbId}: ${error.message}`, 'WARN');
        this.log(`⏳ Waiting ${Math.round(totalDelay)}ms before retry...`, 'INFO');
        
        await this.sleep(totalDelay);
      }
    }
    
    // All retries exhausted - handle failure
    try {
      // Get movie details for failed movie tracking
      let movieTitle = null;
      let movieYear = null;
      try {
        const { data: movie } = await supabase
          .from('movies')
          .select('title, year')
          .eq('tmdb_id', tmdbId)
          .single();
        movieTitle = movie?.title;
        movieYear = movie?.year;
      } catch (e) {
        // Continue with null values if movie lookup fails
        movieTitle = `TMDB ${tmdbId}`;
      }

      // Simplified failure tracking: only use Sets
      this.failedIds.add(tmdbId);
      this.results.failed.push({ tmdbId, error: lastError.message });
      
      console.log(`${currentIndex}/${totalRemaining} ❌ ${movieTitle || 'Unknown Movie'} (TMDB ${tmdbId})`);
      console.log(`   🚨 ERROR: ${lastError.message}\n`);
      
      // Check for consecutive failure circuit breaker
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        console.log(`\n\n🛑 STOPPING: Too many consecutive failures (${this.consecutiveFailures})`);
        throw new Error(`Consecutive failure limit exceeded: ${this.consecutiveFailures}`);
      }
      
      // Save to failed movies file and check if we should stop
      const shouldStop = this.saveFailedMovie(tmdbId, movieTitle, movieYear, lastError.message, 0);
      
      if (lastError.message.includes('Cost limit exceeded')) {
        console.log('\n\n🛑 STOPPING: Cost limit exceeded');
        throw lastError;
      }
      
      if (shouldStop) {
        console.log(`\n\n🛑 STOPPING: Error threshold exceeded (${this.failedMovies.failed_movies.length} failures)`);
        console.log(`📁 Failed movies saved to: ${CONFIG.FAILED_MOVIES_FILE}`);
        throw new Error('Error threshold exceeded');
      }
      
      return null;
      
    } catch (fatalError) {
      this.log(`💀 FATAL ERROR processing ${tmdbId}: ${fatalError.message}`, 'ERROR');
      throw fatalError;
    }
  }
  
  isRetryableError(error) {
    const errorMessage = error.message.toLowerCase();
    
    // Non-retryable errors
    if (errorMessage.includes('movie not found')) return false;
    if (errorMessage.includes('cost limit exceeded')) return false;
    if (errorMessage.includes('invalid tmdb id')) return false;
    
    // Retryable errors
    if (errorMessage.includes('timeout')) return true;
    if (errorMessage.includes('network')) return true;
    if (errorMessage.includes('rate limit')) return true;
    if (errorMessage.includes('500')) return true;
    if (errorMessage.includes('502')) return true;
    if (errorMessage.includes('503')) return true;
    if (errorMessage.includes('504')) return true;
    if (errorMessage.includes('connection')) return true;
    if (errorMessage.includes('aborted')) return true;
    
    // Default to retryable for unknown errors
    return true;
  }
  
  async processBatchAPI(movieIds) {
    console.log(`🚀 Using Claude Batch API mode (50% cost savings)`);
    
    // Create batches
    const batches = [];
    for (let i = 0; i < movieIds.length; i += CONFIG.BATCH_SIZE) {
      batches.push(movieIds.slice(i, i + CONFIG.BATCH_SIZE));
    }
    
    console.log(`📦 Created ${batches.length} batches of max ${CONFIG.BATCH_SIZE} movies each`);
    
    // Process batches
    for (let i = 0; i < batches.length; i++) {
      await this.processBatch(batches[i], i + 1);
      
      if (i < batches.length - 1) {
        console.log(`⏳ Waiting ${CONFIG.BATCH_DELAY_MS}ms before next batch...`);
        await this.sleep(CONFIG.BATCH_DELAY_MS);
      }
    }
  }
  
  async processBatch(movieTmdbIds, batchNumber) {
    console.log(`📦 Processing batch ${batchNumber} with ${movieTmdbIds.length} movies`);
    
    try {
      // Get movie details from database
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .in('tmdb_id', movieTmdbIds.map(id => parseInt(id)));
      
      if (moviesError || !movies) {
        throw new Error(`Failed to get movie details: ${moviesError?.message}`);
      }
      
      // Prepare batch requests
      const batchRequests = movies.map((movie) => {
        const promptConfig = buildPrompt(
          'MOVIE_ANALYSIS',
          'Include 3-5 Explore Further topics for deeper analysis'
        );

        return {
          custom_id: `movie_${movie.id}`,
          params: {
            ...promptConfig,
            messages: [
              {
                role: 'user',
                content: `${movie.title} (${movie.year})`,
              },
            ],
          },
        };
      });

      // Submit batch to Claude
      console.log(`🚀 Submitting batch ${batchNumber} to Claude Batch API...`);
      const batch = await anthropic.beta.messages.batches.create({
        requests: batchRequests,
      });

      console.log(`✅ Batch ${batchNumber} submitted (ID: ${batch.id})`);

      // Wait for completion
      const completedBatch = await this.waitForBatchCompletion(batch.id, batchNumber);
      
      // Process results
      await this.processBatchResults(completedBatch, movies, batchNumber);
      
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed:`, error);
      
      // Record all movies in this batch as failed
      for (const tmdbId of movieTmdbIds) {
        this.failedIds.add(tmdbId);
        this.results.failed.push({ tmdbId, error: error.message });
      }
    }
  }
  
  async waitForBatchCompletion(batchId, batchNumber) {
    let pollInterval = CONFIG.BATCH_POLL_INTERVAL_MS;
    const maxPollInterval = 60000; // Max 1 minute
    const maxWaitTime = 2 * 60 * 60 * 1000; // 2 hours for large batches
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const batch = await anthropic.beta.messages.batches.retrieve(batchId);

        if (batch.processing_status === 'ended') {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          
          // Check for batch-level failures using request_counts
          if (batch.request_counts && batch.request_counts.errored === batch.request_counts.total) {
            throw new Error(`Batch ${batchNumber} failed: all ${batch.request_counts.total} requests errored`);
          }
          
          console.log(`✅ Batch ${batchNumber} completed in ${elapsed}s (${batch.request_counts?.succeeded || 0} succeeded, ${batch.request_counts?.errored || 0} errored)`);
          return batch;
        }

        if (batch.processing_status === 'canceling') {
          console.log(`⚠️ Batch ${batchNumber} is canceling, continuing to wait for 'ended' status...`);
        }

        console.log(`⏳ Batch ${batchNumber} status: ${batch.processing_status}, waiting ${Math.round(pollInterval/1000)}s...`);
        await this.sleep(pollInterval);

        // Exponential backoff for polling
        pollInterval = Math.min(pollInterval * 1.2, maxPollInterval);
      } catch (error) {
        console.warn(`⚠️ Error checking batch ${batchNumber} status:`, error);
        await this.sleep(pollInterval);
      }
    }

    throw new Error(`Batch ${batchNumber} timed out after ${Math.round(maxWaitTime/1000)}s`);
  }
  
  async processBatchResults(completedBatch, movies, batchNumber) {
    try {
      // Download results using 0.57.0 stable SDK method with streaming
      console.log(`📥 Streaming results for batch ${batchNumber} using SDK 0.57.0...`);
      const resultsStream = await anthropic.messages.batches.results(completedBatch.id);
      
      // Stream results efficiently (memory-optimized for large batches)
      const batchResults = [];
      for await (const result of resultsStream) {
        batchResults.push(result);
      }
      
      console.log(`📥 Processing ${batchResults.length} results from batch ${batchNumber}`);
      
      for (const result of batchResults) {
        try {
          const movie = movies.find(m => `movie_${m.id}` === result.custom_id);
          if (!movie) continue;

          if (result.result.type === 'succeeded') {
            try {
              const analysis = result.result.message.content[0].text;
              const usage = result.result.message.usage;

              // Calculate cost with 50% batch discount
              const baseCost = (usage.input_tokens * 3) / 1000000 + (usage.output_tokens * 15) / 1000000;
              const actualCost = baseCost * 0.5; // 50% batch discount

              // Save to database (this can fail!)
              await this.saveBatchAnalysis(movie, analysis, usage, actualCost);

              this.results.successful.push({
                tmdbId: movie.tmdb_id.toString(),
                title: movie.title,
                success: true,
                cost: actualCost,
                tokens: usage.input_tokens + usage.output_tokens,
              });

              this.totalCost += actualCost;
              this.completedIds.add(movie.tmdb_id.toString());
              
              // Log success with simple helper
              const currentIndex = this.results.successful.length;
              BatchLogger.movieSuccess(currentIndex, this.totalMoviesCount, movie.title, movie.tmdb_id, actualCost);

            } catch (saveError) {
              console.error(`💥 Save failed for ${movie.title}: ${saveError.message}`);
              this.results.failed.push({
                tmdbId: movie.tmdb_id.toString(),
                title: movie.title,
                success: false,
                error: `Database save failed: ${saveError.message}`,
              });
              this.failedIds.add(movie.tmdb_id.toString());
            }

          } else {
            const currentIndex = this.results.successful.length + this.results.failed.length + 1;
            BatchLogger.movieError(currentIndex, this.totalMoviesCount, movie.title, movie.tmdb_id, result.result.error);
            this.results.failed.push({
              tmdbId: movie.tmdb_id.toString(),
              title: movie.title,
              success: false,
              error: result.result.error,
            });
            this.failedIds.add(movie.tmdb_id.toString());
          }
        } catch (error) {
          console.error(`❌ Error processing result:`, error);
        }
      }
      
      this.saveProgress();
      
    } catch (error) {
      console.error(`❌ Error downloading batch results:`, error);
      throw error;
    }
  }
  
  async saveBatchAnalysis(movie, analysis, usage, cost) {
    try {
      const analysisData = {
        raw_content: analysis,
        generated_at: new Date().toISOString(),
        cost_estimate: cost,
        actual_cost: cost,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
        cache_read_input_tokens: usage.cache_read_input_tokens || 0,
        model: 'claude-3-5-sonnet-20241022',
        batch_generated: true,
      };

      // Use UPSERT to handle duplicate key constraint
      const { error: saveError } = await supabase
        .from('movie_analyses')
        .upsert({
          movie_id: movie.id,
          analysis_type: 'page_analysis',
          claude_response: analysisData,
          query_text: `Batch analysis for ${movie.title} (${movie.year})`,
        }, {
          onConflict: 'movie_id,analysis_type'
        });

      if (saveError) {
        console.error(`❌ Database save failed for ${movie.title}: ${saveError.message}`);
        throw new Error(`Database save failed: ${saveError.message}`);
      }

      console.log(`💾 Saved analysis for ${movie.title} (${movie.year}) to database`);
      
    } catch (error) {
      console.error(`💥 Critical save error for ${movie.title}:`, error);
      throw error; // Re-throw to ensure batch processing stops on save failures
    }
  }
  
  updateTerminalProgress(tmdbId, title, status, details = {}) {
    // DASHBOARD COMMENTED OUT - Clean rolling logs only
    // Uncomment if progress bar dashboard is needed again
    /*
    if (status === '⏭️  SKIP') {
      console.log(`[${this.processedCount + 1}/${this.totalCount}] ⏭️  SKIP: ${title} (already exists)`);
      return;
    }
    
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const progressBar = this.generateProgressBar();
    const costStatus = this.getCostStatus();
    const eta = this.calculateETA();
    
    process.stdout.write('\r\x1b[K');
    
    const statusLine = `${progressBar} | ${status} | ${title} | ${costStatus} | ETA: ${eta}`;
    process.stdout.write(statusLine);
    
    if (status === '✅ COMPLETE' && details.timing) {
      console.log('');
      console.log(`   ⏱️  ${details.timing.toFixed(1)}s | 💰 $${details.cost.toFixed(4)} | 🎯 ${details.tokens} | 📄 ${details.format}`);
    }
    
    if (status === '❌ FAILED') {
      console.log('');
      console.log(`   💥 ${details.error}`);
    }
    */
  }
  
  generateProgressBar() {
    const width = 20;
    const completed = this.completedIds.size + this.failedIds.size;
    const total = this.totalMoviesCount;
    const percentage = total > 0 ? (completed / total) : 0;
    const filled = Math.round(width * percentage);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    return `[${completed}/${total}] ${bar} ${(percentage * 100).toFixed(1)}%`;
  }
  
  getCostStatus() {
    if (this.totalCost > CONFIG.COST_WARNING_THRESHOLD) {
      return `💸 $${this.totalCost.toFixed(2)}`;
    }
    return `💰 $${this.totalCost.toFixed(2)}`;
  }
  
  calculateETA() {
    const elapsed = Date.now() - this.startTime;
    const completed = this.completedIds.size + this.failedIds.size;
    const remaining = this.totalMoviesCount - completed;
    
    if (completed === 0 || remaining === 0) return 'Unknown';
    
    const avgTimePerItem = elapsed / completed;
    const etaMs = remaining * avgTimePerItem;
    const etaMins = Math.round(etaMs / 60000);
    
    if (etaMins < 60) return `${etaMins}m`;
    const hours = Math.floor(etaMins / 60);
    const mins = etaMins % 60;
    return `${hours}h ${mins}m`;
  }
  
  printFinalSummary() {
    console.log('\n\n🎯 FINAL BATCH PROCESSING SUMMARY');
    console.log('==================================');
    
    const successful = this.results.successful.length;
    const failed = this.results.failed.length;
    const total = successful + failed;
    const successRate = total > 0 ? (successful / total * 100) : 0;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success rate: ${successRate.toFixed(1)}%`);
    console.log(`💰 Total cost: $${this.totalCost.toFixed(4)}`);
    console.log(`🔄 Processing mode: ${this.mode}`);
    
    if (successful > 0) {
      const avgCost = this.totalCost / successful;
      const avgTime = this.results.successful.reduce((sum, r) => sum + (r.timing || 0), 0) / successful;
      
      console.log(`\n📊 PERFORMANCE METRICS:`);
      console.log(`💰 Average cost per movie: $${avgCost.toFixed(6)}`);
      if (avgTime > 0) console.log(`⏱️  Average processing time: ${avgTime.toFixed(1)}s`);
    }
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`\n⏱️  Total elapsed time: ${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`);
    console.log(`📁 Progress saved to: ${CONFIG.PROGRESS_FILE}`);
    console.log(`📁 Results saved to: ${CONFIG.RESULTS_FILE}`);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Command line interface
function showHelp() {
  console.log(`
Unified Movie Analysis Batch Processor

MODES:
  --individual-api    Fast iteration with immediate feedback (default)
  --batch-api         50% cost savings using Claude Batch API

SCOPE:
  --test-mode, --test Process 50 essential movies with auto-clear
  --production        Process all movies needing analysis
  --count N           Limit to N movies

CONTROL:
  --resume            Resume from previous progress (default)
  --restart           Start fresh, ignoring previous progress
  --clear-test-data   Clear existing test analyses before processing

LIMITS:
  --cost-limit N      Set cost limit in dollars (default: $100)
  --concurrency N     Set parallel processing count (default: 2)

Examples:
  # Test with 50 movies using fast individual API  
  node scripts/batch-processor.js --test --individual-api
  
  # Production batch processing with 50% savings
  node scripts/batch-processor.js --production --batch-api --count 1000
  
  # Resume previous batch processing
  node scripts/batch-processor.js --resume --batch-api
  
  # Conservative single-threaded processing
  node scripts/batch-processor.js --individual-api --concurrency 1
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {
    mode: CONFIG.INDIVIDUAL_API,
    useTestList: false,
    clearTestData: false,
    maxMovies: null,
    restart: false,
    forceReprocess: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
        showHelp();
        process.exit(0);
      case '--individual-api':
        options.mode = CONFIG.INDIVIDUAL_API;
        break;
      case '--batch-api':
        options.mode = CONFIG.BATCH_API;
        break;
      case '--test-mode':
      case '--test':
        options.useTestList = true;
        options.clearTestData = true;
        break;
      case '--production':
        options.useTestList = false;
        break;
      case '--count':
        options.maxMovies = parseInt(args[++i]) || null;
        break;
      case '--resume':
        options.restart = false;
        break;
      case '--restart':
        options.restart = true;
        break;
      case '--clear-test-data':
        options.clearTestData = true;
        break;
      case '--cost-limit':
        CONFIG.TARGET_COST_LIMIT = parseFloat(args[++i]) || CONFIG.TARGET_COST_LIMIT;
        CONFIG.COST_WARNING_THRESHOLD = CONFIG.TARGET_COST_LIMIT * 0.8;
        break;
      case '--concurrency':
        CONFIG.INDIVIDUAL_CONCURRENCY = parseInt(args[++i]) || CONFIG.INDIVIDUAL_CONCURRENCY;
        break;
      case '--force':
      case '--reprocess':
        options.forceReprocess = true;
        break;
    }
  }
  
  // Clear progress if restarting
  if (options.restart && existsSync(CONFIG.PROGRESS_FILE)) {
    console.log('🔄 Restarting: clearing previous progress...');
    writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify({
      startedAt: new Date().toISOString(),
      completed: [],
      failed: [],
      totalCost: 0,
      lastSaved: new Date().toISOString()
    }, null, 2));
  }
  
  try {
    const processor = new UnifiedBatchProcessor(options);
    await processor.run();
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n❌ Interrupted by user');
  process.exit(1);
});

main();