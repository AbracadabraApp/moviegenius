#!/usr/bin/env node

/**
 * Batch Why Watch Movie Link Processor
 *
 * Links movie titles in "NO" Why Watch recommendations
 * - Processes ~800 NO recommendations
 * - Converts <link>Movie Title</link> to <a href="/movie/{id}">
 * - Uses exact title matching in movies table
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15
});

/**
 * Normalize title for matching (strip year, punctuation, handle "The")
 */
function normalizeTitle(title) {
  // Remove year suffix like "(2013)"
  let normalized = title.replace(/\s*\(\d{4}\)\s*$/, '');

  // Trim whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Try multiple title variations to find movie
 */
async function findMovie(title, client) {
  const normalized = normalizeTitle(title);

  // Try 1: Exact match with original title
  let result = await client.query(
    'SELECT id, title FROM movies WHERE title = $1 LIMIT 1',
    [title]
  );
  if (result.rows.length > 0) return result.rows[0];

  // Try 2: Exact match with normalized title (year stripped)
  if (normalized !== title) {
    result = await client.query(
      'SELECT id, title FROM movies WHERE title = $1 LIMIT 1',
      [normalized]
    );
    if (result.rows.length > 0) return result.rows[0];
  }

  // Try 3: Case-insensitive match
  result = await client.query(
    'SELECT id, title FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
    [normalized]
  );
  if (result.rows.length > 0) return result.rows[0];

  // Try 4: Add "The" prefix if not present
  if (!normalized.toLowerCase().startsWith('the ')) {
    result = await client.query(
      'SELECT id, title FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
      [`The ${normalized}`]
    );
    if (result.rows.length > 0) return result.rows[0];
  }

  // Try 5: Remove "The" prefix if present
  if (normalized.toLowerCase().startsWith('the ')) {
    const withoutThe = normalized.substring(4);
    result = await client.query(
      'SELECT id, title FROM movies WHERE LOWER(title) = LOWER($1) LIMIT 1',
      [withoutThe]
    );
    if (result.rows.length > 0) return result.rows[0];
  }

  // Try 6: Ignore trailing punctuation
  const withoutPunctuation = normalized.replace(/[.,!?]+$/, '');
  if (withoutPunctuation !== normalized) {
    result = await client.query(
      'SELECT id, title FROM movies WHERE LOWER(REGEXP_REPLACE(title, \'[.,!?]+$\', \'\')) = LOWER($1) LIMIT 1',
      [withoutPunctuation]
    );
    if (result.rows.length > 0) return result.rows[0];
  }

  // Try 7: Starts-with match for franchise names (Harry Potter, Terminator 2, etc.)
  // Prioritize first movie (lowest year) for franchise entries
  result = await client.query(`
    SELECT id, title, year
    FROM movies
    WHERE LOWER(title) LIKE LOWER($1) || '%'
    ORDER BY year ASC
    LIMIT 1
  `, [normalized]);
  if (result.rows.length > 0) return result.rows[0];

  return null;
}

/**
 * Link movie titles in Why Watch reasons
 */
async function linkMovieTitles(reasons, client) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return { linked: reasons, stats: { attempted: 0, successful: 0, failed: 0 } };
  }

  const linkedReasons = [];
  let attempted = 0;
  let successful = 0;
  let failed = 0;

  for (const reason of reasons) {
    let linkedReason = reason;

    // Pattern: <link>Movie Title</link>
    const linkPattern = /<link>([^<]+)<\/link>/g;
    const matches = [...reason.matchAll(linkPattern)];

    for (const match of matches) {
      const fullMatch = match[0]; // e.g., "<link>Wall-E</link>"
      const movieTitle = match[1]; // e.g., "Wall-E"
      attempted++;

      try {
        const movie = await findMovie(movieTitle, client);

        if (movie) {
          const link = `<a href="/movie/${movie.id}" class="movie-title">${movieTitle}</a>`;
          linkedReason = linkedReason.replace(fullMatch, link);
          successful++;
        } else {
          // Keep the <link> tag if no match found
          failed++;
        }
      } catch (error) {
        console.error(`  Error linking ${movieTitle}:`, error.message);
        failed++;
      }
    }

    linkedReasons.push(linkedReason);
  }

  return { linked: linkedReasons, stats: { attempted, successful, failed } };
}

/**
 * Process a batch of Why Watch records
 */
async function processBatch(records, batchNum, totalBatches) {
  const results = await Promise.all(
    records.map(async (record) => {
      const client = await pool.connect();
      try {
        const reasons = typeof record.reasons === 'string'
          ? JSON.parse(record.reasons)
          : record.reasons;

        const linkResult = await linkMovieTitles(reasons, client);

        // Only update if we found movie links
        if (linkResult.stats.successful > 0) {
          await client.query(`
            UPDATE enhanced_why_watch
            SET
              reasons = $1,
              movie_link_count = $2,
              updated_at = NOW()
            WHERE id = $3
          `, [
            JSON.stringify(linkResult.linked),
            linkResult.stats.successful,
            record.id
          ]);
        }

        return {
          success: true,
          ...linkResult.stats
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          attempted: 0,
          successful: 0,
          failed: 0
        };
      } finally {
        client.release();
      }
    })
  );

  return results;
}

/**
 * Main batch processing
 */
async function main() {
  console.log('🔗 Why Watch Movie Link Processor');
  console.log('==================================\n');

  try {
    // Add movie_link_count column if it doesn't exist
    console.log('📋 Ensuring database schema...');
    await pool.query(`
      ALTER TABLE enhanced_why_watch
      ADD COLUMN IF NOT EXISTS movie_link_count INTEGER DEFAULT 0
    `);
    console.log('✅ Schema ready\n');

    // Get all NO recommendations (they have the <link> tags)
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM enhanced_why_watch
      WHERE recommendation = 'NO'
    `);
    const total = parseInt(countResult.rows[0].total);

    console.log(`📊 Found ${total.toLocaleString()} NO recommendations to process\n`);

    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(total / BATCH_SIZE);

    let processed = 0;
    let totalAttempted = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalErrors = 0;

    const startTime = Date.now();

    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1;

      // Get batch
      const result = await pool.query(`
        SELECT id, tmdb_id, reasons
        FROM enhanced_why_watch
        WHERE recommendation = 'NO'
        ORDER BY id
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      // Process batch
      const results = await processBatch(result.rows, batchNum, totalBatches);

      // Update stats
      results.forEach(r => {
        if (r.success) {
          totalAttempted += r.attempted;
          totalSuccessful += r.successful;
          totalFailed += r.failed;
        } else {
          totalErrors++;
        }
      });

      processed += result.rows.length;

      // Progress update every 5 batches
      if (batchNum % 5 === 0 || batchNum === totalBatches) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = processed / elapsed;
        const remaining = total - processed;
        const eta = Math.round(remaining / rate);
        const pct = ((processed / total) * 100).toFixed(1);

        console.log(`[Batch ${batchNum}/${totalBatches}] ${pct}% complete`);
        console.log(`  Processed: ${processed.toLocaleString()}/${total.toLocaleString()}`);
        console.log(`  Movie links: ${totalSuccessful.toLocaleString()} successful, ${totalFailed.toLocaleString()} failed`);
        console.log(`  Rate: ${rate.toFixed(1)} records/sec | ETA: ${Math.floor(eta/60)}m ${eta%60}s\n`);
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    // Final summary
    console.log('\n🎉 BATCH MOVIE LINKING COMPLETE!');
    console.log('=================================');
    console.log(`Total processed: ${processed.toLocaleString()}`);
    console.log(`Link attempts: ${totalAttempted.toLocaleString()}`);
    console.log(`Successful links: ${totalSuccessful.toLocaleString()}`);
    console.log(`Failed lookups: ${totalFailed.toLocaleString()}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Success rate: ${totalAttempted > 0 ? ((totalSuccessful/totalAttempted)*100).toFixed(1) : 0}%`);
    console.log(`Total time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
    console.log(`Rate: ${(processed/totalTime).toFixed(1)} records/sec`);

    // Verify database
    const finalCount = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE movie_link_count > 0) as with_movie_links,
        SUM(movie_link_count) as total_movie_links
      FROM enhanced_why_watch
      WHERE recommendation = 'NO'
    `);

    console.log('\n📊 Final Database State (NO recommendations):');
    console.log(`  Total NO recommendations: ${finalCount.rows[0].total}`);
    console.log(`  Records with movie links: ${finalCount.rows[0].with_movie_links}`);
    console.log(`  Total movie links: ${finalCount.rows[0].total_movie_links}`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
main().catch(console.error);
