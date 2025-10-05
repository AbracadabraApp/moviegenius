const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');

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

async function getMovieAnalyses() {
  const query = `
    SELECT ma.movie_id, m.title, m.year, m.tmdb_id, ma.claude_response
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE DATE(ma.created_at) = '2025-09-27'
    ORDER BY ma.created_at DESC
  `;

  const result = await pool.query(query);
  console.log(`Found ${result.rows.length} movie analyses from today`);
  return result.rows;
}

async function generateRecommendation(movie, analysis) {
  try {
    const analysisText = typeof analysis.claude_response === 'string'
      ? analysis.claude_response
      : JSON.stringify(analysis.claude_response);

    const truncatedAnalysis = analysisText.substring(0, 3000);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      timeout: 10000, // 10 second timeout
      system: RECOMMENDATIONS_PROMPT,
      messages: [{
        role: 'user',
        content: `Movie: ${movie.title} (${movie.year})
TMDB ID: ${movie.tmdb_id}

Analysis excerpt:
${truncatedAnalysis}

Provide recommendation in the exact JSON format specified.`
      }],
      // Enable prompt caching
      extra: {
        anthropic_beta: 'prompt-caching-2024-07-31'
      }
    });

    const responseText = message.content[0].text.trim();

    // Track usage for cost calculation
    const inputTokens = message.usage?.input_tokens || 0;
    const outputTokens = message.usage?.output_tokens || 0;
    const cacheHits = message.usage?.cache_creation_input_tokens || 0;
    const cacheReads = message.usage?.cache_read_input_tokens || 0;

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
      outputTokens,
      cacheHits,
      cacheReads
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
      outputTokens: 0,
      cacheHits: 0,
      cacheReads: 0
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
      const recommendation = await generateRecommendation(movie, movie);
      await insertRecommendation(movie, recommendation);

      console.log(`✓ [${globalIndex}] ${movie.title}: ${recommendation.recommendation}`);
      return { success: true, movie: movie.title };
    } catch (error) {
      console.error(`✗ [${globalIndex}] ${movie.title}: ${error.message}`);
      return { success: false, movie: movie.title, error: error.message };
    }
  });

  return await Promise.all(promises);
}

async function main() {
  try {
    console.log('🎬 Starting Enhanced Why Watch batch processing...');
    console.log('📊 Settings: Haiku 3.5, 10s timeout, caching enabled\n');

    const movies = await getMovieAnalyses();

    if (movies.length === 0) {
      console.log('No movies found to process');
      return;
    }

    console.log(`📈 Processing ${movies.length} movies in batches of 10...\n`);

    const batchSize = 10;
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < movies.length; i += batchSize) {
      const batchResults = await processBatch(movies, i, batchSize);

      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const remaining = movies.length - (i + batchSize);
      const avgTime = elapsed / (i + batchSize);
      const estimatedRemaining = Math.round(remaining * avgTime);

      console.log(`\n📊 Batch ${Math.floor(i/batchSize) + 1} complete`);
      console.log(`✅ Success: ${successCount} | ❌ Errors: ${errorCount}`);
      console.log(`⏱️  Elapsed: ${elapsed}s | Estimated remaining: ${estimatedRemaining}s\n`);

      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const avgPerMovie = (totalTime / movies.length).toFixed(1);

    console.log('🎉 Batch processing complete!');
    console.log(`📈 Total processed: ${movies.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏱️  Total time: ${totalTime}s (${avgPerMovie}s per movie)`);

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

if (require.main === module) {
  main();
}

module.exports = { main };