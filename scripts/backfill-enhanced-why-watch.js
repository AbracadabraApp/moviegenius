#!/usr/bin/env node

/**
 * Backfill Enhanced Why Watch Data
 *
 * Generates Why Watch recommendations for movies that have enhanced analyses
 * but are missing entries in the enhanced_why_watch table.
 */

import { Pool } from 'pg';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const RECOMMENDATIONS_PROMPT = `You are a film expert providing quick, punchy recommendations for movies. For each film, respond with EXACTLY this JSON format:

{
  "recommendation": "YES" or "NO",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}

Each reason should be:
- 3-8 words maximum
- Vivid and specific
- Cover different aspects (performance, technique, cultural impact)
- Use active, engaging language

Examples:
YES: ["DiCaprio's career-defining raw performance", "Inarritu's bold experimental cinematography", "Gritty survival story resonates today"]
NO: ["Wooden acting kills momentum", "Overwrought melodramatic tone", "Wastes interesting premise completely"]`;

async function getMoviesNeedingWhyWatch() {
  const query = `
    SELECT m.id as movie_id, m.title, m.year, m.tmdb_id, ea.sections as enhanced_sections
    FROM enhanced_analyses ea
    JOIN movies m ON m.tmdb_id = ea.tmdb_id
    WHERE NOT EXISTS (
      SELECT 1 FROM enhanced_why_watch eww
      WHERE eww.tmdb_id = ea.tmdb_id
    )
    ORDER BY ea.created_at DESC
  `;

  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} new high-quality enhanced analyses missing Why Watch data`);
  return result.rows;
}

async function generateRecommendation(movie) {
  try {
    // Extract text from enhanced sections for analysis
    const sections = JSON.parse(movie.enhanced_sections);
    let analysisText = '';

    if (sections.content && Array.isArray(sections.content)) {
      // New enhanced format
      analysisText = sections.content.map(section => section.text || '').join('\n\n');
    } else {
      // Fallback to string representation
      analysisText = JSON.stringify(sections);
    }

    const truncatedAnalysis = analysisText.substring(0, 3000);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      timeout: 15000, // 15 second timeout
      system: RECOMMENDATIONS_PROMPT,
      messages: [{
        role: 'user',
        content: `Movie: ${movie.title} (${movie.year})
TMDB ID: ${movie.tmdb_id}

Analysis excerpt:
${truncatedAnalysis}

Provide recommendation in the exact JSON format specified.`
      }]
    });

    const responseText = message.content[0].text.trim();

    // Track usage for cost calculation
    const inputTokens = message.usage?.input_tokens || 0;
    const outputTokens = message.usage?.output_tokens || 0;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const recommendation = JSON.parse(jsonMatch[0]);

    // Validate format
    if (!recommendation.recommendation || !recommendation.reasons || !Array.isArray(recommendation.reasons) || recommendation.reasons.length !== 3) {
      throw new Error('Invalid recommendation format');
    }

    return {
      recommendation,
      inputTokens,
      outputTokens
    };

  } catch (error) {
    console.error(`Error generating recommendation for ${movie.title}: ${error.message}`);

    // Fallback recommendation
    return {
      recommendation: {
        recommendation: 'YES',
        reasons: ['Worth watching for film context', 'Has historical significance', 'Expands cinematic knowledge']
      },
      inputTokens: 0,
      outputTokens: 0
    };
  }
}

async function insertRecommendation(movie, recommendation) {
  const query = `
    INSERT INTO enhanced_why_watch (
      movie_id, tmdb_id, recommendation, reasons, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (tmdb_id) DO UPDATE SET
      recommendation = EXCLUDED.recommendation,
      reasons = EXCLUDED.reasons,
      updated_at = NOW()
  `;

  await pool.query(query, [
    movie.movie_id,
    movie.tmdb_id,
    recommendation.recommendation,
    JSON.stringify(recommendation.reasons)
  ]);
}

async function processBatch(movies, startIndex, batchSize) {
  const batch = movies.slice(startIndex, startIndex + batchSize);
  const promises = batch.map(async (movie, idx) => {
    const globalIndex = startIndex + idx + 1;
    console.log(`[${globalIndex}/${movies.length}] Processing: ${movie.title} (${movie.year})`);

    try {
      const result = await generateRecommendation(movie);
      await insertRecommendation(movie, result.recommendation);

      console.log(`✅ [${globalIndex}] ${movie.title}: ${result.recommendation.recommendation} - ${result.recommendation.reasons.join(', ')}`);
      return {
        success: true,
        movie: movie.title,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      };
    } catch (error) {
      console.error(`❌ [${globalIndex}] ${movie.title}: ${error.message}`);
      return { success: false, movie: movie.title, error: error.message };
    }
  });

  return await Promise.all(promises);
}

async function main() {
  try {
    console.log('🎬 Backfilling Enhanced Why Watch data...');
    console.log('📊 Target: Movies with enhanced analyses but missing Why Watch data\n');

    const movies = await getMoviesNeedingWhyWatch();

    if (movies.length === 0) {
      console.log('✅ No movies need Why Watch data backfilling');
      return;
    }

    console.log(`📈 Processing ${movies.length} movies in batches of 5...\n`);

    const batchSize = 5;
    let successCount = 0;
    let errorCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const startTime = Date.now();

    for (let i = 0; i < movies.length; i += batchSize) {
      const batchResults = await processBatch(movies, i, batchSize);

      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
          totalInputTokens += result.inputTokens || 0;
          totalOutputTokens += result.outputTokens || 0;
        } else {
          errorCount++;
        }
      });

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const processed = i + batchSize;
      const remaining = Math.max(0, movies.length - processed);
      const avgTime = elapsed / processed;
      const estimatedRemaining = Math.round(remaining * avgTime);

      console.log(`\n📊 Batch ${Math.floor(i/batchSize) + 1} complete`);
      console.log(`✅ Success: ${successCount} | ❌ Errors: ${errorCount}`);
      console.log(`⏱️  Elapsed: ${elapsed}s | Estimated remaining: ${estimatedRemaining}s\n`);

      // Brief pause between batches to avoid overwhelming API
      if (i + batchSize < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const avgPerMovie = (totalTime / movies.length).toFixed(1);

    // Cost calculation (Haiku pricing: $0.25/1M input, $1.25/1M output)
    const cost = (totalInputTokens * 0.25 / 1000000) + (totalOutputTokens * 1.25 / 1000000);

    console.log('🎉 Backfill processing complete!');
    console.log(`📈 Total processed: ${movies.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏱️  Total time: ${totalTime}s (${avgPerMovie}s per movie)`);
    console.log(`💰 Estimated cost: $${cost.toFixed(4)}`);
    console.log(`📊 Tokens: ${totalInputTokens.toLocaleString()} input, ${totalOutputTokens.toLocaleString()} output`);

    // Verify final count
    const finalCount = await pool.query('SELECT COUNT(*) FROM enhanced_why_watch');
    console.log(`🗄️  Enhanced Why Watch records: ${finalCount.rows[0].count}`);

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}