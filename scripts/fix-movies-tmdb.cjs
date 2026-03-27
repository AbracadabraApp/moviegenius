#!/usr/bin/env node
/**
 * fix-movies-tmdb.cjs
 *
 * 1. Backfill tmdb_id for all movies where it is NULL, via TMDB search API
 * 2. Deduplicate: for each title+year with multiple rows, keep the one with
 *    tmdb_id (or the one with more associated data), delete the rest
 * 3. Add NOT NULL constraint on tmdb_id
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-movies-tmdb.cjs [--dry-run] [--limit N]
 */

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
const CONCURRENCY = 10;
const DRY_RUN = process.argv.includes('--dry-run');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1]) : null;

async function tmdbLookup(title, year) {
  if (!TMDB_KEY) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`
    );
    const d = await r.json();
    const results = (d.results || []).filter(m => m.id && m.release_date);
    if (!results.length) return null;
    results.sort((a, b) =>
      Math.abs(parseInt(a.release_date) - year) - Math.abs(parseInt(b.release_date) - year)
    );
    return results[0].id;
  } catch (_) {
    return null;
  }
}

async function main() {
  if (!TMDB_KEY) {
    console.error('❌ NEXT_PUBLIC_TMDB_API_KEY not set');
    process.exit(1);
  }

  const client = await pool.connect();

  // ── Step 1: Backfill ──────────────────────────────────────────────────────
  const { rows: nullRows } = await client.query(
    `SELECT id, title, year FROM movies WHERE tmdb_id IS NULL ORDER BY title, year`
  );
  const toBackfill = LIMIT ? nullRows.slice(0, LIMIT) : nullRows;

  console.log(`\n🔧 fix-movies-tmdb`);
  console.log(`   Mode:      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Backfill:  ${toBackfill.length} rows with null tmdb_id`);

  let filled = 0, notFound = 0;

  for (let i = 0; i < toBackfill.length; i += CONCURRENCY) {
    const chunk = toBackfill.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async row => {
      const tmdbId = await tmdbLookup(row.title, row.year);
      if (tmdbId) {
        if (!DRY_RUN) {
          // Check if tmdb_id already claimed by another row
          const { rows: existing } = await client.query(
            `SELECT id FROM movies WHERE tmdb_id = $1`, [tmdbId]
          );
          if (existing.length > 0) {
            // Another row owns this tmdb_id — this row is a duplicate, delete it
            const keepId = existing[0].id;
            const delId = row.id;
            // Reassign analyses if keep-row doesn't have one
            const { rows: keepAnalyses } = await client.query(
              `SELECT id FROM movie_analyses WHERE movie_id = $1`, [keepId]
            );
            if (keepAnalyses.length === 0) {
              await client.query(
                `UPDATE movie_analyses SET movie_id = $1 WHERE movie_id = $2`, [keepId, delId]
              );
            } else {
              await client.query(`DELETE FROM movie_analyses WHERE movie_id = $1`, [delId]);
            }
            await client.query(
              `UPDATE enhanced_why_watch SET movie_id = $1 WHERE movie_id = $2 AND NOT EXISTS (
                SELECT 1 FROM enhanced_why_watch WHERE movie_id = $1
              )`, [keepId, delId]
            );
            await client.query(`DELETE FROM enhanced_why_watch WHERE movie_id = $1`, [delId]);
            await client.query(`DELETE FROM not_prod_movie_analyses_alternatives WHERE movie_id = $1`, [delId]);
            try {
              await client.query(`DELETE FROM movies WHERE id = $1`, [delId]);
            } catch (e) {
              // FK still blocking — skip, row will remain null
            }
            filled++;
          } else {
            // tmdb_id is free — claim it
            await client.query(
              `UPDATE movies SET tmdb_id = $1 WHERE id = $2 AND tmdb_id IS NULL`,
              [tmdbId, row.id]
            );
            filled++;
          }
        } else {
          filled++;
        }
      } else {
        notFound++;
      }
    }));

    const done = Math.min(i + CONCURRENCY, toBackfill.length);
    process.stdout.write(`\r  Backfill: ${done}/${toBackfill.length} | filled=${filled} not_found=${notFound}`);
  }

  console.log(`\n   ✅ Backfill complete: ${filled} filled, ${notFound} not found on TMDB`);

  // ── Step 2: Deduplicate ───────────────────────────────────────────────────
  // Find all title+year groups with more than one row
  const { rows: dupeGroups } = await client.query(`
    SELECT LOWER(title) as ltitle, year, COUNT(*) as cnt, array_agg(id ORDER BY tmdb_id NULLS LAST) as ids
    FROM movies
    GROUP BY LOWER(title), year
    HAVING COUNT(*) > 1
  `);

  console.log(`\n   Duplicate groups: ${dupeGroups.length}`);

  let deleted = 0;
  for (const g of dupeGroups) {
    // ids is ordered: tmdb_id NOT NULL first, then nulls
    // Keep ids[0], delete the rest — but first check for analyses/data on the losers
    const keepId = g.ids[0];
    const deleteIds = g.ids.slice(1);

    for (const delId of deleteIds) {
      if (!DRY_RUN) {
        // Reassign analyses only if keep-row doesn't already have one
        const { rows: keepAnalyses } = await client.query(
          `SELECT id FROM movie_analyses WHERE movie_id = $1`, [keepId]
        );
        if (keepAnalyses.length === 0) {
          await client.query(
            `UPDATE movie_analyses SET movie_id = $1 WHERE movie_id = $2`,
            [keepId, delId]
          );
        } else {
          // keep-row already has analysis — just delete the duplicate's
          await client.query(`DELETE FROM movie_analyses WHERE movie_id = $1`, [delId]);
        }

        // Reassign enhanced_why_watch if keep-row doesn't already have one
        await client.query(
          `UPDATE enhanced_why_watch SET movie_id = $1 WHERE movie_id = $2 AND NOT EXISTS (
            SELECT 1 FROM enhanced_why_watch WHERE movie_id = $1
          )`,
          [keepId, delId]
        );
        // Delete any remaining enhanced_why_watch on the dupe
        await client.query(`DELETE FROM enhanced_why_watch WHERE movie_id = $1`, [delId]);

        // Delete not_prod_movie_analyses_alternatives (dev/staging table, just delete)
        await client.query(`DELETE FROM not_prod_movie_analyses_alternatives WHERE movie_id = $1`, [delId]);

        // Delete the duplicate movie row
        await client.query(`DELETE FROM movies WHERE id = $1`, [delId]);
      }
      deleted++;
    }
  }

  console.log(`   ✅ Dedup complete: ${deleted} rows deleted`);

  // ── Step 3: Remaining nulls after backfill + dedup ───────────────────────
  const { rows: [{ count: remaining }] } = await client.query(
    `SELECT COUNT(*) FROM movies WHERE tmdb_id IS NULL`
  );
  console.log(`\n   Remaining null tmdb_id rows: ${remaining}`);

  if (parseInt(remaining) === 0 && !DRY_RUN) {
    // Safe to add NOT NULL constraint
    console.log(`\n   Adding NOT NULL constraint on tmdb_id...`);
    try {
      await client.query(`ALTER TABLE movies ALTER COLUMN tmdb_id SET NOT NULL`);
      console.log(`   ✅ NOT NULL constraint added`);
    } catch (e) {
      console.error(`   ❌ Could not add constraint: ${e.message}`);
    }
  } else if (parseInt(remaining) > 0) {
    console.log(`   ⚠️  ${remaining} rows still have null tmdb_id — NOT NULL constraint not added`);
    console.log(`      These are movies with no TMDB match. Review and delete manually if appropriate.`);
  }

  client.release();
  await pool.end();
  console.log(`\n✅ Done\n`);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
