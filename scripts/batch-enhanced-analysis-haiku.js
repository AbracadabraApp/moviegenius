#!/usr/bin/env node

/**
 * Enhanced Analysis Batch Generation - Progressive Scaling
 *
 * Generates 4-part contextual analyses for movies using MOVIE_ANALYSIS_CONTEXT prompt
 * - Uses Haiku 3.5 for speed and cost efficiency
 * - Progressive scaling: 10 → 100 → 1000 → 10000 → 10000
 * - Prompt caching enabled
 * - Targets enhanced_analyses table for safety, migrate later
 * - Resume capability with progress tracking
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import { buildPrompt } from '../lib/prompts/builder.js';
import fs from 'fs/promises';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Model configuration (Haiku 3.5 for speed and cost)
const MODEL_CONFIG = {
  name: 'claude-3-5-haiku-20241022',
  displayName: 'Haiku 3.5',
  pricing: {
    input: 0.25,
    output: 1.25,
    cacheWrite: 0.30,
    cacheRead: 0.03
  },
  maxTokens: 6000, // Increased for enhanced analysis
  timeout: 30000,  // 30 seconds for complex analysis
  speed: 'fastest',
  quality: 'good'
};

// Progressive batch sizes
const BATCH_PHASES = [
  { name: 'Test Phase', size: 10, description: 'Initial validation' },
  { name: 'Small Batch', size: 100, description: 'Structure validation' },
  { name: 'Medium Batch', size: 1000, description: 'Performance testing' },
  { name: 'Large Batch 1', size: 10000, description: 'First major batch' },
  { name: 'Large Batch 2', size: 10000, description: 'Final batch completion' }
];

// Progress tracking
const PROGRESS_FILE = 'enhanced-analysis-progress.json';
const RESULTS_FILE = 'enhanced-analysis-results.json';

console.log(`🎬 Enhanced Analysis Batch Generation`);
console.log(`🤖 Model: ${MODEL_CONFIG.displayName}`);
console.log(`💰 Cost: $${MODEL_CONFIG.pricing.input}/$${MODEL_CONFIG.pricing.output} per 1M tokens`);
console.log(`📊 Progressive scaling: ${BATCH_PHASES.map(p => p.size).join(' → ')} movies\n`);

/**
 * Load existing progress or create new progress tracker
 */
async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    const progress = JSON.parse(data);
    progress.processedIds = new Set(progress.processedIds || []);
    return progress;
  } catch (error) {
    return {
      startTime: new Date().toISOString(),
      currentPhase: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheWrites: 0,
      cacheReads: 0,
      avgProcessingTime: 0,
      processedIds: new Set(),
      errors: [],
      phaseResults: [],
      currentBatch: 1
    };
  }
}

/**
 * Save progress to disk
 */
async function saveProgress(progress) {
  const serializable = {
    ...progress,
    processedIds: Array.from(progress.processedIds)
  };
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(serializable, null, 2));
}

/**
 * Get movies for enhanced analysis processing
 */
async function getMoviesForProcessing(limit, offset = 0, progress) {
  const client = await pool.connect();

  try {
    const processedIdsArray = Array.from(progress.processedIds);
    const processedIdsClause = processedIdsArray.length > 0
      ? `AND m.id NOT IN (${processedIdsArray.map(id => `'${id}'`).join(',')})`
      : '';

    const result = await client.query(`
      SELECT
        m.id,
        m.tmdb_id,
        m.title,
        m.year,
        m.created_at
      FROM movies m
      WHERE m.tmdb_id IS NOT NULL
        AND m.tmdb_id NOT IN (
          SELECT ea.tmdb_id
          FROM enhanced_analyses ea
          WHERE ea.tmdb_id IS NOT NULL
        )
        ${processedIdsClause}
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;

  } finally {
    client.release();
  }
}

/**
 * Generate enhanced analysis for a movie
 */
async function generateEnhancedAnalysis(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;

  try {
    // Build the 4-part contextual analysis prompt
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', '', true);

    // Replace film title placeholder in the prompt
    const systemPrompt = promptConfig.system[0].text.replace('{{FILM_TITLE}}', movieTitle);

    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: MODEL_CONFIG.name,
      max_tokens: MODEL_CONFIG.maxTokens,
      temperature: 0.7,
      system: [{
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }],
      messages: [{
        role: 'user',
        content: movieTitle
      }]
    });

    const processingTime = Date.now() - startTime;
    const rawResponse = message.content[0].text;

    // Calculate costs
    const inputTokens = message.usage?.input_tokens || 0;
    const outputTokens = message.usage?.output_tokens || 0;
    const cacheWrites = message.usage?.cache_creation_input_tokens || 0;
    const cacheReads = message.usage?.cache_read_input_tokens || 0;

    const cost = (
      (inputTokens * MODEL_CONFIG.pricing.input / 1000000) +
      (outputTokens * MODEL_CONFIG.pricing.output / 1000000) +
      (cacheWrites * MODEL_CONFIG.pricing.cacheWrite / 1000000) +
      (cacheReads * MODEL_CONFIG.pricing.cacheRead / 1000000)
    );

    // Parse and validate JSON response
    let analysis;
    try {
      analysis = JSON.parse(rawResponse);
    } catch (error) {
      throw new Error(`JSON parse error: ${error.message}`);
    }

    // Validate enhanced analysis structure
    if (!analysis.content || !Array.isArray(analysis.content) || analysis.content.length !== 4) {
      throw new Error('Invalid enhanced analysis structure - missing 4 content sections');
    }

    // Check for required subheads
    const hasSubheads = analysis.content.every(section => section.subhead && section.text);
    if (!hasSubheads) {
      throw new Error('Invalid enhanced analysis - missing subheads or content');
    }

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
        sectionsCount: analysis.content?.length || 0
      }
    };

  } catch (error) {
    return {
      success: false,
      movie,
      error: error.message,
      metadata: {
        processingTime: 0,
        cost: 0
      }
    };
  }
}

/**
 * Save enhanced analysis to database
 */
async function saveEnhancedAnalysis(result) {
  if (!result.success) return;

  const client = await pool.connect();

  try {
    await client.query(`
      INSERT INTO enhanced_analyses (
        tmdb_id,
        sections,
        key_elements,
        created_at,
        updated_at
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

  } finally {
    client.release();
  }
}

/**
 * Process a batch of movies
 */
async function processBatch(movies, batchIndex, progress) {
  console.log(`\n🎬 Processing batch ${batchIndex}: ${movies.length} movies`);

  const batchResults = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const globalIndex = progress.processed + i + 1;

    console.log(`[${globalIndex}] ${movie.title} (${movie.year})`);

    try {
      const result = await generateEnhancedAnalysis(movie);

      if (result.success) {
        await saveEnhancedAnalysis(result);
        console.log(`   ✅ Enhanced analysis generated (${result.analysis.content.length} sections, ${result.metadata.wordCount} words)`);
        progress.successful++;
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
        progress.failed++;
        progress.errors.push({
          movie: movie.title,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }

      // Update progress
      progress.processed++;
      progress.processedIds.add(movie.id);
      progress.totalCost += result.metadata.cost;
      progress.inputTokens += result.metadata.inputTokens || 0;
      progress.outputTokens += result.metadata.outputTokens || 0;
      progress.cacheWrites += result.metadata.cacheWrites || 0;
      progress.cacheReads += result.metadata.cacheReads || 0;

      batchResults.push(result);

      // Save progress every 10 movies
      if (globalIndex % 10 === 0) {
        await saveProgress(progress);
      }

    } catch (error) {
      console.log(`   💥 Unexpected error: ${error.message}`);
      progress.failed++;
      progress.errors.push({
        movie: movie.title,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Brief delay to avoid overwhelming the API
    if (i < movies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return batchResults;
}

/**
 * Execute progressive batch processing
 */
async function runProgressiveBatches() {
  const progress = await loadProgress();

  console.log(`📊 Current progress: ${progress.processed} processed, Phase ${progress.currentPhase + 1}/${BATCH_PHASES.length}`);

  // Continue from current phase
  for (let phaseIndex = progress.currentPhase; phaseIndex < BATCH_PHASES.length; phaseIndex++) {
    const phase = BATCH_PHASES[phaseIndex];

    console.log(`\n🚀 PHASE ${phaseIndex + 1}: ${phase.name} (${phase.size} movies)`);
    console.log(`📝 ${phase.description}`);

    // Get movies for this phase
    const movies = await getMoviesForProcessing(phase.size, 0, progress);

    if (movies.length === 0) {
      console.log('✅ No more movies to process');
      break;
    }

    console.log(`📊 Found ${movies.length} movies for processing`);

    // Process in smaller batches of 10 for better monitoring
    const batchSize = 10;
    const phaseStartTime = Date.now();

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize) + 1;

      await processBatch(batch, batchIndex, progress);

      // Update current phase
      progress.currentPhase = phaseIndex;
      await saveProgress(progress);

      // Progress summary
      const elapsed = Math.round((Date.now() - phaseStartTime) / 1000);
      const remaining = movies.length - (i + batchSize);
      const avgTime = elapsed / (i + batchSize);
      const eta = Math.round(remaining * avgTime);

      console.log(`\n📊 Phase ${phaseIndex + 1} Progress:`);
      console.log(`   ✅ Success: ${progress.successful} | ❌ Errors: ${progress.failed}`);
      console.log(`   💰 Cost: $${progress.totalCost.toFixed(4)} | Avg: $${(progress.totalCost / Math.max(progress.successful, 1)).toFixed(6)}`);
      console.log(`   ⏱️  Elapsed: ${elapsed}s | ETA: ${eta}s\n`);
    }

    // Phase completion
    const phaseTime = Math.round((Date.now() - phaseStartTime) / 1000);
    console.log(`✅ Phase ${phaseIndex + 1} complete! (${phaseTime}s)`);

    // PAUSE after test phase for manual verification
    if (phaseIndex === 0 && phase.size === 10) {
      console.log(`\n⏸️  TEST PHASE COMPLETE - MANUAL VERIFICATION REQUIRED`);
      console.log(`📋 Please verify the enhanced analyses in the database:`);
      console.log(`   1. Check enhanced_analyses table has 10 new records`);
      console.log(`   2. Verify 4-part structure with contextual subheads`);
      console.log(`   3. Check word counts and content quality`);
      console.log(`   4. Validate JSON structure is correct`);
      console.log(`\n🛑 STOPPING HERE - Run script again to continue with next phases`);
      console.log(`💡 Or modify the script to continue automatically after verification\n`);

      // Exit after test phase
      process.exit(0);
    }

    progress.phaseResults.push({
      phase: phase.name,
      size: phase.size,
      processed: movies.length,
      duration: phaseTime,
      successRate: Math.round((progress.successful / Math.max(progress.processed, 1)) * 100)
    });
  }

  // Final summary
  console.log(`\n🎉 ENHANCED ANALYSIS GENERATION COMPLETE!`);
  console.log(`📈 Total processed: ${progress.processed}`);
  console.log(`✅ Successful: ${progress.successful} (${Math.round(progress.successful/Math.max(progress.processed,1)*100)}%)`);
  console.log(`❌ Errors: ${progress.failed}`);
  console.log(`💰 Total cost: $${progress.totalCost.toFixed(4)}`);
  console.log(`📊 Avg cost per analysis: $${(progress.totalCost / Math.max(progress.successful, 1)).toFixed(6)}`);

  // Verify final database count
  const client = await pool.connect();
  try {
    const finalCount = await client.query('SELECT COUNT(*) FROM enhanced_analyses');
    console.log(`🗄️  Enhanced analyses in database: ${finalCount.rows[0].count}`);
  } finally {
    client.release();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await runProgressiveBatches();
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

export { main as batchEnhancedAnalysis };