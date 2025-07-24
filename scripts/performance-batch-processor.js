#!/usr/bin/env node

/**
 * Performance Batch Processor
 * 
 * Executes scaled batch processing: 1 → 10 → 100 → 1000 → 5000 movies
 * Focuses on performance optimization and data storage efficiency
 * Uses existing movies-without-analysis.json as source data
 * 
 * Usage:
 *   node scripts/performance-batch-processor.js --scale 1
 *   node scripts/performance-batch-processor.js --scale 10 --dry-run
 *   node scripts/performance-batch-processor.js --scale 100 --monitor-only
 */

// CRITICAL: Set environment variables FIRST before any imports
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

// Set environment variables if not already set
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjvaplqqibvlmazdvcwx.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODc5NzIyMSwiZXhwIjoyMDY0MzczMjIxfQ.di8BruE8kk0coCMMoKAIet3WnhzXO4vKPbK3hMjvLJ8';

// Now import other modules that depend on environment variables
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Import the real AnalysisService
import { AnalysisService } from '../lib/services/analysis-service.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class PerformanceBatchProcessor {
  constructor() {
    this.performanceMetrics = {
      startTime: null,
      endTime: null,
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      avgProcessingTime: 0,
      totalCost: 0,
      dbOperations: 0,
      memoryUsage: [],
      throughputMbps: 0,
      // Enhanced performance tracking
      stageTimings: {
        databaseLookup: [],
        apiCall: [],
        storage: [],
        verification: []
      },
      bottlenecks: [],
      apiMetrics: {
        totalTokensIn: 0,
        totalTokensOut: 0,
        avgResponseTime: 0,
        rateLimitHits: 0
      }
    };
  }

  async executeScaledProcessing(scale, options = {}) {
    const { dryRun = false, monitorOnly = false } = options;
    
    console.log('🚀 Performance Batch Processor');
    console.log(`📊 Scale: ${scale} movies`);
    console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : monitorOnly ? 'MONITOR ONLY' : 'FULL PROCESSING'}`);
    console.log('================================\n');

    // Load source data
    const moviesWithoutAnalysis = JSON.parse(
      readFileSync(resolve(__dirname, '../movies-without-analysis.json'), 'utf8')
    );

    if (scale > moviesWithoutAnalysis.length) {
      console.error(`❌ Requested scale (${scale}) exceeds available movies (${moviesWithoutAnalysis.length})`);
      process.exit(1);
    }

    // Select movies for processing
    const targetMovies = moviesWithoutAnalysis.slice(0, scale);
    console.log(`🎯 Selected ${targetMovies.length} movies for processing`);
    
    // Preview selected movies
    console.log('\n📋 Target Movies:');
    targetMovies.slice(0, Math.min(10, targetMovies.length)).forEach((movie, i) => {
      console.log(`  ${i + 1}. ${movie.title} (${movie.year}) [TMDB: ${movie.tmdb_id}]`);
    });
    if (targetMovies.length > 10) {
      console.log(`  ... and ${targetMovies.length - 10} more`);
    }

    // Fetch database IDs for target movies
    const movieIds = await this.fetchMovieIds(targetMovies);
    console.log(`\n🔍 Found ${movieIds.length} movies in database`);

    if (movieIds.length === 0) {
      console.log('❌ No target movies found in database');
      process.exit(0);
    }

    // Verify zero-waste protection and get filtered list
    const filteredMovieIds = await this.verifyZeroWasteProtection(movieIds);

    // Performance estimation using filtered movies
    const estimatedCost = filteredMovieIds.length * 0.015 * 0.5; // With batch discount
    const estimatedTime = Math.ceil(filteredMovieIds.length / 10) * 2; // ~10 movies per 2 minutes
    console.log(`\n💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
    console.log(`⏱️  Estimated time: ${estimatedTime} minutes`);

    if (dryRun) {
      console.log('\n🔍 DRY RUN - No processing will occur');
      return this.performanceMetrics;
    }

    if (monitorOnly) {
      console.log('\n📊 MONITOR ONLY - Performance analysis without processing');
      return await this.performMonitoringAnalysis(filteredMovieIds);
    }

    // Confirm processing
    if (!await this.confirmProcessing(filteredMovieIds.length)) {
      console.log('❌ Cancelled by user');
      process.exit(0);
    }

    // Execute processing with performance monitoring
    return await this.executeWithMonitoring(filteredMovieIds, targetMovies);
  }

  async fetchMovieIds(targetMovies) {
    const tmdbIds = targetMovies.map(m => m.tmdb_id);
    
    console.log('🔍 Fetching movie IDs from database...');
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, tmdb_id, title, year')
      .in('tmdb_id', tmdbIds);

    if (error) {
      console.error('❌ Error fetching movie IDs:', error.message);
      throw error;
    }

    this.performanceMetrics.dbOperations++;
    return movies || [];
  }

  async verifyZeroWasteProtection(movieIds) {
    console.log('\n🛡️  Verifying zero-waste protection...');
    
    const movieIdList = movieIds.map(m => m.id);
    const { data: existingAnalyses, error } = await supabase
      .from('movie_analyses')
      .select('movie_id, analysis_type')
      .in('movie_id', movieIdList);

    if (error) {
      console.error('❌ Error checking existing analyses:', error.message);
      throw error;
    }

    const analyzedMovieIds = new Set(existingAnalyses?.map(a => a.movie_id) || []);
    const needAnalysis = movieIds.filter(m => !analyzedMovieIds.has(m.id));
    
    console.log(`✅ Zero-waste verification: ${needAnalysis.length}/${movieIds.length} movies need analysis`);
    
    if (needAnalysis.length < movieIds.length) {
      console.log(`⚠️  Skipping ${movieIds.length - needAnalysis.length} movies with existing analysis`);
    }

    this.performanceMetrics.dbOperations++;
    return needAnalysis;
  }

  async performMonitoringAnalysis(movieIds) {
    console.log('\n📊 Performing database performance analysis...');
    
    const startTime = Date.now();
    
    // Analyze current database performance
    const dbStats = await this.analyzeDatabasePerformance();
    
    // Simulate processing load
    const simulationResults = await this.simulateProcessingLoad(movieIds.length);
    
    const endTime = Date.now();
    
    const metrics = {
      ...this.performanceMetrics,
      startTime,
      endTime,
      duration: endTime - startTime,
      dbStats,
      simulationResults,
      mode: 'monitor_only'
    };

    this.printPerformanceReport(metrics);
    return metrics;
  }

  async analyzeDatabasePerformance() {
    console.log('  📈 Analyzing database performance...');
    
    const queries = [
      { name: 'Total Movies', query: supabase.from('movies').select('*', { count: 'exact', head: true }) },
      { name: 'Total Analyses', query: supabase.from('movie_analyses').select('*', { count: 'exact', head: true }) },
      { name: 'Recent Analyses', query: supabase.from('movie_analyses').select('created_at, analysis_type').order('created_at', { ascending: false }).limit(100) }
    ];

    const results = {};
    for (const { name, query } of queries) {
      const startTime = Date.now();
      const { data, error, count } = await query;
      const duration = Date.now() - startTime;
      
      if (error) {
        console.error(`    ❌ ${name} failed:`, error.message);
        continue;
      }
      
      results[name] = {
        duration,
        count: count || (data ? data.length : 0),
        avgResponseTime: duration
      };
      
      console.log(`    ✅ ${name}: ${duration}ms (${count || (data ? data.length : 0)} records)`);
    }

    this.performanceMetrics.dbOperations += queries.length;
    return results;
  }

  async simulateProcessingLoad(movieCount) {
    console.log('  🎯 Simulating processing load...');
    
    const batchSizes = [1, 5, 10, 25, 50];
    const results = {};
    
    for (const batchSize of batchSizes) {
      const batches = Math.ceil(movieCount / batchSize);
      const estimatedTime = batches * 30; // 30 seconds per batch
      const concurrencyFactor = Math.min(2, batchSize / 10);
      
      results[`batch_${batchSize}`] = {
        batchSize,
        totalBatches: batches,
        estimatedTimeSeconds: Math.ceil(estimatedTime / concurrencyFactor),
        concurrencyFactor,
        throughputMoviesPerMinute: (movieCount / (estimatedTime / 60)) * concurrencyFactor
      };
      
      console.log(`    📊 Batch size ${batchSize}: ${Math.ceil(estimatedTime / concurrencyFactor)}s, ${Math.round((movieCount / (estimatedTime / 60)) * concurrencyFactor)} movies/min`);
    }
    
    return results;
  }

  async executeWithMonitoring(movieIds, targetMovies) {
    console.log('\n🚀 Starting batch processing with performance monitoring...');
    
    this.performanceMetrics.startTime = Date.now();
    
    // Monitor memory usage
    const memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.performanceMetrics.memoryUsage.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
    }, 5000);

    try {
      // Process movies with performance tracking
      const results = await this.processMoviesWithTracking(movieIds);
      
      this.performanceMetrics.endTime = Date.now();
      this.performanceMetrics.totalProcessed = results.processed;
      this.performanceMetrics.successCount = results.successful;
      this.performanceMetrics.failureCount = results.failed;
      this.performanceMetrics.totalCost = results.cost;
      
      clearInterval(memoryMonitor);
      
      // Calculate performance metrics
      this.calculatePerformanceMetrics();
      
      // Print comprehensive report
      this.printPerformanceReport(this.performanceMetrics);
      
      return this.performanceMetrics;
      
    } catch (error) {
      clearInterval(memoryMonitor);
      console.error('❌ Processing failed:', error.message);
      throw error;
    }
  }

  async processMoviesWithTracking(movieIds) {
    const results = { processed: 0, successful: 0, failed: 0, cost: 0 };
    
    console.log(`\n📊 Processing ${movieIds.length} movies with real analysis generation...`);
    
    for (let i = 0; i < movieIds.length; i++) {
      const movie = movieIds[i];
      const overallStartTime = Date.now();
      
      try {
        console.log(`  ${i + 1}/${movieIds.length}: ${movie.title} (${movie.year}) [ID: ${movie.id}]`);
        
        // Real movie processing with detailed timing
        const analysisResult = await this.processMovieWithStageTracking(movie);
        
        if (analysisResult.success) {
          results.successful++;
          results.cost += analysisResult.cost || 0.015;
          
          // Track API metrics
          if (analysisResult.apiMetrics) {
            this.performanceMetrics.apiMetrics.totalTokensIn += analysisResult.apiMetrics.inputTokens || 0;
            this.performanceMetrics.apiMetrics.totalTokensOut += analysisResult.apiMetrics.outputTokens || 0;
          }
          
          const processingTime = Date.now() - overallStartTime;
          console.log(`    ✅ Completed in ${processingTime}ms (Cost: $${(analysisResult.cost || 0.015).toFixed(4)})`);
        } else {
          results.failed++;
          console.error(`    ❌ Failed: ${analysisResult.error}`);
        }
        
      } catch (error) {
        results.failed++;
        console.error(`    ❌ Processing error: ${error.message}`);
      }
      
      results.processed++;
    }
    
    return results;
  }

  async processMovieWithStageTracking(movie) {
    const stageResults = {
      success: false,
      cost: 0,
      error: null,
      apiMetrics: null,
      stages: {}
    };

    try {
      // Stage 1: Database lookup timing
      const dbLookupStart = Date.now();
      console.log(`    🔍 Stage 1: Database lookup for existing analysis...`);
      
      const existingAnalysis = await AnalysisService.getExisting(movie.id);
      const dbLookupTime = Date.now() - dbLookupStart;
      this.performanceMetrics.stageTimings.databaseLookup.push(dbLookupTime);
      stageResults.stages.databaseLookup = dbLookupTime;
      
      console.log(`    📊 Database lookup: ${dbLookupTime}ms`);
      this.performanceMetrics.dbOperations++;

      if (existingAnalysis) {
        console.log(`    ⚡ Found existing analysis - skipping generation`);
        stageResults.success = true;
        stageResults.cost = 0; // No cost for existing analysis
        return stageResults;
      }

      // Stage 2: API call timing
      const apiCallStart = Date.now();
      console.log(`    🤖 Stage 2: Generating new analysis via Claude API...`);
      
      const analysisData = await AnalysisService.generate(movie);
      const apiCallTime = Date.now() - apiCallStart;
      this.performanceMetrics.stageTimings.apiCall.push(apiCallTime);
      stageResults.stages.apiCall = apiCallTime;
      
      console.log(`    📊 API call: ${apiCallTime}ms`);

      // Stage 3: Storage verification timing
      const storageStart = Date.now();
      console.log(`    💾 Stage 3: Verifying storage success...`);
      
      const verificationResult = await this.verifyAnalysisStorage(movie.id);
      const storageTime = Date.now() - storageStart;
      this.performanceMetrics.stageTimings.storage.push(storageTime);
      stageResults.stages.storage = storageTime;
      
      console.log(`    📊 Storage verification: ${storageTime}ms`);
      this.performanceMetrics.dbOperations++;

      if (!verificationResult.success) {
        throw new Error(`Storage verification failed: ${verificationResult.error}`);
      }

      // Extract cost and API metrics from the analysis data
      stageResults.success = true;
      stageResults.cost = verificationResult.costEstimate || 0.015;
      stageResults.apiMetrics = {
        inputTokens: verificationResult.inputTokens || 0,
        outputTokens: verificationResult.outputTokens || 0
      };

      return stageResults;

    } catch (error) {
      stageResults.success = false;
      stageResults.error = error.message;
      return stageResults;
    }
  }

  async verifyAnalysisStorage(movieId) {
    try {
      const { data: analysis, error } = await supabase
        .from('movie_analyses')
        .select('claude_response, created_at')
        .eq('movie_id', movieId)
        .eq('analysis_type', 'movie_analysis')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!analysis || !analysis.claude_response) {
        return { success: false, error: 'Analysis not found or empty' };
      }

      const claudeResponse = analysis.claude_response;
      return {
        success: true,
        costEstimate: claudeResponse.cost_estimate || 0.015,
        inputTokens: claudeResponse.input_tokens || 0,
        outputTokens: claudeResponse.output_tokens || 0,
        contentLength: claudeResponse.raw_content?.length || 0,
        hasLinks: claudeResponse.has_links || false
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Method removed - now using real processing with AnalysisService

  calculatePerformanceMetrics() {
    const duration = this.performanceMetrics.endTime - this.performanceMetrics.startTime;
    this.performanceMetrics.avgProcessingTime = duration / this.performanceMetrics.totalProcessed;
    
    // Calculate throughput
    const durationMinutes = duration / (1000 * 60);
    this.performanceMetrics.throughputMoviesPerMinute = this.performanceMetrics.totalProcessed / durationMinutes;
    
    // Calculate memory efficiency
    if (this.performanceMetrics.memoryUsage.length > 0) {
      const avgMemory = this.performanceMetrics.memoryUsage.reduce((sum, usage) => sum + usage.heapUsed, 0) / this.performanceMetrics.memoryUsage.length;
      this.performanceMetrics.avgMemoryUsageMB = Math.round(avgMemory / 1024 / 1024);
    }

    // Calculate stage-specific metrics and identify bottlenecks
    this.calculateStageMetrics();
    this.identifyBottlenecks();
    
    // Calculate API efficiency metrics
    if (this.performanceMetrics.apiMetrics.totalTokensIn > 0) {
      this.performanceMetrics.apiMetrics.avgResponseTime = 
        this.performanceMetrics.stageTimings.apiCall.reduce((sum, time) => sum + time, 0) / 
        this.performanceMetrics.stageTimings.apiCall.length;
    }
  }

  calculateStageMetrics() {
    const stages = this.performanceMetrics.stageTimings;
    
    Object.keys(stages).forEach(stageName => {
      const timings = stages[stageName];
      if (timings.length > 0) {
        const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const maxTime = Math.max(...timings);
        const minTime = Math.min(...timings);
        
        stages[`${stageName}_avg`] = Math.round(avgTime);
        stages[`${stageName}_max`] = maxTime;
        stages[`${stageName}_min`] = minTime;
      }
    });
  }

  identifyBottlenecks() {
    const stages = this.performanceMetrics.stageTimings;
    const bottlenecks = [];
    
    // Check for slow database operations (>500ms)
    if (stages.databaseLookup_avg > 500) {
      bottlenecks.push({
        stage: 'database',
        avgTime: stages.databaseLookup_avg,
        issue: 'Slow database queries detected',
        recommendation: 'Consider adding indexes or optimizing queries'
      });
    }
    
    // Check for slow API calls (>5000ms)
    if (stages.apiCall_avg > 5000) {
      bottlenecks.push({
        stage: 'api',
        avgTime: stages.apiCall_avg,
        issue: 'Slow Claude API responses',
        recommendation: 'Monitor rate limits and consider smaller prompts'
      });
    }
    
    // Check for slow storage operations (>200ms)
    if (stages.storage_avg > 200) {
      bottlenecks.push({
        stage: 'storage',
        avgTime: stages.storage_avg,
        issue: 'Slow storage verification',
        recommendation: 'Optimize database write operations'
      });
    }
    
    this.performanceMetrics.bottlenecks = bottlenecks;
  }

  printPerformanceReport(metrics) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE PERFORMANCE REPORT');
    console.log('='.repeat(70));
    
    if (metrics.mode === 'monitor_only') {
      console.log('📈 Database Performance Analysis:');
      Object.entries(metrics.dbStats || {}).forEach(([name, stats]) => {
        console.log(`  • ${name}: ${stats.duration}ms (${stats.count} records)`);
      });
      
      console.log('\n🎯 Processing Load Simulation:');
      Object.entries(metrics.simulationResults || {}).forEach(([name, result]) => {
        console.log(`  • ${name}: ${result.estimatedTimeSeconds}s, ${Math.round(result.throughputMoviesPerMinute)} movies/min`);
      });
    } else {
      const duration = metrics.endTime - metrics.startTime;
      
      // Basic metrics
      console.log(`⏱️  Total Duration: ${Math.round(duration / 1000)}s`);
      console.log(`📊 Movies Processed: ${metrics.totalProcessed}`);
      console.log(`✅ Successful: ${metrics.successCount}`);
      console.log(`❌ Failed: ${metrics.failureCount}`);
      console.log(`💰 Total Cost: $${metrics.totalCost.toFixed(4)}`);
      console.log(`⚡ Avg Processing Time: ${Math.round(metrics.avgProcessingTime)}ms per movie`);
      console.log(`🚀 Throughput: ${Math.round(metrics.throughputMoviesPerMinute)} movies/minute`);
      console.log(`🗄️  Database Operations: ${metrics.dbOperations}`);
      
      if (metrics.avgMemoryUsageMB) {
        console.log(`💾 Avg Memory Usage: ${metrics.avgMemoryUsageMB}MB`);
      }
      
      console.log(`📈 Success Rate: ${Math.round((metrics.successCount / metrics.totalProcessed) * 100)}%`);

      // Stage-specific performance breakdown
      if (metrics.stageTimings) {
        console.log('\n🔍 STAGE PERFORMANCE BREAKDOWN:');
        const stages = metrics.stageTimings;
        
        if (stages.databaseLookup_avg) {
          console.log(`  🗄️  Database Lookup: ${stages.databaseLookup_avg}ms avg (${stages.databaseLookup_min}-${stages.databaseLookup_max}ms range)`);
        }
        if (stages.apiCall_avg) {
          console.log(`  🤖 Claude API Call: ${stages.apiCall_avg}ms avg (${stages.apiCall_min}-${stages.apiCall_max}ms range)`);
        }
        if (stages.storage_avg) {
          console.log(`  💾 Storage Verification: ${stages.storage_avg}ms avg (${stages.storage_min}-${stages.storage_max}ms range)`);
        }
      }

      // API metrics
      if (metrics.apiMetrics && metrics.apiMetrics.totalTokensIn > 0) {
        console.log('\n🤖 CLAUDE API METRICS:');
        console.log(`  📥 Total Input Tokens: ${metrics.apiMetrics.totalTokensIn.toLocaleString()}`);
        console.log(`  📤 Total Output Tokens: ${metrics.apiMetrics.totalTokensOut.toLocaleString()}`);
        console.log(`  ⚡ Avg API Response Time: ${Math.round(metrics.apiMetrics.avgResponseTime)}ms`);
        
        if (metrics.successCount > 0) {
          console.log(`  💰 Avg Cost per Analysis: $${(metrics.totalCost / metrics.successCount).toFixed(4)}`);
          console.log(`  📊 Avg Tokens per Analysis: ${Math.round((metrics.apiMetrics.totalTokensIn + metrics.apiMetrics.totalTokensOut) / metrics.successCount)}`);
        }
      }

      // Bottleneck analysis
      if (metrics.bottlenecks && metrics.bottlenecks.length > 0) {
        console.log('\n⚠️  PERFORMANCE BOTTLENECKS IDENTIFIED:');
        metrics.bottlenecks.forEach((bottleneck, i) => {
          console.log(`  ${i + 1}. ${bottleneck.stage.toUpperCase()} (${bottleneck.avgTime}ms avg)`);
          console.log(`     Issue: ${bottleneck.issue}`);
          console.log(`     Recommendation: ${bottleneck.recommendation}`);
        });
      } else if (metrics.stageTimings && Object.keys(metrics.stageTimings).length > 0) {
        console.log('\n✅ NO PERFORMANCE BOTTLENECKS DETECTED');
        console.log('   All processing stages performing within optimal ranges');
      }

      // Storage validation summary
      console.log('\n📦 STORAGE VALIDATION SUMMARY:');
      console.log(`  ✅ Successfully stored analyses: ${metrics.successCount}`);
      console.log(`  ❌ Storage failures: ${metrics.failureCount}`);
      if (metrics.successCount > 0) {
        console.log(`  📊 Storage success rate: ${Math.round((metrics.successCount / metrics.totalProcessed) * 100)}%`);
      }
    }
    
    console.log('='.repeat(70));
  }

  async confirmProcessing(scale) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      rl.question(`\n❓ Proceed with processing ${scale} movies? (y/N): `, answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  let scale = 1;
  let dryRun = false;
  let monitorOnly = false;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scale':
        scale = parseInt(args[++i]) || 1;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--monitor-only':
        monitorOnly = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
    }
  }
  
  const processor = new PerformanceBatchProcessor();
  
  try {
    const metrics = await processor.executeScaledProcessing(scale, { dryRun, monitorOnly });
    
    console.log('\n✅ Performance batch processing completed!');
    console.log(`📊 Processed ${metrics.totalProcessed || 0} movies`);
    
  } catch (error) {
    console.error('\n❌ Performance batch processing failed:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Performance Batch Processor

Usage:
  node scripts/performance-batch-processor.js [options]

Options:
  --scale <n>        Number of movies to process (1, 10, 100, 1000, 5000)
  --dry-run          Show what would be processed without doing it
  --monitor-only     Perform performance analysis without processing
  --help             Show this help

Examples:
  # Test with 1 movie
  node scripts/performance-batch-processor.js --scale 1
  
  # Dry run with 10 movies
  node scripts/performance-batch-processor.js --scale 10 --dry-run
  
  # Performance analysis for 100 movies
  node scripts/performance-batch-processor.js --scale 100 --monitor-only
  
  # Full processing with 1000 movies
  node scripts/performance-batch-processor.js --scale 1000
`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n❌ Interrupted by user');
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

export { PerformanceBatchProcessor };