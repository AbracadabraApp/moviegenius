/**
 * Backfill movie slugs using Claude Haiku 3.5
 *
 * Generates punchy movie poster taglines for movies missing slugs
 * Uses Haiku 3.5 for better quality and 10x lower cost vs Sonnet
 */

import { getPool } from '../lib/railway-db.js';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

const pool = getPool();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROGRESS_FILE = 'slug-backfill-progress.json';
const CONCURRENCY = 20; // Process 20 movies at once
const MODEL = 'claude-haiku-4-5-20251001';

// Load or initialize progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not load progress file:', err.message);
  }

  return {
    processedIds: [],
    stats: {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date().toISOString()
    },
    lastProcessedId: null
  };
}

// Save progress
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (err) {
    console.warn('Could not save progress file:', err.message);
  }
}

// Generate slug using Haiku 3.5
async function generateSlug(title, year) {
  const prompt = `Create a powerful movie poster tagline for "${title}" (${year}).

RULES:
- Between 30 and 100 characters
- NO plot details or story descriptions
- NO actor names or character names
- Focus on EMOTION, STAKES, or MYSTERY
- Think movie poster marketing copy

GOOD Examples (all between 30-100 chars):
- "Some secrets are better left buried"
- "Love is the ultimate sacrifice worth making"
- "Revenge never felt so dangerously good"
- "The game changes everything you thought you knew"
- "Fear has found a new and terrifying address"
- "Not all who wander are lost — some are hunted"

BAD Examples to AVOID:
- "A man discovers his wife's secret" (plot detail)
- "Comedy starring Will Ferrell" (actor name)
- "Two friends go on adventure" (description)

Return ONLY the tagline, nothing else.`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let slug = message.content[0].text.trim();

    // Remove quotes if Claude added them
    if (slug.startsWith('"') && slug.endsWith('"')) {
      slug = slug.slice(1, -1);
    }

    // Validate slug quality
    if (slug.length > 100) {
      throw new Error(`Slug too long (${slug.length} chars): "${slug}"`);
    }
    if (slug.length < 30) {
      throw new Error(`Slug too short (${slug.length} chars): "${slug}"`);
    }

    // Check for banned content
    const lowerSlug = slug.toLowerCase();
    const bannedPatterns = [
      'starring',
      'stars',
      'features',
      'follows',
      'story of',
      'about',
      'when ',
      'after ',
      'before ',
      'during ',
      'chronicles',
      'depicts',
    ];

    for (const pattern of bannedPatterns) {
      if (lowerSlug.includes(pattern)) {
        throw new Error(`Slug contains banned pattern "${pattern}": "${slug}"`);
      }
    }

    return slug;
  } catch (error) {
    throw new Error(`Failed to generate slug: ${error.message}`);
  }
}

// Process a single movie
async function processMovie(movie, progress) {
  const { id, tmdb_id, title, year } = movie;

  // Skip if already processed
  if (progress.processedIds.includes(id)) {
    progress.stats.skipped++;
    return { success: true, skipped: true };
  }

  try {
    console.log(`\n🎬 Processing: ${title} (${year}) [TMDB: ${tmdb_id}]`);

    // Generate slug
    const slug = await generateSlug(title, year);
    console.log(`   ✅ Generated: "${slug}" (${slug.length} chars)`);

    // Update database
    const updateQuery = `
      UPDATE movies
      SET slug = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await pool.query(updateQuery, [slug, id]);

    progress.processedIds.push(id);
    progress.stats.successful++;
    progress.lastProcessedId = id;

    return { success: true, slug };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    progress.stats.failed++;
    return { success: false, error: error.message };
  }
}

// Process movies in batches
async function processBatch(movies, progress) {
  const promises = movies.map(movie => processMovie(movie, progress));
  const results = await Promise.all(promises);

  saveProgress(progress);

  return results;
}

// Main backfill function
async function backfillSlugs() {
  console.log('🚀 Starting slug backfill with Haiku 3.5');
  console.log(`   Model: ${MODEL}`);
  console.log(`   Concurrency: ${CONCURRENCY}\n`);

  const progress = loadProgress();
  const startTime = Date.now();

  try {
    // Get movies without slugs
    const query = `
      SELECT id, tmdb_id, title, year
      FROM movies
      WHERE (slug IS NULL OR slug = '' OR LENGTH(slug) < 5)
        AND title IS NOT NULL
        AND year IS NOT NULL
      ORDER BY year DESC, title
    `;

    const result = await pool.query(query);
    const movies = result.rows;

    console.log(`📊 Found ${movies.length} movies needing slugs`);

    if (progress.processedIds.length > 0) {
      console.log(`   Resuming from ${progress.processedIds.length} already processed\n`);
    }

    progress.stats.total = movies.length;

    // Process in batches
    for (let i = 0; i < movies.length; i += CONCURRENCY) {
      const batch = movies.slice(i, i + CONCURRENCY);
      await processBatch(batch, progress);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (progress.stats.successful / (elapsed / 60)).toFixed(2);

      console.log(`\n📈 Progress: ${i + batch.length}/${movies.length} | Success: ${progress.stats.successful} | Failed: ${progress.stats.failed} | Rate: ${rate}/min | Elapsed: ${elapsed}s`);
    }

    // Final stats
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (progress.stats.successful / (totalTime / 60)).toFixed(2);

    console.log('\n✅ Backfill Complete!');
    console.log(`   Total processed: ${progress.stats.successful + progress.stats.failed}`);
    console.log(`   Successful: ${progress.stats.successful}`);
    console.log(`   Failed: ${progress.stats.failed}`);
    console.log(`   Time: ${Math.floor(totalTime / 60)}m ${Math.floor(totalTime % 60)}s`);
    console.log(`   Average rate: ${avgRate} slugs/min`);

    progress.stats.endTime = new Date().toISOString();
    saveProgress(progress);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    saveProgress(progress);
    throw error;
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted! Saving progress...');
  process.exit(0);
});

backfillSlugs();
