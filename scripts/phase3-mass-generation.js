#!/usr/bin/env node

/**
 * Phase 3: Mass Enhanced Static File Generation
 *
 * Batch processes ~19,000 movies to generate enhanced static JSON files
 * for lightning-fast static serving with <100ms load times.
 */

import { assembleEnhancedMovieData, closePool } from '../lib/enhanced-assembly.js';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __scriptDir = path.dirname(__filename);

// Configuration
const BATCH_SIZE = 50; // Process movies in batches
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data', 'enhanced-movies');
const LOG_FILE = path.join(__scriptDir, 'phase3-generation.log');
const PROGRESS_FILE = path.join(__scriptDir, 'phase3-progress.json');

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Limit concurrent connections
});

/**
 * Log message to both console and file
 */
async function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;

  console.log(logLine);

  try {
    await fs.appendFile(LOG_FILE, logLine + '\n');
  } catch (error) {
    console.warn('Failed to write to log file:', error.message);
  }
}

/**
 * Save progress to file for resume capability
 */
async function saveProgress(progress) {
  try {
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.warn('Failed to save progress:', error.message);
  }
}

/**
 * Load progress from file
 */
async function loadProgress() {
  try {
    const progressData = await fs.readFile(PROGRESS_FILE, 'utf8');
    return JSON.parse(progressData);
  } catch (error) {
    return {
      processedMovies: [],
      totalProcessed: 0,
      totalSuccess: 0,
      totalErrors: 0,
      startTime: new Date().toISOString()
    };
  }
}

/**
 * Get movies ready for generation that haven't been processed yet
 */
async function getMoviesForGeneration(processedMovies = []) {
  const client = await pool.connect();

  try {
    await log('Fetching movies ready for enhanced static generation...');

    const placeholders = processedMovies.length > 0
      ? `AND m.tmdb_id NOT IN (${processedMovies.map((_, i) => `$${i + 1}`).join(',')})`
      : '';

    const query = `
      SELECT
        m.tmdb_id,
        m.title,
        m.year
      FROM movies m
      JOIN movie_analyses ma ON m.id = ma.movie_id
        AND ma.analysis_type = 'general'
        AND ma.enhanced_format = true
        AND ma.enhanced_sections IS NOT NULL
      JOIN enhanced_why_watch eww ON eww.tmdb_id = m.tmdb_id
      JOIN more_ideas mi ON mi.tmdb_id = m.tmdb_id
      WHERE 1=1 ${placeholders}
      ORDER BY m.tmdb_id
    `;

    const result = await client.query(query, processedMovies);

    await log(`Found ${result.rows.length} movies ready for generation`);
    return result.rows;

  } finally {
    client.release();
  }
}

/**
 * Generate enhanced static file for a single movie
 */
async function generateMovieFile(movie) {
  try {
    // Generate enhanced data
    const enhancedData = await assembleEnhancedMovieData(movie.tmdb_id, pool);

    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Write static file
    const filename = `movie-${movie.tmdb_id}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(enhancedData, null, 2));

    // Verify file was written correctly
    const fileStats = await fs.stat(filepath);
    const fileSize = fileStats.size;

    return {
      success: true,
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      filename,
      fileSize,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      filename: null,
      fileSize: 0,
      error: error.message
    };
  }
}

/**
 * Process a batch of movies
 */
async function processBatch(movies, batchIndex, totalBatches) {
  await log(`Processing batch ${batchIndex + 1}/${totalBatches} (${movies.length} movies)`);

  const results = [];

  for (const movie of movies) {
    const startTime = Date.now();
    const result = await generateMovieFile(movie);
    const duration = Date.now() - startTime;

    if (result.success) {
      await log(`✅ ${result.title} (${result.year}) - ${result.filename} (${result.fileSize} bytes, ${duration}ms)`);
    } else {
      await log(`❌ ${result.title} (${result.year}) - ERROR: ${result.error}`);
    }

    results.push({ ...result, duration });
  }

  return results;
}

/**
 * Main mass generation function
 */
async function massGeneration(options = {}) {
  const startTime = Date.now();

  try {
    await log('🚀 Phase 3: Mass Enhanced Static Generation Started');

    // Load existing progress
    let progress = await loadProgress();
    await log(`Resuming from: ${progress.totalProcessed} processed, ${progress.totalSuccess} successful, ${progress.totalErrors} errors`);

    // Get movies to process
    const movies = await getMoviesForGeneration(progress.processedMovies);

    if (movies.length === 0) {
      await log('✅ No movies to process - generation complete!');
      return progress;
    }

    // Process in batches
    const batches = [];
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      batches.push(movies.slice(i, i + BATCH_SIZE));
    }

    await log(`Processing ${movies.length} movies in ${batches.length} batches of ${BATCH_SIZE}`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const results = await processBatch(batch, i, batches.length);

      // Update progress
      for (const result of results) {
        progress.processedMovies.push(result.tmdbId);
        progress.totalProcessed++;

        if (result.success) {
          progress.totalSuccess++;
        } else {
          progress.totalErrors++;
        }
      }

      // Save progress after each batch
      await saveProgress(progress);

      // Log batch summary
      const batchSuccess = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      await log(`Batch ${i + 1} complete: ${batchSuccess} success, ${batchErrors} errors, ${avgDuration.toFixed(0)}ms avg`);

      // Short pause between batches to prevent overwhelming the database
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final summary
    const totalDuration = Date.now() - startTime;
    const successRate = (progress.totalSuccess / progress.totalProcessed * 100).toFixed(1);

    await log('🎉 Mass generation completed!');
    await log(`📊 Final Statistics:`);
    await log(`   - Total processed: ${progress.totalProcessed}`);
    await log(`   - Successful: ${progress.totalSuccess} (${successRate}%)`);
    await log(`   - Errors: ${progress.totalErrors}`);
    await log(`   - Total duration: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
    await log(`   - Average per movie: ${(totalDuration / progress.totalProcessed).toFixed(0)}ms`);

    return progress;

  } catch (error) {
    await log(`❌ Mass generation failed: ${error.message}`);
    throw error;
  } finally {
    await closePool();
  }
}

/**
 * Command line interface
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');

  if (dryRun) {
    console.log('🔍 Dry run mode - analyzing scope only');

    // Just analyze what would be generated
    (async () => {
      try {
        const progress = await loadProgress();
        const movies = await getMoviesForGeneration(progress.processedMovies);

        console.log(`Would process ${movies.length} movies`);
        console.log(`Estimated completion time: ${(movies.length * 2 / 60).toFixed(1)} minutes`);
        console.log(`Estimated storage space: ${(movies.length * 50 / 1024).toFixed(1)} MB`);

        await closePool();
      } catch (error) {
        console.error('Dry run error:', error);
        process.exit(1);
      }
    })();
  } else {
    // Run actual generation
    massGeneration({ resume }).catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
}

export { massGeneration };