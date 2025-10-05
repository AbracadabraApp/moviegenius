#!/usr/bin/env node

/**
 * Fast Why Watch Batch Generation for High-Quality Enhanced Analyses
 *
 * Processes the 120 new high-quality enhanced analyses from enhanced_analyses table
 * - Uses Haiku 3.5 for speed and cost efficiency
 * - 10-second timeout per request
 * - Comprehensive cost and performance tracking
 * - Prompt caching enabled
 * - Targets new enhanced analyses only
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildWhyWatchPrompt, validateWhyWatchResponse } from '../lib/prompts/why-watch-generator.js';
import fs from 'fs/promises';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Model configurations and pricing (per 1M tokens)
const MODELS = {
  'haiku': {
    name: 'claude-3-5-haiku-20241022',
    displayName: 'Haiku 3.5',
    pricing: {
      input: 0.25,
      output: 1.25,
      cacheWrite: 0.30,
      cacheRead: 0.03
    },
    maxTokens: 300,
    timeout: 10000,
    speed: 'fastest',
    quality: 'good'
  },
  'sonnet': {
    name: 'claude-3-5-sonnet-20241022',
    displayName: 'Sonnet 3.5',
    pricing: {
      input: 3.00,
      output: 15.00,
      cacheWrite: 3.60,
      cacheRead: 0.36
    },
    maxTokens: 1000,
    timeout: 20000,
    speed: 'slower',
    quality: 'excellent'
  }
};

// Default model (can be overridden via command line)
const DEFAULT_MODEL = process.argv.includes('--sonnet') ? 'sonnet' : 'haiku';
const selectedModel = MODELS[DEFAULT_MODEL];

console.log(`🤖 Selected model: ${selectedModel.displayName}`);
console.log(`💰 Cost: $${selectedModel.pricing.input}/$${selectedModel.pricing.output} per 1M tokens`);
console.log(`⚡ Speed: ${selectedModel.speed} | Quality: ${selectedModel.quality}\n`);

// Progress tracking
const PROGRESS_FILE = 'why-watch-haiku-progress.json';
const RESULTS_FILE = 'why-watch-haiku-results.json';

/**
 * Load existing progress or create new progress tracker
 */
async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {
      startTime: new Date().toISOString(),
      processed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheWrites: 0,
      cacheReads: 0,
      avgProcessingTime: 0,
      lastProcessedId: null,
      processedIds: new Set(),
      errors: [],
      yesCount: 0,
      noCount: 0
    };
  }
}

/**
 * Save progress to disk
 */
async function saveProgress(progress) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify({
    ...progress,
    processedIds: Array.from(progress.processedIds)
  }, null, 2));
}

/**
 * Get new high-quality enhanced analyses that need Why Watch processing
 */
async function getNewMoviesForProcessing(progress) {
  const client = await pool.connect();

  try {
    // Get movies from enhanced_analyses table that don't have Why Watch data yet
    const query = `
      SELECT
        ma.id as analysis_id,
        ma.movie_id,
        ea.sections as claude_response,
        m.title,
        m.year,
        m.tmdb_id
      FROM enhanced_analyses ea
      JOIN movies m ON m.tmdb_id = ea.tmdb_id
      JOIN movie_analyses ma ON ma.movie_id = m.id
      WHERE ma.enhanced_format = true
        AND NOT EXISTS (
          SELECT 1 FROM enhanced_why_watch eww
          WHERE eww.tmdb_id = ea.tmdb_id
        )
      ORDER BY ea.created_at DESC
    `;

    const result = await pool.query(query);

    // Filter out already processed movies
    const processedIds = new Set(progress.processedIds || []);
    const unprocessedMovies = result.rows.filter(movie =>
      !processedIds.has(movie.analysis_id)
    );

    console.log(`📊 Found ${result.rows.length} new high-quality enhanced analyses`);
    console.log(`📊 Already processed: ${processedIds.size}`);
    console.log(`📊 Remaining to process: ${unprocessedMovies.length}`);

    return unprocessedMovies;

  } finally {
    client.release();
  }
}

/**
 * Generate Why Watch recommendation using Haiku 3.5
 */
async function generateWhyWatchHaiku(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;

  try {
    // Extract existing analysis for context
    const existingAnalysis = typeof movie.claude_response === 'string'
      ? JSON.parse(movie.claude_response)
      : movie.claude_response;

    const movieData = {
      title: movie.title,
      year: movie.year,
      tmdb_id: movie.tmdb_id,
      genre: existingAnalysis.keyElements?.genre || 'Unknown',
      director: existingAnalysis.keyElements?.director || 'Unknown'
    };

    const prompt = buildWhyWatchPrompt(movieTitle, movieData);

    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: selectedModel.name,
      max_tokens: selectedModel.maxTokens,
      temperature: 0.7,
      system: [{
        type: "text",
        text: prompt,
        cache_control: { type: "ephemeral" }
      }],
      messages: [
        {
          role: 'user',
          content: `Generate Why Watch recommendation for: ${movieTitle}

Movie Data: ${JSON.stringify(movieData, null, 2)}

Analysis Context: ${JSON.stringify(existingAnalysis).substring(0, 1000)}...

Respond with ONLY the JSON structure specified in the prompt.`
        }
      ]
    });

    const processingTime = Date.now() - startTime;
    const rawResponse = message.content[0].text;

    // Calculate costs
    const inputTokens = message.usage?.input_tokens || 0;
    const outputTokens = message.usage?.output_tokens || 0;
    const cacheWrites = message.usage?.cache_creation_input_tokens || 0;
    const cacheReads = message.usage?.cache_read_input_tokens || 0;

    const cost = (
      (inputTokens * selectedModel.pricing.input / 1000000) +
      (outputTokens * selectedModel.pricing.output / 1000000) +
      (cacheWrites * selectedModel.pricing.cacheWrite / 1000000) +
      (cacheReads * selectedModel.pricing.cacheRead / 1000000)
    );

    // Parse and validate JSON response
    let response;
    try {
      response = JSON.parse(rawResponse);
    } catch (parseError) {
      throw new Error(`JSON Parse Error: ${parseError.message}`);
    }

    // Validate response format
    const validation = validateWhyWatchResponse(response);

    return {
      success: true,
      movie: movieTitle,
      analysisId: movie.analysis_id,
      movieId: movie.movie_id,
      tmdbId: movie.tmdb_id,
      whyWatch: response.whyWatch,
      metadata: {
        processingTime,
        inputTokens,
        outputTokens,
        cacheWrites,
        cacheReads,
        cost,
        model: selectedModel.name
      },
      validation,
      rawResponse: validation.valid ? null : rawResponse.substring(0, 500)
    };

  } catch (error) {
    return {
      success: false,
      movie: movieTitle,
      analysisId: movie.analysis_id,
      movieId: movie.movie_id,
      tmdbId: movie.tmdb_id,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Save Why Watch result to enhanced_why_watch table
 */
async function saveWhyWatchResult(result) {
  if (!result.success) return false;

  const client = await pool.connect();

  try {
    const query = `
      INSERT INTO enhanced_why_watch (
        analysis_id,
        movie_id,
        tmdb_id,
        recommendation,
        reasons,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (analysis_id)
      DO UPDATE SET
        recommendation = EXCLUDED.recommendation,
        reasons = EXCLUDED.reasons,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;

    await client.query(query, [
      result.analysisId,
      result.movieId,
      result.tmdbId,
      result.whyWatch.recommendation,
      JSON.stringify(result.whyWatch.reasons),
      JSON.stringify(result.metadata)
    ]);

    return true;

  } catch (error) {
    console.error(`❌ Database save error for ${result.movie}:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Process movies in batches with parallel processing
 */
async function processBatch(movies, progress, batchSize = 10) {
  const results = [];
  let totalProcessingTime = 0;

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const batchStart = Date.now();

    console.log(`\n🚀 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(movies.length/batchSize)}`);
    console.log(`   Movies ${i + 1}-${Math.min(i + batchSize, movies.length)} of ${movies.length}`);

    // Process batch in parallel
    const batchPromises = batch.map(movie => generateWhyWatchHaiku(movie));
    const batchResults = await Promise.all(batchPromises);

    // Process results
    for (const result of batchResults) {
      if (result.success) {
        const saved = await saveWhyWatchResult(result);
        if (saved) {
          progress.successful++;
          progress.inputTokens += result.metadata.inputTokens;
          progress.outputTokens += result.metadata.outputTokens;
          progress.cacheWrites += result.metadata.cacheWrites;
          progress.cacheReads += result.metadata.cacheReads;
          progress.totalCost += result.metadata.cost;

          if (result.whyWatch.recommendation === 'YES') {
            progress.yesCount++;
          } else {
            progress.noCount++;
          }

          console.log(`✅ ${result.whyWatch.recommendation}: ${result.movie}`);
          console.log(`   ${result.whyWatch.reasons.join(' | ')}`);
          console.log(`   Cost: $${result.metadata.cost.toFixed(4)} | Time: ${result.metadata.processingTime}ms`);

          if (result.metadata.cacheReads > 0) {
            console.log(`   🚀 Cache hits: ${result.metadata.cacheReads} tokens`);
          }
        } else {
          progress.failed++;
          console.log(`❌ DB Save Failed: ${result.movie}`);
        }
      } else {
        progress.failed++;
        progress.errors.push({
          movie: result.movie,
          error: result.error,
          timestamp: result.timestamp
        });
        console.log(`❌ Generation Failed: ${result.movie} - ${result.error}`);
      }

      progress.processed++;
      progress.processedIds.add(result.analysisId);
      totalProcessingTime += result.metadata?.processingTime || 0;
    }

    const batchTime = Date.now() - batchStart;
    progress.avgProcessingTime = totalProcessingTime / progress.processed;

    // Progress stats
    const elapsed = Math.round((Date.now() - new Date(progress.startTime).getTime()) / 1000);
    const remaining = movies.length - (i + batchSize);
    const estimatedRemaining = Math.round(remaining * (progress.avgProcessingTime / 1000) * 1.5); // Add buffer
    const yesPercent = ((progress.yesCount / progress.successful) * 100).toFixed(1);

    console.log(`\n📊 Batch ${Math.floor(i/batchSize) + 1} complete (${batchTime}ms)`);
    console.log(`✅ Success: ${progress.successful} | ❌ Errors: ${progress.failed}`);
    console.log(`💰 Total cost: $${progress.totalCost.toFixed(4)} | Avg: $${(progress.totalCost / progress.successful).toFixed(4)}`);
    console.log(`📈 YES: ${progress.yesCount} (${yesPercent}%) | NO: ${progress.noCount}`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Estimated remaining: ${estimatedRemaining}s`);
    console.log(`🎯 Tokens: ${progress.inputTokens + progress.outputTokens} | Cache reads: ${progress.cacheReads}`);

    results.push(...batchResults);

    // Save progress after each batch
    await saveProgress(progress);

    // Brief pause between batches
    if (i + batchSize < movies.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Main execution function
 */
async function main() {
  console.log(`🚀 Fast Why Watch Generation - ${selectedModel.displayName}`);
  console.log('===============================================');
  console.log('🎯 Target: 120 new high-quality enhanced analyses');
  console.log(`⚡ Model: ${selectedModel.displayName} (${selectedModel.timeout/1000}s timeout)`);

  // Calculate estimated cost for 120 movies
  const avgTokensPerMovie = 1500; // Conservative estimate
  const estimatedCost = (avgTokensPerMovie * selectedModel.pricing.input / 1000000) * 120;
  console.log(`💰 Est. cost: $${estimatedCost.toFixed(2)}-$${(estimatedCost * 2).toFixed(2)} (${selectedModel.displayName})`);

  if (DEFAULT_MODEL === 'haiku') {
    const sonnetCost = (avgTokensPerMovie * MODELS.sonnet.pricing.input / 1000000) * 120;
    console.log(`💸 Sonnet would cost: $${sonnetCost.toFixed(2)}-$${(sonnetCost * 2).toFixed(2)} (~${Math.round(sonnetCost/estimatedCost)}x more)`);
  }
  console.log('');

  try {
    // Load progress
    let progress = await loadProgress();
    progress.processedIds = new Set(progress.processedIds || []);

    // Get movies to process
    const movies = await getNewMoviesForProcessing(progress);

    if (movies.length === 0) {
      console.log('🎉 All new movies already processed!');

      // Show final stats
      const finalCount = await pool.query('SELECT COUNT(*) FROM enhanced_why_watch');
      console.log(`🗄️  Enhanced Why Watch records: ${finalCount.rows[0].count}`);
      return;
    }

    // Process all movies
    const startTime = Date.now();
    const results = await processBatch(movies, progress);
    const totalTime = Date.now() - startTime;

    // Final summary
    console.log('\n🎉 BATCH GENERATION COMPLETE!');
    console.log('=============================');
    console.log(`Total Processed: ${progress.processed}`);
    console.log(`Successful: ${progress.successful}`);
    console.log(`Failed: ${progress.failed}`);
    console.log(`Total Cost: $${progress.totalCost.toFixed(4)}`);
    console.log(`Average Cost: $${(progress.totalCost / progress.successful).toFixed(4)} per movie`);
    console.log(`Processing Time: ${Math.round(totalTime / 60000)} minutes`);
    console.log(`Average Time: ${Math.round(progress.avgProcessingTime)}ms per movie`);

    // Recommendation distribution
    const yesPercent = ((progress.yesCount / progress.successful) * 100).toFixed(1);
    const noPercent = ((progress.noCount / progress.successful) * 100).toFixed(1);
    console.log(`\n📈 Recommendations:`);
    console.log(`   YES: ${progress.yesCount} movies (${yesPercent}%)`);
    console.log(`   NO: ${progress.noCount} movies (${noPercent}%)`);

    // Token usage and caching efficiency
    console.log(`\n🎯 Token Usage:`);
    console.log(`   Input: ${progress.inputTokens.toLocaleString()}`);
    console.log(`   Output: ${progress.outputTokens.toLocaleString()}`);
    console.log(`   Cache writes: ${progress.cacheWrites.toLocaleString()}`);
    console.log(`   Cache reads: ${progress.cacheReads.toLocaleString()}`);

    if (progress.cacheReads > 0) {
      const cacheEfficiency = ((progress.cacheReads / (progress.inputTokens + progress.cacheReads)) * 100).toFixed(1);
      console.log(`   Cache efficiency: ${cacheEfficiency}%`);
    }

    // Final database count
    const finalCount = await pool.query('SELECT COUNT(*) FROM enhanced_why_watch');
    console.log(`\n🗄️  Enhanced Why Watch records: ${finalCount.rows[0].count}`);

    // Save final results
    await fs.writeFile(RESULTS_FILE, JSON.stringify({
      summary: {
        totalProcessed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        yesCount: progress.yesCount,
        noCount: progress.noCount,
        totalCost: progress.totalCost,
        avgCost: progress.totalCost / progress.successful,
        processingTime: totalTime,
        avgProcessingTime: progress.avgProcessingTime,
        tokenUsage: {
          input: progress.inputTokens,
          output: progress.outputTokens,
          cacheWrites: progress.cacheWrites,
          cacheReads: progress.cacheReads,
          total: progress.inputTokens + progress.outputTokens
        }
      },
      errors: progress.errors,
      completedAt: new Date().toISOString()
    }, null, 2));

    if (progress.failed > 0) {
      console.log(`\n⚠️  ${progress.failed} movies failed. Check ${RESULTS_FILE} for details.`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as generateEnhancedWhyWatchHaiku };