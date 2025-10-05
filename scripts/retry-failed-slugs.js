/**
 * Retry failed slug generation with improved prompting
 *
 * Reads failures from slug-backfill-progress.json and retries with
 * stricter prompt to avoid banned patterns
 */

import { getPool } from '../lib/railway-db.js';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

const pool = getPool();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROGRESS_FILE = 'slug-backfill-progress.json';
const RETRY_PROGRESS_FILE = 'slug-retry-progress.json';
const MODEL = 'claude-3-5-haiku-20241022';
const MAX_RETRIES = 3;

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(RETRY_PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(RETRY_PROGRESS_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not load retry progress file:', err.message);
  }

  return {
    retriedIds: [],
    stats: {
      total: 0,
      successful: 0,
      failed: 0,
      startTime: new Date().toISOString()
    }
  };
}

function saveProgress(progress) {
  try {
    fs.writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (err) {
    console.warn('Could not save retry progress file:', err.message);
  }
}

// Enhanced prompt with more examples to avoid banned patterns
async function generateSlugStrict(title, year, attemptNum = 1) {
  const prompt = `Create a SHORT movie poster tagline for "${title}" (${year}).

CRITICAL RULES:
- Maximum 45 characters (STRICT)
- NO "when", "after", "before", "during"
- NO "about", "follows", "starring", "features"
- NO "story of", "chronicles", "depicts"
- NO plot descriptions
- Focus on EMOTION or STAKES only

PERFECT Examples (use this style):
- "Fear has a new address" (24 chars)
- "Trust no one" (12 chars)
- "Love is the ultimate sacrifice" (30 chars)
- "Revenge never felt so good" (26 chars)
- "The hunt begins" (15 chars)
- "Some secrets should stay buried" (31 chars)
- "Justice will be served" (22 chars)
- "Survival is everything" (22 chars)

BAD - DO NOT USE:
- "When X happens" ❌
- "About X" ❌
- "Follows X" ❌
- Any sentence starting with banned words ❌

Keep it SHORT, punchy, and UNDER 45 characters.
Return ONLY the tagline.`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 80,
      temperature: attemptNum === 1 ? 1.0 : 0.7, // Lower temp on retries
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let slug = message.content[0].text.trim();

    // Remove quotes
    if (slug.startsWith('"') && slug.endsWith('"')) {
      slug = slug.slice(1, -1);
    }

    // Stricter length check
    if (slug.length > 45) {
      throw new Error(`Slug too long (${slug.length} chars): "${slug}"`);
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

// Retry a single movie with multiple attempts
async function retryMovie(movie, progress) {
  const { id, tmdb_id, title, year } = movie;

  if (progress.retriedIds.includes(id)) {
    return { success: true, skipped: true };
  }

  console.log(`\n🔄 Retrying: ${title} (${year}) [TMDB: ${tmdb_id}]`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`   Attempt ${attempt}/${MAX_RETRIES}...`);

      const slug = await generateSlugStrict(title, year, attempt);
      console.log(`   ✅ Generated: "${slug}" (${slug.length} chars)`);

      // Update database
      const updateQuery = `
        UPDATE movies
        SET slug = $1, updated_at = NOW()
        WHERE id = $2
      `;
      await pool.query(updateQuery, [slug, id]);

      progress.retriedIds.push(id);
      progress.stats.successful++;

      return { success: true, slug, attempts: attempt };
    } catch (error) {
      console.error(`   ❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt === MAX_RETRIES) {
        progress.stats.failed++;
        return { success: false, error: error.message };
      }

      // Brief delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

async function retryFailedSlugs() {
  console.log('🔄 Starting retry for failed slug generation');
  console.log(`   Model: ${MODEL}`);
  console.log(`   Max retries per movie: ${MAX_RETRIES}\n`);

  const progress = loadProgress();
  const startTime = Date.now();

  try {
    // Get movies that still don't have slugs
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

    console.log(`📊 Found ${movies.length} movies still needing slugs\n`);

    progress.stats.total = movies.length;

    // Process one at a time (with retries, less aggressive)
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      await retryMovie(movie, progress);

      saveProgress(progress);

      if ((i + 1) % 20 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (progress.stats.successful / (elapsed / 60)).toFixed(2);
        console.log(`\n📈 Progress: ${i + 1}/${movies.length} | Success: ${progress.stats.successful} | Failed: ${progress.stats.failed} | Rate: ${rate}/min`);
      }
    }

    // Final stats
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (progress.stats.successful / (totalTime / 60)).toFixed(2);

    console.log('\n✅ Retry Complete!');
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

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted! Saving progress...');
  process.exit(0);
});

retryFailedSlugs();
