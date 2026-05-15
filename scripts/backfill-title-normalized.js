#!/usr/bin/env node

/**
 * Backfill title_normalized column using actual normalizeTitle function
 *
 * Processes movies in batches of 500 to avoid memory issues and long locks.
 * Uses the exact normalization logic from lib/search-matching.js to ensure
 * perfect consistency between lookup and search layers.
 */

import { Pool } from 'pg';

// Import the actual normalize function from search-matching
function normalizeTitle(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    // Remove leading articles
    .replace(/^(the|a|an)\s+/i, '')
    // Remove punctuation and special characters
    .replace(/[:\-–—,\.!?'"""'']/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove parenthetical info for initial matching
    .replace(/\([^)]*\)/g, '')
    // Remove diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const BATCH_SIZE = 500;

async function backfillTitleNormalized() {
  const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL or RAILWAY_DATABASE_URL must be set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM movies WHERE title_normalized IS NULL'
    );
    const total = parseInt(countResult.rows[0].total);

    console.log(`\n=== Backfill title_normalized ===`);
    console.log(`Total movies to process: ${total.toLocaleString()}`);
    console.log(`Batch size: ${BATCH_SIZE}`);
    console.log(`Estimated batches: ${Math.ceil(total / BATCH_SIZE)}`);
    console.log('');

    let processed = 0;
    let updated = 0;
    const startTime = Date.now();

    while (processed < total) {
      // Fetch batch
      const batchResult = await pool.query(
        `SELECT id, title
         FROM movies
         WHERE title_normalized IS NULL
         LIMIT $1`,
        [BATCH_SIZE]
      );

      if (batchResult.rows.length === 0) break;

      // Process batch
      for (const row of batchResult.rows) {
        const normalized = normalizeTitle(row.title);

        await pool.query(
          'UPDATE movies SET title_normalized = $1 WHERE id = $2',
          [normalized, row.id]
        );

        updated++;
      }

      processed += batchResult.rows.length;

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / elapsed).toFixed(1);
      const remaining = total - processed;
      const eta = (remaining / rate).toFixed(0);

      console.log(
        `[${elapsed}s] Processed: ${processed.toLocaleString()}/${total.toLocaleString()} ` +
        `(${((processed / total) * 100).toFixed(1)}%) | ` +
        `Rate: ${rate}/s | ETA: ${eta}s`
      );
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log(`✓ Backfill complete`);
    console.log(`  Updated: ${updated.toLocaleString()} movies`);
    console.log(`  Time: ${totalTime}s`);
    console.log(`  Average rate: ${(updated / totalTime).toFixed(1)}/s`);

    await pool.end();

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    await pool.end();
    process.exit(1);
  }
}

backfillTitleNormalized();
