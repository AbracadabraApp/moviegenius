// Robust migration script with restart/recovery features for unattended operation
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { generateSafePosterUpdateSQL } from './lib/poster-validation-utils.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configuration
const CONFIG = {
  batchSize: 500,
  pauseBetweenBatches: 3000, // 3 seconds
  maxRetries: 5,
  retryDelay: 10000, // 10 seconds
  saveProgressEvery: 5, // Save progress every 5 batches
  healthCheckInterval: 30000, // 30 seconds
  maxDatabaseConnections: 3,
  progressFile: 'migration-progress.json',
  logFile: 'migration.log'
};

// Supabase connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Railway connection with retry logic
const getRailwayClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    query_timeout: 30000
  });
};

// Logging utility
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };
    
    const logLine = `${timestamp} [${level}] ${message} ${Object.keys(data).length ? JSON.stringify(data) : ''}\n`;
    
    // Console output
    console.log(`[${level}] ${message}`, Object.keys(data).length ? data : '');
    
    // File output
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }

  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
  success(message, data) { this.log('SUCCESS', message, data); }
}

// Progress tracking with persistence
class ProgressTracker {
  constructor(progressFile, logger) {
    this.progressFile = progressFile;
    this.logger = logger;
    this.progress = this.loadProgress();
  }

  loadProgress() {
    try {
      if (fs.existsSync(this.progressFile)) {
        const data = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
        this.logger.info('Loaded existing progress', { 
          lastBatch: data.lastCompletedBatch,
          moviesProcessed: data.stats.movies.success 
        });
        return data;
      }
    } catch (error) {
      this.logger.warn('Failed to load progress file, starting fresh', { error: error.message });
    }

    // Default progress
    return {
      startTime: Date.now(),
      lastCompletedBatch: 0,
      lastSaveTime: Date.now(),
      stats: {
        movies: { success: 0, failed: 0, skipped: 0 },
        analyses: { success: 0, failed: 0, skipped: 0 },
        batches: { completed: 0, failed: 0 }
      },
      failures: [],
      isComplete: false
    };
  }

  saveProgress() {
    try {
      this.progress.lastSaveTime = Date.now();
      fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
      this.logger.info('Progress saved', { 
        batch: this.progress.lastCompletedBatch,
        movies: this.progress.stats.movies.success 
      });
    } catch (error) {
      this.logger.error('Failed to save progress', { error: error.message });
    }
  }

  updateBatch(batchNum, batchStats) {
    this.progress.lastCompletedBatch = batchNum;
    this.progress.stats.batches.completed = batchNum;
    
    // Update movie stats
    this.progress.stats.movies.success += batchStats.movies.success;
    this.progress.stats.movies.failed += batchStats.movies.failed;
    this.progress.stats.movies.skipped += batchStats.movies.skipped;
    
    // Update analysis stats
    this.progress.stats.analyses.success += batchStats.analyses.success;
    this.progress.stats.analyses.failed += batchStats.analyses.failed;
    this.progress.stats.analyses.skipped += batchStats.analyses.skipped;

    // Save progress periodically
    if (batchNum % CONFIG.saveProgressEvery === 0) {
      this.saveProgress();
    }
  }

  addFailure(type, item, error) {
    this.progress.failures.push({
      timestamp: Date.now(),
      type,
      item,
      error: error.message,
      batch: this.progress.lastCompletedBatch + 1
    });
    
    // Keep only last 50 failures to prevent file bloat
    if (this.progress.failures.length > 50) {
      this.progress.failures = this.progress.failures.slice(-50);
    }
  }

  markComplete() {
    this.progress.isComplete = true;
    this.progress.endTime = Date.now();
    this.saveProgress();
  }

  getStatus() {
    const elapsed = Date.now() - this.progress.startTime;
    const totalMovies = this.progress.stats.movies.success + this.progress.stats.movies.failed + this.progress.stats.movies.skipped;
    const successRate = totalMovies > 0 ? (this.progress.stats.movies.success / totalMovies * 100) : 0;

    return {
      elapsed: this.formatDuration(elapsed),
      lastBatch: this.progress.lastCompletedBatch,
      totalMovies,
      successRate: successRate.toFixed(1),
      recentFailures: this.progress.failures.slice(-5)
    };
  }

  formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }
}

// Retry wrapper with exponential backoff
async function withRetry(operation, maxRetries = CONFIG.maxRetries, logger) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

      logger.warn(`Operation failed, attempt ${attempt}/${maxRetries}`, {
        error: error.message,
        retryIn: isLastAttempt ? 'none' : `${delay}ms`
      });

      if (isLastAttempt) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Database health check
async function checkDatabaseHealth(logger) {
  try {
    const client = getRailwayClient();
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return false;
  }
}

// Migrate a single batch with full error handling
async function migrateBatchRobust(batchNum, movies, logger, progress) {
  const batchStats = {
    movies: { success: 0, failed: 0, skipped: 0 },
    analyses: { success: 0, failed: 0, skipped: 0 }
  };

  logger.info(`Starting batch ${batchNum}`, { movieCount: movies.length });

  const railwayClient = getRailwayClient();
  await railwayClient.connect();

  try {
    for (const [index, movie] of movies.entries()) {
      try {
        // Insert movie with comprehensive error handling
        const movieQuery = `
          INSERT INTO movies (
            tmdb_id, title, year, official_title, release_date, slug, 
            poster_url, streaming_data, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (tmdb_id) DO UPDATE SET
            title = EXCLUDED.title,
            year = EXCLUDED.year,
            official_title = EXCLUDED.official_title,
            release_date = EXCLUDED.release_date,
            slug = EXCLUDED.slug,
            poster_url = ${generateSafePosterUpdateSQL()},
            streaming_data = EXCLUDED.streaming_data,
            updated_at = NOW()
          RETURNING id;
        `;

        const movieValues = [
          movie.tmdb_id,
          movie.title,
          movie.year,
          movie.official_title,
          movie.release_date,
          movie.slug,
          movie.poster_url,
          movie.streaming_data,
          movie.created_at || new Date(),
          new Date()
        ];

        const movieResult = await railwayClient.query(movieQuery, movieValues);
        const railwayMovieId = movieResult.rows[0].id;
        
        batchStats.movies.success++;

        // Migrate analyses for this movie
        try {
          const { data: analyses, error: analysisError } = await supabase
            .from('movie_analyses')
            .select('*')
            .eq('movie_id', movie.id)
            .order('created_at', { ascending: false });

          if (analysisError) {
            logger.warn(`Failed to fetch analyses for ${movie.title}`, { error: analysisError.message });
            continue;
          }

          if (analyses && analyses.length > 0) {
            for (const analysis of analyses) {
              try {
                const analysisQuery = `
                  INSERT INTO movie_analyses (
                    movie_id, query_text, claude_response, analysis_type, 
                    people_extracted, has_links, link_count, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                  RETURNING id;
                `;

                const analysisValues = [
                  railwayMovieId,
                  analysis.query_text,
                  analysis.claude_response,
                  analysis.analysis_type || 'general',
                  analysis.people_extracted || false,
                  analysis.has_links || false,
                  analysis.link_count || 0,
                  analysis.created_at || new Date()
                ];

                await railwayClient.query(analysisQuery, analysisValues);
                batchStats.analyses.success++;
              } catch (error) {
                logger.warn(`Analysis migration failed for ${movie.title}`, { error: error.message });
                progress.addFailure('analysis', movie.title, error);
                batchStats.analyses.failed++;
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to process analyses for ${movie.title}`, { error: error.message });
        }

        // Progress indicator within batch
        if ((index + 1) % 50 === 0) {
          logger.info(`Batch ${batchNum} progress`, { 
            completed: index + 1, 
            total: movies.length,
            percentage: Math.round(((index + 1) / movies.length) * 100)
          });
        }

      } catch (error) {
        logger.warn(`Movie migration failed: ${movie.title}`, { error: error.message });
        progress.addFailure('movie', movie.title, error);
        batchStats.movies.failed++;
      }
    }

    logger.success(`Batch ${batchNum} completed`, batchStats);
    return batchStats;

  } finally {
    await railwayClient.end();
  }
}

// Main migration function with full restart capability
async function robustMigration(options = {}) {
  const { 
    resumeFromBatch = null,
    testMode = false,
    maxMovies = null 
  } = options;

  const logger = new Logger(CONFIG.logFile);
  const progress = new ProgressTracker(CONFIG.progressFile, logger);

  logger.info('🚀 Starting robust migration', { 
    resumeFrom: resumeFromBatch || progress.progress.lastCompletedBatch + 1,
    testMode,
    maxMovies 
  });

  // Check if migration was already completed
  if (progress.progress.isComplete) {
    logger.info('Migration already completed', progress.getStatus());
    return progress.progress;
  }

  try {
    // Health check
    logger.info('Performing initial health check...');
    const isHealthy = await checkDatabaseHealth(logger);
    if (!isHealthy) {
      throw new Error('Database health check failed - cannot proceed');
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    const effectiveMax = maxMovies ? Math.min(maxMovies, totalCount) : totalCount;
    const totalBatches = Math.ceil(effectiveMax / CONFIG.batchSize);
    const startBatch = resumeFromBatch || progress.progress.lastCompletedBatch + 1;

    logger.info('Migration plan', { 
      totalMovies: effectiveMax,
      totalBatches,
      startBatch,
      batchSize: CONFIG.batchSize
    });

    // Process batches with full error recovery
    for (let batchNum = startBatch; batchNum <= totalBatches; batchNum++) {
      const offset = (batchNum - 1) * CONFIG.batchSize;
      const limit = Math.min(CONFIG.batchSize, effectiveMax - offset);

      logger.info(`Processing batch ${batchNum}/${totalBatches}`, { offset, limit });

      try {
        // Fetch batch with retry
        const { data: movies, error } = await withRetry(async () => {
          const result = await supabase
            .from('movies')
            .select('*')
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: true });
          
          if (result.error) throw new Error(result.error.message);
          return result;
        }, CONFIG.maxRetries, logger);

        if (!movies || movies.length === 0) {
          logger.warn(`Batch ${batchNum} returned no movies, stopping`);
          break;
        }

        // Migrate batch with retry
        const batchStats = await withRetry(async () => {
          return await migrateBatchRobust(batchNum, movies, logger, progress);
        }, CONFIG.maxRetries, logger);

        // Update progress
        progress.updateBatch(batchNum, batchStats);

        // Status report
        const status = progress.getStatus();
        logger.info(`Batch ${batchNum} summary`, {
          moviesTotal: status.totalMovies,
          successRate: status.successRate + '%',
          elapsed: status.elapsed
        });

        // Pause between batches (except for last batch)
        if (batchNum < totalBatches) {
          logger.info(`Pausing ${CONFIG.pauseBetweenBatches}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.pauseBetweenBatches));
        }

      } catch (error) {
        logger.error(`Batch ${batchNum} failed after all retries`, { error: error.message });
        progress.progress.stats.batches.failed++;
        
        // Save progress and continue with next batch
        progress.saveProgress();
        continue;
      }
    }

    // Mark migration as complete
    progress.markComplete();
    
    const finalStatus = progress.getStatus();
    logger.success('🎉 Migration completed successfully!', finalStatus);
    
    return progress.progress;

  } catch (error) {
    logger.error('💥 Migration failed with unrecoverable error', { error: error.message });
    progress.saveProgress();
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const resumeArg = args.find(arg => arg.startsWith('--resume='));
  const maxMoviesArg = args.find(arg => arg.startsWith('--max-movies='));
  
  const options = {
    testMode,
    resumeFromBatch: resumeArg ? parseInt(resumeArg.split('=')[1]) : null,
    maxMovies: maxMoviesArg ? parseInt(maxMoviesArg.split('=')[1]) : null
  };

  // Handle process signals for graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT - Migration will stop gracefully after current batch...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM - Migration will stop gracefully after current batch...');
    process.exit(0);
  });

  robustMigration(options).catch(error => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
}

export { robustMigration };