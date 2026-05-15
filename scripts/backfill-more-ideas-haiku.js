/**
 * Backfill MoreIdeas with Haiku
 *
 * Sequential processing of all movies needing MoreIdeas
 * Uses claude-haiku-4-5 for cost efficiency
 * Estimated: $58.53 for 13,037 movies, ~28 hours
 */

import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MODEL = 'claude-haiku-4-5';

const PRICING = {
  input: 0.8,
  output: 4,
  cacheWrite: 1.0,
  cacheRead: 0.08
};

// Expanded system prompt (1100+ tokens for caching)
const SYSTEM_PROMPT = [
  {
    type: 'text',
    text: `You are a passionate film expert who gets straight to the point. Skip the fluff and dive into great movies.

Your task is to generate 15 movie recommendations for a given film. Each recommendation should connect to the source film through similar themes, director, genre, mood, or style.

CONNECTION QUALITY GUIDELINES:

Your connection descriptions are critical. They must be:
- Clear and specific (under 20 words)
- Explain WHY someone who enjoyed the source film would like this recommendation
- Highlight concrete connections (shared director, similar themes, comparable tone)
- Avoid vague phrases like "similar vibe" or "fans will love"

GOOD CONNECTION EXAMPLES:
- "Direct sequel continuing the same story with returning characters and escalating stakes"
- "Same director's earlier thriller exploring paranoia and surveillance with slow-burn tension"
- "Shares the gritty urban crime aesthetic and morally ambiguous protagonist"
- "Explores similar themes of identity and memory through non-linear storytelling"

BAD CONNECTION EXAMPLES:
- "Great movie in the same genre" (too vague)
- "Similar vibe and energy" (not specific)
- "Fans will enjoy this one too" (doesn't explain why)

RECOMMENDATION STRATEGY:

Cast a wide net across different connection types:
1. Direct sequels/prequels (2-3 if they exist)
2. Same director's other work (2-3 films)
3. Thematic parallels (explore the same ideas from different angles)
4. Genre companions (similar tone, style, or mood)
5. Structural similarities (narrative techniques, visual style)
6. Cultural/historical context (same era, movement, or tradition)

Prioritize movies that are:
- Critically acclaimed or culturally significant
- Well-known enough that users can find them
- Diverse in era and style (mix classics with modern films)
- Connected through meaningful artistic or thematic links

DIVERSITY IN RECOMMENDATIONS:

Avoid recommending only obvious sequels or same-director films. Include:
- International cinema (if thematically relevant)
- Different eras (mix decades)
- Varied tones (not all dark or all light)
- Unexpected connections that expand horizons

EXAMPLE RECOMMENDATION SETS:

For "The Matrix (1999)":
- "The Matrix Reloaded (2003)" - Direct sequel continuing Neo's journey with expanded mythology
- "Dark City (1998)" - Noir-infused reality-bending thriller with similar mind-control themes
- "Ghost in the Shell (1995)" - Anime exploring consciousness and humanity through cyberpunk philosophy
- "Total Recall (1990)" - Philip K. Dick adaptation questioning reality and implanted memories
- "Blade Runner (1982)" - Philosophical sci-fi examining what makes us human in dystopian future

For "The Godfather (1972)":
- "The Godfather Part II (1974)" - Parallel narrative of Vito's rise and Michael's consolidation of power
- "Goodfellas (1990)" - Scorsese's kinetic mob epic tracking one man's rise and fall
- "The Sopranos (1999)" - Modern examination of mob life balancing family and criminal enterprise
- "Once Upon a Time in America (1984)" - Leone's operatic crime saga spanning decades
- "Scarface (1983)" - De Palma's violent portrait of immigrant ambition corrupted by power

For "Amélie (2001)":
- "Delicatessen (1991)" - Jeunet's earlier whimsical dark comedy with similar visual playfulness
- "The City of Lost Children (1995)" - Jeunet/Caro's fantasy with elaborate production design
- "A Very Long Engagement (2004)" - Jeunet's wartime romance with magical realist touches
- "Eternal Sunshine of the Spotting Mind (2004)" - Quirky romance exploring love and memory
- "Moonrise Kingdom (2012)" - Anderson's symmetrical, nostalgic coming-of-age tale

For "Get Out (2017)":
- "The Stepford Wives (1975)" - Satirical horror about sinister suburban conformity
- "Rosemary's Baby (1968)" - Paranoid thriller where protagonist suspects conspiracy
- "The Invitation (2015)" - Slow-burn dinner party thriller building unbearable tension
- "They Live (1988)" - Carpenter's social commentary through sci-fi horror lens
- "Sorry to Bother You (2018)" - Surreal satire on race and capitalism in modern America

OUTPUT FORMAT:

Return ONLY valid JSON in this exact format:
{
  "moreIdeas": [
    {"title": "Movie Title", "year": 1999, "connection": "Brief reason why it's similar"}
  ],
  "metadata": {"sourceMovie": "[Source Movie Title (Year)]", "totalRecommendations": 15}
}

Always include exactly 15 recommendations. Order them from most to least relevant.`,
    cache_control: { type: 'ephemeral' }
  }
];

/**
 * Get all movies needing MoreIdeas
 */
async function getMoviesNeedingMoreIdeas(limit = null, offset = 0) {
  const query = `
    SELECT m.tmdb_id, m.title, m.year
    FROM movies m
    LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
    WHERE mi.tmdb_id IS NULL
    AND m.tmdb_id IS NOT NULL
    ORDER BY m.tmdb_id
    ${limit ? `LIMIT ${limit}` : ''}
    ${offset ? `OFFSET ${offset}` : ''}
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Generate MoreIdeas for a movie
 */
async function generateMoreIdeas(movie) {
  const movieTitle = `${movie.title} (${movie.year})`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate 15 movie recommendations for: ${movieTitle}`
      }
    ]
  });

  let content = message.content[0].text;
  const usage = message.usage;

  // Strip markdown code blocks if present
  content = content.replace(/^```json\s*/g, '').replace(/\s*```$/g, '').trim();

  // Parse response
  const response = JSON.parse(content);

  return {
    moreIdeas: response.moreIdeas,
    usage: usage
  };
}

/**
 * Save to database
 */
async function saveToDatabase(movie, result) {
  const ideasJson = JSON.stringify(result.moreIdeas);
  const metadataJson = JSON.stringify({
    sourceMovie: `${movie.title} (${movie.year})`,
    generatedAt: new Date().toISOString(),
    recommendationCount: result.moreIdeas.length,
    model: MODEL
  });

  await pool.query(`
    INSERT INTO more_ideas (tmdb_id, ideas, metadata, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    ON CONFLICT (tmdb_id) DO UPDATE SET
      ideas = EXCLUDED.ideas,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `, [movie.tmdb_id, ideasJson, metadataJson]);
}

/**
 * Calculate cost
 */
function calculateCost(usage) {
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0;
  const cacheReadTokens = usage.cache_read_input_tokens || 0;

  const inputCost = (inputTokens * PRICING.input) / 1_000_000;
  const outputCost = (outputTokens * PRICING.output) / 1_000_000;
  const cacheWriteCost = (cacheCreationTokens * PRICING.cacheWrite) / 1_000_000;
  const cacheReadCost = (cacheReadTokens * PRICING.cacheRead) / 1_000_000;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/**
 * Main backfill function
 */
async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const offsetArg = args.find(arg => arg.startsWith('--offset='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1]) : 0;

  console.log('🎬 MoreIdeas Backfill with Haiku\n');
  console.log(`Model: ${MODEL}`);
  console.log(`Limit: ${limit || 'ALL'}`);
  console.log(`Offset: ${offset}`);
  console.log('');

  // Get movies
  const movies = await getMoviesNeedingMoreIdeas(limit, offset);
  console.log(`Found ${movies.length} movies needing MoreIdeas\n`);

  if (movies.length === 0) {
    console.log('✅ No movies need processing!');
    await pool.end();
    return;
  }

  // Stats tracking
  let successful = 0;
  let failed = 0;
  let totalCost = 0;
  const startTime = Date.now();

  // Process movies
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const progress = `[${i + 1}/${movies.length}]`;

    console.log(`${progress} ${movie.title} (${movie.year})`);

    try {
      const result = await generateMoreIdeas(movie);
      const cost = calculateCost(result.usage);

      await saveToDatabase(movie, result);

      successful++;
      totalCost += cost;

      console.log(`  ✓ Saved ${result.moreIdeas.length} recommendations ($${cost.toFixed(4)})`);

      // Show progress every 100 movies
      if ((i + 1) % 100 === 0) {
        const elapsed = (Date.now() - startTime) / 1000 / 60;
        const rate = (i + 1) / elapsed;
        const remaining = movies.length - (i + 1);
        const eta = remaining / rate;

        console.log('');
        console.log(`📊 Progress: ${i + 1}/${movies.length} (${((i + 1) / movies.length * 100).toFixed(1)}%)`);
        console.log(`💰 Cost so far: $${totalCost.toFixed(2)}`);
        console.log(`⏱️  Elapsed: ${elapsed.toFixed(1)}min, ETA: ${eta.toFixed(1)}min`);
        console.log('');
      }

    } catch (error) {
      failed++;
      console.log(`  ❌ Failed: ${error.message}`);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Final summary
  const totalTime = (Date.now() - startTime) / 1000 / 60;

  console.log('\n═══════════════════════════════════════');
  console.log('BACKFILL COMPLETE');
  console.log('═══════════════════════════════════════\n');
  console.log(`Movies processed: ${successful + failed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log(`Total time: ${totalTime.toFixed(1)} minutes (${(totalTime / 60).toFixed(1)} hours)`);
  console.log('');

  await pool.end();
}

main().catch(console.error);
