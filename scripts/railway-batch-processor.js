#!/usr/bin/env node

/**
 * Railway Movie Analysis Batch Processor
 *
 * Generates movie analyses for movies without existing analyses in Railway database
 * Uses MOVIE_ANALYSIS context to create contextual analyses with dynamic subheads
 *
 * Usage:
 *   node scripts/railway-batch-processor.js --test 10
 *   node scripts/railway-batch-processor.js --production
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';
import { buildPrompt } from '../lib/prompts/builder.js';
import { Pool } from 'pg';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuration
const CONFIG = {
  PROGRESS_FILE: './railway-batch-progress.json',
  LOG_FILE: './railway-batch.log',
  BATCH_SIZE: 50,
  CONCURRENT_REQUESTS: 5,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
};

// Simple logging helper
class Logger {
  static log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    // Also write to log file
    try {
      const fs = require('fs');
      fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
    } catch (error) {
      // Silent fail for logging
    }
  }

  static success(index, total, title, tmdbId, cost) {
    this.log(`${index}/${total} ✅ ${title} (TMDB ${tmdbId}) - $${cost.toFixed(4)}`);
  }

  static error(index, total, title, tmdbId, error) {
    this.log(`${index}/${total} ❌ ${title} (TMDB ${tmdbId}) - ERROR: ${error}`);
  }
}

// Progress tracking
class ProgressTracker {
  constructor(progressFile) {
    this.progressFile = progressFile;
    this.data = this.load();
  }

  load() {
    try {
      if (existsSync(this.progressFile)) {
        const data = JSON.parse(readFileSync(this.progressFile, 'utf8'));
        return {
          processed: new Set(data.processedIds || []),
          failed: new Set(data.failedIds || []),
          totalCost: data.totalCost || 0,
          startTime: data.startTime || new Date().toISOString(),
          errors: data.errors || [],
          ...data
        };
      }
    } catch (error) {
      Logger.log(`⚠️ Could not load progress file: ${error.message}`);
    }

    return {
      processed: new Set(),
      failed: new Set(),
      totalCost: 0,
      startTime: new Date().toISOString(),
      errors: [],
    };
  }

  save() {
    try {
      const saveData = {
        processedIds: Array.from(this.data.processed),
        failedIds: Array.from(this.data.failed),
        totalCost: this.data.totalCost,
        startTime: this.data.startTime,
        lastUpdate: new Date().toISOString(),
        totalProcessed: this.data.processed.size,
        totalFailed: this.data.failed.size,
        errors: this.data.errors || [],
      };

      writeFileSync(this.progressFile, JSON.stringify(saveData, null, 2));
    } catch (error) {
      Logger.log(`⚠️ Could not save progress: ${error.message}`);
    }
  }

  markProcessed(movieId, cost) {
    this.data.processed.add(movieId);
    this.data.failed.delete(movieId);
    this.data.totalCost += cost;
    this.save();
  }

  markFailed(movieId, error, movieTitle) {
    this.data.failed.add(movieId);
    this.data.processed.delete(movieId);
    this.data.errors.push({
      movieId,
      movieTitle,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  getStats() {
    return {
      processed: this.data.processed.size,
      failed: this.data.failed.size,
      totalCost: this.data.totalCost,
      startTime: this.data.startTime,
    };
  }
}

// Movie analysis generator
class MovieAnalysisGenerator {
  constructor() {
    this.progress = new ProgressTracker(CONFIG.PROGRESS_FILE);
  }

  async getMoviesNeedingAnalysis(limit = null) {
    const client = await pool.connect();

    try {
      Logger.log('📋 Loading movies needing analysis...');

      const query = `
        SELECT m.id, m.title, m.year, m.tmdb_id
        FROM movies m
        LEFT JOIN movie_analyses ma ON m.id = ma.movie_id AND ma.analysis_type = 'contextual'
        WHERE ma.id IS NULL
        AND m.title IS NOT NULL
        AND m.year IS NOT NULL
        ORDER BY m.id
        ${limit ? `LIMIT ${limit}` : ''}
      `;

      const result = await client.query(query);
      const unprocessedMovies = result.rows.filter(movie => !this.progress.data.processed.has(movie.id));

      Logger.log(`📊 Found ${result.rows.length} total movies needing analysis`);
      Logger.log(`📊 Already processed: ${this.progress.data.processed.size}`);
      Logger.log(`📊 Remaining to process: ${unprocessedMovies.length}`);

      return unprocessedMovies;
    } catch (error) {
      Logger.log(`❌ Error loading movies: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async generateAnalysis(movie) {
    try {
      const prompt = buildPrompt('MOVIE_ANALYSIS');
      const userMessage = `${movie.title} (${movie.year})`;

      Logger.log(`🎬 Generating analysis for: ${movie.title} (${movie.year})`);

      const startTime = Date.now();
      const response = await anthropic.messages.create({
        ...prompt,
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: userMessage,
            cache_control: { type: 'ephemeral' }
          }]
        }],
      });

      const processingTime = Date.now() - startTime;
      const responseText = response.content[0].text;

      // Parse the JSON response
      let analysisData;
      try {
        analysisData = JSON.parse(responseText);
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Failed to parse JSON response: ${parseError.message}`);
        }
      }

      // Calculate cost (approximate)
      const inputTokens = response.usage.input_tokens || 0;
      const outputTokens = response.usage.output_tokens || 0;
      const cost = (inputTokens * 0.000003) + (outputTokens * 0.000015);

      // Save to database
      await this.saveAnalysis(movie.id, {
        raw_content: JSON.stringify(analysisData),
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        processing_time_ms: processingTime,
        cost: cost,
      });

      this.progress.markProcessed(movie.id, cost);

      return {
        success: true,
        cost,
        analysisData,
      };

    } catch (error) {
      Logger.log(`❌ Analysis failed for ${movie.title}: ${error.message}`);
      this.progress.markFailed(movie.id, error, movie.title);
      throw error;
    }
  }

  async saveAnalysis(movieId, analysisData) {
    const client = await pool.connect();

    try {
      const query = `
        INSERT INTO movie_analyses (movie_id, query_text, claude_response, analysis_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (movie_id, analysis_type)
        DO UPDATE SET
          claude_response = EXCLUDED.claude_response,
          updated_at = NOW()
      `;

      const queryText = `Generate contextual analysis for movie`;
      const analysisType = 'contextual';

      await client.query(query, [movieId, queryText, analysisData, analysisType]);

    } catch (error) {
      Logger.log(`❌ Database save failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async processMovies(movies, batchSize = 5) {
    Logger.log(`🚀 Starting analysis generation for ${movies.length} movies`);
    Logger.log(`📋 Processing in batches of ${batchSize} with parallel execution`);

    const results = [];
    let totalProcessed = 0;
    let totalFailed = 0;

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(movies.length/batchSize);

      Logger.log(`\n🔄 Processing batch ${batchNum}/${totalBatches}`);
      Logger.log(`   Movies ${i + 1}-${Math.min(i + batchSize, movies.length)} of ${movies.length}`);

      // Process batch in parallel
      const batchPromises = batch.map(movie =>
        this.generateAnalysis(movie).catch(error => ({
          success: false,
          movie: movie,
          error: error.message || error
        }))
      );

      const batchResults = await Promise.all(batchPromises);

      // Process results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const movie = batch[j];
        const overallIndex = i + j + 1;

        if (result.success) {
          Logger.success(overallIndex, movies.length, movie.title, movie.tmdb_id, result.cost);
          totalProcessed++;
        } else {
          Logger.error(overallIndex, movies.length, movie.title, movie.tmdb_id, result.error);
          totalFailed++;
        }
      }

      results.push(...batchResults);

      // Progress update after each batch
      const stats = this.progress.getStats();
      Logger.log(`📊 Batch ${batchNum} complete | Success: ${totalProcessed} | Failed: ${totalFailed} | Cost: $${stats.totalCost.toFixed(4)}`);

      // Rate limiting - wait between batches
      if (i + batchSize < movies.length) {
        Logger.log('   ⏳ Rate limiting delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const finalStats = this.progress.getStats();
    Logger.log(`\n🎉 BATCH COMPLETE`);
    Logger.log(`📊 Final Stats: Processed: ${totalProcessed} | Failed: ${totalFailed} | Total Cost: $${finalStats.totalCost.toFixed(4)}`);

    return { processed: totalProcessed, failed: totalFailed, totalCost: finalStats.totalCost };
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const testLimit = isTest ? parseInt(args[args.indexOf('--test') + 1]) || 5 : null;

  Logger.log('🚂 Railway Movie Analysis Batch Processor Starting...');
  Logger.log(`Mode: ${isTest ? `TEST (${testLimit} movies)` : 'PRODUCTION'}`);

  const generator = new MovieAnalysisGenerator();

  try {
    const movies = await generator.getMoviesNeedingAnalysis(testLimit);

    if (movies.length === 0) {
      Logger.log('✨ No movies need analysis. All caught up!');
      process.exit(0);
    }

    const results = await generator.processMovies(movies);

    Logger.log('✅ Batch processing completed successfully');
    process.exit(0);

  } catch (error) {
    Logger.log(`💥 Batch processing failed: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.log('⚠️ Received SIGINT, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.log('⚠️ Received SIGTERM, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}