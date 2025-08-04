#!/usr/bin/env node

/**
 * Enhanced Batch Processing Script - Production Ready
 * 
 * Features:
 * ✅ Restart/Resume capability with progress tracking
 * ✅ Comprehensive logging with terminal progress view
 * ✅ Cost tracking and per-analysis metrics
 * ✅ Robust error handling with retry logic
 * ✅ Progress persistence and recovery
 * ✅ Configurable batch sizes and concurrency
 * ✅ Verbose terminal output with live updates
 * ✅ Performance monitoring and optimization
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const CONFIG = {
  // Processing options
  BATCH_SIZE: 1, // Individual movie processing
  MAX_CONCURRENT: 2, // Process 2 movies in parallel
  REQUEST_DELAY_MS: 1000, // 1 second delay between requests (reduced for parallel)
  
  // Test mode settings
  CLEAR_TEST_DATA: false, // Production default: preserve existing analyses
  USE_TEST_LIST: false, // Production default: process all movies, not just test list
  
  // Retry configuration
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  
  // Progress files
  PROGRESS_FILE: './batch-progress.json',
  RESULTS_FILE: './batch-results.json',
  LOG_FILE: './batch-processing.log',
  
  // Cost tracking
  TARGET_COST_LIMIT: 100.0, // $100 limit
  COST_WARNING_THRESHOLD: 80.0, // Warn at $80
};

class BatchProcessor {
  constructor() {
    this.startTime = Date.now();
    this.totalCost = 0;
    this.progress = this.loadProgress();
    this.results = this.loadResults();
    this.movieList = null; // Will be loaded async in run()
    
    // Terminal display state
    this.lastProgressUpdate = '';
    this.processedCount = 0;
    this.totalCount = 0;
  }
  
  async loadMovieList() {
    if (CONFIG.USE_TEST_LIST) {
      // Test mode: Use the 50 essential movies list
      const testList = readFileSync(resolve(__dirname, '../PROMPT_C3_Test_LIST.txt'), 'utf-8')
        .split('\n')
        .map(id => id.trim())
        .filter(id => id && id !== '996'); // Exclude 996 (already tested)
      
      this.log(`📋 TEST MODE: Loaded ${testList.length} movies from test list`);
      return testList;
    } else {
      // Production mode: Get all movies from database that need analysis
      this.log(`📋 PRODUCTION MODE: Loading all movies needing analysis...`);
      
      const { data: allMovies, error } = await supabase
        .from('movies')
        .select('tmdb_id')
        .not('tmdb_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to load movies: ${error.message}`);
      }
      
      const movieIds = allMovies.map(m => m.tmdb_id.toString());
      this.log(`📋 PRODUCTION MODE: Found ${movieIds.length} total movies in database`);
      
      return movieIds;
    }
  }
  
  loadProgress() {
    if (!existsSync(CONFIG.PROGRESS_FILE)) {
      return {
        startedAt: new Date().toISOString(),
        currentIndex: 0,
        completed: [],
        failed: [],
        skipped: [],
        totalCost: 0,
        lastSaved: new Date().toISOString()
      };
    }
    
    const progress = JSON.parse(readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
    this.log(`🔄 Resuming from progress: ${progress.completed.length} completed, ${progress.failed.length} failed`);
    return progress;
  }
  
  loadResults() {
    if (!existsSync(CONFIG.RESULTS_FILE)) {
      return {
        successful: [],
        failed: [],
        metrics: {}
      };
    }
    
    return JSON.parse(readFileSync(CONFIG.RESULTS_FILE, 'utf-8'));
  }
  
  saveProgress() {
    this.progress.lastSaved = new Date().toISOString();
    this.progress.totalCost = this.totalCost;
    writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    writeFileSync(CONFIG.RESULTS_FILE, JSON.stringify(this.results, null, 2));
  }
  
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${level}: ${message}`;
    console.log(logLine);
    
    // Append to log file
    try {
      const logEntry = logLine + '\\n';
      writeFileSync(CONFIG.LOG_FILE, logEntry, { flag: 'a' });
    } catch (e) {
      // Don't fail if logging fails
    }
  }
  
  updateTerminalProgress(tmdbId, title, status, details = {}) {
    // Handle skipped items
    if (status === '⏭️  SKIP') {
      console.log(`[${this.processedCount + 1}/${this.totalCount}] ⏭️  SKIP: ${title} (already exists)`);
      return;
    }
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    
    const progressBar = this.generateProgressBar();
    const costStatus = this.getCostStatus();
    const eta = this.calculateETA();
    
    // Clear previous line and show current status
    process.stdout.write('\\r\\x1b[K');
    
    const statusLine = `${progressBar} | ${status} | ${title} | ${costStatus} | ETA: ${eta}`;
    process.stdout.write(statusLine);
    
    // For completed items, show detailed info on new line
    if (status === '✅ COMPLETE' && details.timing) {
      console.log(''); // New line
      console.log(`   ⏱️  ${details.timing.toFixed(1)}s | 💰 $${details.cost.toFixed(4)} | 🎯 ${details.tokens} | 📄 ${details.format}`);
      
      // Show preview if available
      if (details.preview) {
        console.log(`   📄 ${details.preview}`);
      }
    }
    
    if (status === '❌ FAILED') {
      console.log(''); // New line
      console.log(`   💥 ${details.error}`);
    }
  }
  
  generateProgressBar() {
    const width = 20;
    const completed = this.processedCount;
    const total = this.totalCount;
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
    const remaining = this.totalCount - this.processedCount;
    
    if (this.processedCount === 0 || remaining === 0) return 'Unknown';
    
    const avgTimePerItem = elapsed / this.processedCount;
    const etaMs = remaining * avgTimePerItem;
    const etaMins = Math.round(etaMs / 60000);
    
    if (etaMins < 60) return `${etaMins}m`;
    const hours = Math.floor(etaMins / 60);
    const mins = etaMins % 60;
    return `${hours}h ${mins}m`;
  }
  
  async processWithRetry(tmdbId, maxRetries = CONFIG.MAX_RETRIES) {
    let lastError;
    let backoffMs = CONFIG.INITIAL_BACKOFF_MS;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.processSingleMovie(tmdbId);
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          this.log(`⚠️  Attempt ${attempt} failed for ${tmdbId}: ${error.message}. Retrying in ${backoffMs}ms...`, 'WARN');
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          backoffMs *= CONFIG.BACKOFF_MULTIPLIER;
        }
      }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
  }
  
  async processSingleMovie(tmdbId) {
    // Get movie details from database
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (movieError || !movie) {
      throw new Error(`Movie ${tmdbId} not found in database`);
    }

    // Call direct API endpoint
    const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${tmdbId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const apiResult = await response.json();
    
    if (apiResult.error) {
      throw new Error(apiResult.error);
    }

    // Track cost
    this.totalCost += apiResult.cost;
    
    // Check cost limits
    if (this.totalCost > CONFIG.TARGET_COST_LIMIT) {
      throw new Error(`Cost limit exceeded: $${this.totalCost.toFixed(2)} > $${CONFIG.TARGET_COST_LIMIT}`);
    }

    return {
      tmdbId,
      title: movie.title,
      year: movie.year,
      format: apiResult.format,
      timing: apiResult.timing.total,
      cost: apiResult.cost,
      tokens: `${apiResult.tokens.input}+${apiResult.tokens.output}`,
      preview: this.generatePreview(apiResult.analysis, apiResult.format)
    };
  }
  
  generatePreview(analysis, format) {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(analysis);
        return `JSON: ${parsed.metadata?.title || 'Unknown'} (${parsed.metadata?.wordCount || 'unknown'} words)`;
      } catch (e) {
        return 'JSON: Parse error';
      }
    }
    return `Text: ${analysis.substring(0, 100)}...`;
  }
  
  async clearTestAnalyses() {
    let clearedCount = 0;
    let notFoundCount = 0;
    
    for (const tmdbId of this.movieList) {
      try {
        // Find movie in database
        const { data: movie } = await supabase
          .from('movies')
          .select('id, title, year')
          .eq('tmdb_id', tmdbId)
          .single();

        if (!movie) {
          notFoundCount++;
          continue;
        }

        // Delete all analyses for this movie
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
    
    // Reset progress since we're starting fresh
    this.progress = {
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      completed: [],
      failed: [],
      skipped: [],
      totalCost: 0,
      lastSaved: new Date().toISOString()
    };
    
    this.results = {
      successful: [],
      failed: [],
      metrics: {}
    };
    
    this.totalCost = 0;
  }
  
  async run() {
    // Load movie list (async)
    this.movieList = await this.loadMovieList();
    this.totalCount = this.movieList.length;
    
    const mode = CONFIG.USE_TEST_LIST ? 'TEST MODE' : 'PRODUCTION MODE';
    console.log(`🚀 ENHANCED BATCH PROCESSING - ${mode}`);
    console.log('='.repeat(45 + mode.length));
    console.log(`📊 Total movies: ${this.totalCount}`);
    console.log(`🔄 Resume from: ${this.progress.currentIndex}`);
    console.log(`💰 Cost limit: $${CONFIG.TARGET_COST_LIMIT}`);
    console.log(`⚙️  Concurrency: ${CONFIG.MAX_CONCURRENT} parallel`);
    console.log(`⏱️  Request delay: ${CONFIG.REQUEST_DELAY_MS}ms`);
    
    // Clear test data if enabled
    if (CONFIG.CLEAR_TEST_DATA) {
      console.log(`🧹 TEST MODE: Clearing existing analyses for clean testing...`);
      await this.clearTestAnalyses();
    }
    
    console.log('');
    
    // Get remaining movies to process
    const remainingMovies = this.movieList.slice(this.progress.currentIndex);
    const moviesToProcess = remainingMovies.filter(tmdbId => !this.progress.completed.includes(tmdbId));
    
    if (moviesToProcess.length === 0) {
      console.log('✅ All movies already completed!');
      this.printFinalSummary();
      return;
    }
    
    console.log(`🎯 Processing ${moviesToProcess.length} remaining movies...\\n`);
    
    // Process movies concurrently
    await this.processConcurrently(moviesToProcess);
    
    this.printFinalSummary();
  }
  
  async processConcurrently(movieIds) {
    const activePromises = [];
    let completedCount = 0;
    
    for (let i = 0; i < movieIds.length; i++) {
      const tmdbId = movieIds[i];
      
      // Create processing promise
      const processPromise = this.processMovieWithTracking(tmdbId, i + this.progress.currentIndex)
        .then(result => {
          completedCount++;
          this.processedCount = this.progress.currentIndex + completedCount;
          
          // Remove from active promises
          const index = activePromises.indexOf(processPromise);
          if (index > -1) activePromises.splice(index, 1);
          
          return result;
        });
      
      activePromises.push(processPromise);
      
      // Control concurrency - wait if we've hit the limit
      if (activePromises.length >= CONFIG.MAX_CONCURRENT) {
        await Promise.race(activePromises);
      }
      
      // Add delay between starting new requests
      if (i < movieIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.REQUEST_DELAY_MS));
      }
    }
    
    // Wait for all remaining promises to complete
    await Promise.all(activePromises);
  }
  
  async processMovieWithTracking(tmdbId, globalIndex) {
    try {
      this.updateTerminalProgress(tmdbId, 'Processing...', '🔄 WORK');
      
      const result = await this.processWithRetry(tmdbId);
      
      // Check if this was a cached/existing result (cost = 0)
      if (result.cost === 0) {
        // This was already in database
        this.progress.completed.push(tmdbId);
        this.progress.currentIndex = Math.max(this.progress.currentIndex, globalIndex + 1);
        
        this.updateTerminalProgress(tmdbId, result.title, '⏭️  SKIP', { 
          source: result.source,
          format: result.format 
        });
        
        return result;
      }
      
      // This was a new generation
      this.progress.completed.push(tmdbId);
      this.progress.currentIndex = Math.max(this.progress.currentIndex, globalIndex + 1);
      this.results.successful.push(result);
      
      // Track cost
      this.totalCost += result.cost;
      
      this.updateTerminalProgress(tmdbId, result.title, '✅ COMPLETE', result);
      
      // Save progress periodically
      if (this.results.successful.length % 5 === 0) {
        this.saveProgress();
      }
      
      return result;
      
    } catch (error) {
      // Record failure
      this.progress.failed.push({ tmdbId, error: error.message });
      this.progress.currentIndex = Math.max(this.progress.currentIndex, globalIndex + 1);
      this.results.failed.push({ tmdbId, error: error.message });
      
      this.updateTerminalProgress(tmdbId, `TMDB ${tmdbId}`, '❌ FAILED', { error: error.message });
      
      this.log(`❌ Failed to process ${tmdbId}: ${error.message}`, 'ERROR');
      
      // Stop on cost limit or critical errors
      if (error.message.includes('Cost limit exceeded')) {
        console.log('\\n\\n🛑 STOPPING: Cost limit exceeded');
        throw error; // This will stop the batch
      }
      
      return null;
    }
  }
  
  printFinalSummary() {
    console.log('\\n\\n🎯 FINAL BATCH PROCESSING SUMMARY');
    console.log('==================================');
    
    const successful = this.results.successful.length;
    const failed = this.results.failed.length;
    const total = successful + failed;
    const successRate = total > 0 ? (successful / total * 100) : 0;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success rate: ${successRate.toFixed(1)}%`);
    console.log(`💰 Total cost: $${this.totalCost.toFixed(4)}`);
    
    if (successful > 0) {
      const avgCost = this.totalCost / successful;
      const avgTime = this.results.successful.reduce((sum, r) => sum + r.timing, 0) / successful;
      const jsonCount = this.results.successful.filter(r => r.format === 'json').length;
      
      console.log(`\\n📊 PERFORMANCE METRICS:`);
      console.log(`💰 Average cost per movie: $${avgCost.toFixed(4)}`);
      console.log(`⏱️  Average processing time: ${avgTime.toFixed(1)}s`);
      console.log(`📄 JSON format rate: ${jsonCount}/${successful} (${((jsonCount/successful)*100).toFixed(1)}%)`);
    }
    
    if (failed > 0) {
      console.log(`\\n❌ FAILURES:`);
      this.results.failed.slice(0, 10).forEach((failure, i) => {
        console.log(`   ${i + 1}. ${failure.tmdbId}: ${failure.error}`);
      });
      if (failed > 10) {
        console.log(`   ... and ${failed - 10} more failures`);
      }
    }
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`\\n⏱️  Total elapsed time: ${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`);
    console.log(`📁 Progress saved to: ${CONFIG.PROGRESS_FILE}`);
    console.log(`📁 Results saved to: ${CONFIG.RESULTS_FILE}`);
    console.log(`📁 Logs saved to: ${CONFIG.LOG_FILE}`);
  }
}

// Command line interface
function showHelp() {
  console.log(`
Enhanced Batch Processing Script

Usage:
  node scripts/batch-process-enhanced.js [options]

Options:
  --resume          Resume from previous progress (default)
  --restart         Start fresh, ignoring previous progress
  --cost-limit N    Set cost limit in dollars (default: $5.00)
  --delay N         Set delay between requests in ms (default: 1000)
  --concurrency N   Set parallel processing count (default: 2)
  --test-mode       Enable test mode (50 movies + auto-clear)
  --help            Show this help message

Examples:
  node scripts/batch-process-enhanced.js --resume
  node scripts/batch-process-enhanced.js --restart --cost-limit 10
  node scripts/batch-process-enhanced.js --delay 1000 --concurrency 3
  node scripts/batch-process-enhanced.js --concurrency 1  # Single-threaded for safety
  node scripts/batch-process-enhanced.js --test-mode      # Test with 50 movies + auto-clear
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let restart = false;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
        showHelp();
        process.exit(0);
      case '--restart':
        restart = true;
        break;
      case '--cost-limit':
        CONFIG.TARGET_COST_LIMIT = parseFloat(args[++i]) || CONFIG.TARGET_COST_LIMIT;
        break;
      case '--delay':
        CONFIG.REQUEST_DELAY_MS = parseInt(args[++i]) || CONFIG.REQUEST_DELAY_MS;
        break;
      case '--concurrency':
        CONFIG.MAX_CONCURRENT = parseInt(args[++i]) || CONFIG.MAX_CONCURRENT;
        break;
      case '--test-mode':
        CONFIG.USE_TEST_LIST = true;
        CONFIG.CLEAR_TEST_DATA = true;
        break;
    }
  }
  
  // Clear progress if restarting
  if (restart && existsSync(CONFIG.PROGRESS_FILE)) {
    console.log('🔄 Restarting: clearing previous progress...');
    writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify({
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      completed: [],
      failed: [],
      skipped: [],
      totalCost: 0,
      lastSaved: new Date().toISOString()
    }, null, 2));
  }
  
  try {
    const processor = new BatchProcessor();
    await processor.run();
  } catch (error) {
    console.error('\\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();