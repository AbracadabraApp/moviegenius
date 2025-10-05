#!/usr/bin/env node

/**
 * Enhanced Analysis - Process ALL Movies (Maximum Speed)
 *
 * Incorporates all recommended improvements:
 * - Environment configuration for tuning
 * - Abort controller & timeout handling
 * - Exponential backoff retry logic
 * - Enhanced JSON extraction
 * - Clean database queries (NOT EXISTS only)
 * - NDJSON logging for real-time monitoring
 * - Simple progress tracking
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildPrompt } from '../lib/prompts/builder.js';
import fs from 'fs/promises';

// ---------- Environment Configuration ----------
const MODEL_CONFIG = {
  name: process.env.MODEL_NAME || 'claude-3-5-haiku-20241022',
  displayName: process.env.MODEL_LABEL || 'Haiku 3.5 (Max Speed)',
  pricing: {
    input: Number(process.env.PRICE_IN_PER_MM || 0.25),
    output: Number(process.env.PRICE_OUT_PER_MM || 1.25),
    cacheWrite: Number(process.env.PRICE_CACHE_WRITE_PER_MM || 0.30),
    cacheRead: Number(process.env.PRICE_CACHE_READ_PER_MM || 0.03),
  },
  maxTokens: Number(process.env.MAX_TOKENS || 6000),
  timeoutMs: Number(process.env.TIMEOUT_MS || 60000),
  concurrency: Number(process.env.CONCURRENCY || 10),
  retries: Number(process.env.RETRIES || 3),
  retryBaseMs: Number(process.env.RETRY_BASE_MS || 800),
};

// ---------- File Paths ----------
const PROGRESS_FILE = 'enhanced-analysis-all-movies-progress.json';
const NDJSON_FILE = 'enhanced-analysis-review.ndjson';

// ---------- Environment Checks ----------
if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');
if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');

// ---------- SDK & Database ----------
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log(`🎬 ENHANCED ANALYSIS - ALL MOVIES (MAX SPEED)`);
console.log(`🤖 Model: ${MODEL_CONFIG.displayName} (${MODEL_CONFIG.name})`);
console.log(`⚡ Concurrency: ${MODEL_CONFIG.concurrency} | ⏱ Timeout: ${MODEL_CONFIG.timeoutMs}ms | 🔁 Retries: ${MODEL_CONFIG.retries}`);
console.log(`📝 Real-time log: tail -f ${NDJSON_FILE}\\n`);

// ---------- File I/O Helpers ----------
async function appendNDJSON(obj) {
  const line = JSON.stringify(obj) + '\\n';
  await fs.appendFile(NDJSON_FILE, line);
}

async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    const progress = JSON.parse(data);
    progress.processedIds = new Set(progress.processedIds || []);
    return progress;
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
      processedIds: new Set(),
      errors: [],
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
  }
}

async function saveProgress(progress) {
  const serializable = {
    ...progress,
    processedIds: Array.from(progress.processedIds)
  };
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(serializable, null, 2));
}

// ---------- Enhanced JSON Extraction ----------
function extractJSON(responseText) {
  if (!responseText) throw new Error('Empty LLM response');

  // Handle fenced code blocks
  const fenced = responseText.match(/```(?:json)?\\s*([\\s\\S]*?)```/i);
  const raw = fenced ? fenced[1] : responseText;

  // Find JSON object boundaries
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }

  return JSON.parse(raw.slice(start, end + 1));
}

function validateAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Analysis missing or invalid');
  }
  if (!Array.isArray(analysis.content)) {
    throw new Error('Analysis.content missing or not array');
  }
  if (analysis.content.length !== 4) {
    throw new Error(`Expected 4 content sections, got ${analysis.content.length}`);
  }
  return true;
}

// ---------- Anthropic Call with Timeout & Retry ----------
async function callAnthropicWithTimeout({ model, systemPrompt, userPrompt, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: 0.7,
      system: [{
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }],
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    }, { signal: controller.signal });

    const text = response.content[0].text;
    return { response, text };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function withExponentialBackoff(fn, { retries, baseMs }) {
  let lastError, attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;

      const delay = baseMs * (2 ** attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  throw lastError;
}

// ---------- Clean Database Operations ----------
async function getAllMoviesForProcessing() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT m.id, m.tmdb_id, m.title, m.year, m.created_at
      FROM movies m
      WHERE m.tmdb_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM enhanced_analyses ea WHERE ea.tmdb_id = m.tmdb_id
        )
      ORDER BY m.created_at DESC
    `);
    return rows;
  } finally {
    client.release();
  }
}

async function saveEnhancedAnalysis(result) {
  if (!result.success) return { saved: false, error: 'result_not_success' };

  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO enhanced_analyses (
        tmdb_id, sections, key_elements, created_at, updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (tmdb_id) DO UPDATE SET
        sections = EXCLUDED.sections,
        key_elements = EXCLUDED.key_elements,
        updated_at = NOW()
    `, [
      result.movie.tmdb_id,
      JSON.stringify({
        content: result.analysis.content,
        metadata: result.analysis.metadata,
        featuredMovies: result.analysis.featuredMovies || [],
        linkedReferences: result.analysis.linkedReferences || []
      }),
      JSON.stringify(result.analysis.keyElements || {})
    ]);
    return { saved: true };
  } finally {
    client.release();
  }
}

// ---------- Enhanced Analysis Generation ----------
async function generateEnhancedAnalysis(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;
  const startTime = Date.now();

  try {
    // Build contextual prompt
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', '', true);
    const systemPrompt = promptConfig.system[0].text.replace('{{FILM_TITLE}}', movieTitle);

    // Call with retry logic
    const { response, text } = await withExponentialBackoff(
      () => callAnthropicWithTimeout({
        model: MODEL_CONFIG.name,
        systemPrompt,
        userPrompt: movieTitle,
        maxTokens: MODEL_CONFIG.maxTokens,
        timeoutMs: MODEL_CONFIG.timeoutMs
      }),
      { retries: MODEL_CONFIG.retries, baseMs: MODEL_CONFIG.retryBaseMs }
    );

    // Extract and validate
    const analysis = extractJSON(text);
    validateAnalysis(analysis);

    const processingTime = Date.now() - startTime;
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const cacheWrites = response.usage?.cache_creation_input_tokens || 0;
    const cacheReads = response.usage?.cache_read_input_tokens || 0;

    const cost = Number((
      (inputTokens * MODEL_CONFIG.pricing.input / 1000000) +
      (outputTokens * MODEL_CONFIG.pricing.output / 1000000) +
      (cacheWrites * MODEL_CONFIG.pricing.cacheWrite / 1000000) +
      (cacheReads * MODEL_CONFIG.pricing.cacheRead / 1000000)
    ).toFixed(8));

    return {
      success: true,
      movie,
      analysis,
      metadata: {
        processingTime,
        inputTokens,
        outputTokens,
        cacheWrites,
        cacheReads,
        cost,
        totalTokens: inputTokens + outputTokens,
        wordCount: analysis.metadata?.wordCount || 0,
        sectionsCount: analysis.content?.length || 0,
        requestId: response.id
      }
    };

  } catch (error) {
    return {
      success: false,
      movie,
      error: error.message,
      metadata: {
        processingTime: Date.now() - startTime,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheWrites: 0,
        cacheReads: 0
      }
    };
  }
}

// ---------- Maximum Speed Processing ----------
async function processMoviesMaxSpeed(movies, progress) {
  const concurrency = MODEL_CONFIG.concurrency;
  const startTime = Date.now();

  console.log(`🚀 Processing ${movies.length} movies with ${concurrency}x concurrency...\\n`);

  for (let i = 0; i < movies.length; i += concurrency) {
    const batch = movies.slice(i, i + concurrency);
    const batchNo = Math.floor(i / concurrency) + 1;

    console.log(`🔄 Batch ${batchNo}: Processing ${batch.length} movies concurrently...`);

    // Process batch with maximum concurrency
    const batchPromises = batch.map(async (movie, batchIndex) => {
      const globalIndex = progress.processed + i + batchIndex + 1;

      console.log(`[${globalIndex}] ${movie.title} (${movie.year}) - Starting...`);

      const result = await generateEnhancedAnalysis(movie);

      // Save to database on success
      let dbResult = { saved: false };
      if (result.success) {
        dbResult = await saveEnhancedAnalysis(result);
        console.log(`[${globalIndex}] ✅ Generated (${result.metadata.sectionsCount} sections, ${result.metadata.wordCount} words, ${result.metadata.processingTime}ms)`);
      } else {
        console.log(`[${globalIndex}] ❌ Failed: ${result.error}`);
      }

      // Log to NDJSON for real-time monitoring
      await appendNDJSON({
        type: 'movie_result',
        timestamp: new Date().toISOString(),
        index: globalIndex,
        movie: {
          id: movie.id,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year
        },
        success: result.success,
        error: result.success ? null : result.error,
        sections: result.success ? result.metadata.sectionsCount : null,
        words: result.success ? result.metadata.wordCount : null,
        cost: result.metadata.cost,
        processingTime: result.metadata.processingTime,
        dbSaved: dbResult.saved
      });

      return result;
    });

    // Wait for batch completion
    const batchResults = await Promise.all(batchPromises);

    // Update progress
    batchResults.forEach(result => {
      if (result.success) {
        progress.successful++;
        progress.processedIds.add(result.movie.id);
      } else {
        progress.failed++;
        progress.errors.push({
          movie: result.movie.title,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }

      progress.processed++;
      progress.totalCost += result.metadata.cost;
      progress.inputTokens += result.metadata.inputTokens;
      progress.outputTokens += result.metadata.outputTokens;
      progress.cacheWrites += result.metadata.cacheWrites;
      progress.cacheReads += result.metadata.cacheReads;
      progress.totalProcessingTime += result.metadata.processingTime;
    });

    progress.avgProcessingTime = Math.round(progress.totalProcessingTime / Math.max(progress.processed, 1));

    // Progress summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const remaining = movies.length - (i + concurrency);
    const avgTimePerBatch = elapsed / batchNo;
    const eta = Math.round((remaining / concurrency) * avgTimePerBatch);

    console.log(`\\n📊 Progress: ${progress.processed}/${movies.length} movies`);
    console.log(`✅ Success: ${progress.successful} | ❌ Errors: ${progress.failed}`);
    console.log(`💰 Cost: $${progress.totalCost.toFixed(4)} | Avg: $${(progress.totalCost / Math.max(progress.successful, 1)).toFixed(6)}`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Avg: ${progress.avgProcessingTime}ms/movie | ETA: ${eta}s\\n`);

    // Log batch summary
    await appendNDJSON({
      type: 'batch_summary',
      timestamp: new Date().toISOString(),
      batch: batchNo,
      progress: {
        processed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        totalCost: Number(progress.totalCost.toFixed(6)),
        avgProcessingTime: progress.avgProcessingTime
      },
      timing: {
        elapsedSec: elapsed,
        etaSec: eta
      }
    });

    // Save progress every 100 movies
    if (progress.processed % 100 === 0) {
      await saveProgress(progress);
      console.log(`💾 Progress saved at ${progress.processed} movies\\n`);
    }
  }

  return progress;
}

// ---------- Main Driver ----------
async function processAllMovies() {
  const progress = await loadProgress();

  console.log(`📊 Current progress: processed=${progress.processed} successful=${progress.successful} failed=${progress.failed}\\n`);

  // Initialize NDJSON log
  await fs.writeFile(NDJSON_FILE, '');
  await appendNDJSON({
    type: 'session_start',
    timestamp: new Date().toISOString(),
    config: MODEL_CONFIG,
    existingProgress: {
      processed: progress.processed,
      successful: progress.successful,
      failed: progress.failed
    }
  });

  // Get all movies needing processing
  const movies = await getAllMoviesForProcessing();

  if (movies.length === 0) {
    console.log('✅ No movies need enhanced analysis - all complete!');
    await appendNDJSON({
      type: 'no_work',
      timestamp: new Date().toISOString(),
      message: 'All movies already have enhanced analyses'
    });
    return;
  }

  console.log(`📥 Found ${movies.length} movies requiring enhanced analysis\\n`);

  // Process all movies
  const startTime = Date.now();
  await processMoviesMaxSpeed(movies, progress);
  await saveProgress(progress);

  // Final database verification
  const client = await pool.connect();
  let finalCount = 0;
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM enhanced_analyses');
    finalCount = result.rows[0].count;
  } finally {
    client.release();
  }

  const totalSeconds = Math.round((Date.now() - startTime) / 1000);

  // Final summary
  console.log(`\\n🎉 ALL MOVIES PROCESSING COMPLETE!`);
  console.log(`📈 Total processed: ${progress.processed}`);
  console.log(`✅ Successful: ${progress.successful} (${Math.round(progress.successful/Math.max(progress.processed,1)*100)}%)`);
  console.log(`❌ Errors: ${progress.failed}`);
  console.log(`💰 Total cost: $${progress.totalCost.toFixed(4)}`);
  console.log(`📊 Avg cost per analysis: $${(progress.totalCost / Math.max(progress.successful, 1)).toFixed(6)}`);
  console.log(`⏱️  Total time: ${totalSeconds}s (${Math.round(totalSeconds / 60)}m)`);
  console.log(`🗄️  Enhanced analyses in database: ${finalCount}`);

  // Final NDJSON summary
  await appendNDJSON({
    type: 'session_complete',
    timestamp: new Date().toISOString(),
    totals: {
      processed: progress.processed,
      successful: progress.successful,
      failed: progress.failed,
      totalCost: Number(progress.totalCost.toFixed(6)),
      avgProcessingTime: progress.avgProcessingTime,
      finalDbCount: finalCount,
      elapsedSeconds: totalSeconds
    },
    recentErrors: progress.errors.slice(-5)
  });
}

// ---------- Main Execution ----------
async function main() {
  try {
    await processAllMovies();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await appendNDJSON({
      type: 'fatal_error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
  await appendNDJSON({
    type: 'shutdown',
    timestamp: new Date().toISOString(),
    signal: 'SIGINT'
  });
  await pool.end();
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as processAllMovies };