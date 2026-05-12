#!/usr/bin/env node
/**
 * batch-search-dry-run.js
 *
 * Dry run batch test: Search all "missing" films from frequency analysis
 * Tests with year variations (±2 years) to find films already in catalog
 *
 * Reads from:
 *   - output/missing_high_frequency.csv (802 films @ 8+ recs)
 *   - more_ideas_frequency table (for medium priority 3-7 recs)
 *
 * Usage:
 *   node --env-file=.env.local scripts/batch-search-dry-run.js
 *   node --env-file=.env.local scripts/batch-search-dry-run.js --limit 50
 */

import pg from 'pg';
import fs from 'fs/promises';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const limit = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
  : null;

/**
 * Search database with year tolerance
 * Tries exact year, then ±1, then ±2
 */
async function searchWithYearTolerance(client, title, year) {
  const searchPattern = `%${title}%`;

  // Try exact year first
  let result = await client.query(`
    SELECT
      m.id,
      m.title,
      m.year,
      m.tmdb_id,
      m.poster_url,
      ABS(m.year - $3) as year_diff
    FROM movies m
    WHERE (
      m.title ILIKE $1
      OR similarity(LOWER(m.title), LOWER($2)) > 0.3
    )
    AND m.year = $3
    ORDER BY similarity(LOWER(m.title), LOWER($2)) DESC
    LIMIT 1
  `, [searchPattern, title, year]);

  if (result.rows.length > 0) {
    return { ...result.rows[0], match_type: 'exact_year' };
  }

  // Try ±1 year
  result = await client.query(`
    SELECT
      m.id,
      m.title,
      m.year,
      m.tmdb_id,
      m.poster_url,
      ABS(m.year - $3) as year_diff
    FROM movies m
    WHERE (
      m.title ILIKE $1
      OR similarity(LOWER(m.title), LOWER($2)) > 0.4
    )
    AND m.year BETWEEN $3 - 1 AND $3 + 1
    ORDER BY
      similarity(LOWER(m.title), LOWER($2)) DESC,
      ABS(m.year - $3) ASC
    LIMIT 1
  `, [searchPattern, title, year]);

  if (result.rows.length > 0) {
    return { ...result.rows[0], match_type: 'fuzzy_year_1' };
  }

  // Try ±2 years
  result = await client.query(`
    SELECT
      m.id,
      m.title,
      m.year,
      m.tmdb_id,
      m.poster_url,
      ABS(m.year - $3) as year_diff
    FROM movies m
    WHERE (
      m.title ILIKE $1
      OR similarity(LOWER(m.title), LOWER($2)) > 0.4
    )
    AND m.year BETWEEN $3 - 2 AND $3 + 2
    ORDER BY
      similarity(LOWER(m.title), LOWER($2)) DESC,
      ABS(m.year - $3) ASC
    LIMIT 1
  `, [searchPattern, title, year]);

  if (result.rows.length > 0) {
    return { ...result.rows[0], match_type: 'fuzzy_year_2' };
  }

  return null;
}

async function batchDryRun() {
  const client = await pool.connect();

  try {
    console.log('=== BATCH DRY RUN: Missing Films Search ===');
    console.log('');

    // Get missing films from more_ideas_frequency table
    const query = `
      SELECT
        title,
        year,
        recommendation_count,
        catalog_status
      FROM more_ideas_frequency
      WHERE catalog_status = 'missing'
        AND recommendation_count >= 3
      ORDER BY recommendation_count DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    console.log('Fetching missing films from database...');
    const result = await client.query(query);
    const missingFilms = result.rows;

    console.log(`Found ${missingFilms.length.toLocaleString()} films marked as missing`);
    if (limit) {
      console.log(`(Limited to first ${limit})`);
    }
    console.log('');

    // Test each film
    let alreadyInCatalog = 0;
    let trulyMissing = 0;
    let exactYearMatch = 0;
    let fuzzy1YearMatch = 0;
    let fuzzy2YearMatch = 0;

    const trulyMissingList = [];
    const foundWithYearDiff = [];

    console.log('Searching...');
    console.log('');

    for (let i = 0; i < missingFilms.length; i++) {
      const film = missingFilms[i];
      const progress = `[${i + 1}/${missingFilms.length}]`;

      const match = await searchWithYearTolerance(client, film.title, film.year);

      if (match) {
        alreadyInCatalog++;

        if (match.match_type === 'exact_year') {
          exactYearMatch++;
        } else if (match.match_type === 'fuzzy_year_1') {
          fuzzy1YearMatch++;
          foundWithYearDiff.push({
            searchTitle: film.title,
            searchYear: film.year,
            foundTitle: match.title,
            foundYear: match.year,
            yearDiff: match.year_diff,
            recs: film.recommendation_count
          });
        } else if (match.match_type === 'fuzzy_year_2') {
          fuzzy2YearMatch++;
          foundWithYearDiff.push({
            searchTitle: film.title,
            searchYear: film.year,
            foundTitle: match.title,
            foundYear: match.year,
            yearDiff: match.year_diff,
            recs: film.recommendation_count
          });
        }

        if (i < 10 || i % 100 === 0) {
          console.log(`${progress} ✅ "${film.title}" (${film.year}) → Found as "${match.title}" (${match.year}) [${match.match_type}]`);
        }
      } else {
        trulyMissing++;
        trulyMissingList.push({
          title: film.title,
          year: film.year,
          recs: film.recommendation_count
        });

        if (i < 10 || trulyMissingList.length <= 20) {
          console.log(`${progress} ❌ "${film.title}" (${film.year}) → NOT FOUND [${film.recommendation_count} recs]`);
        }
      }
    }

    console.log('');
    console.log('=== RESULTS ===');
    console.log('');
    console.log(`Total tested: ${missingFilms.length.toLocaleString()}`);
    console.log('');
    console.log(`✅ Already in catalog: ${alreadyInCatalog.toLocaleString()} (${((alreadyInCatalog / missingFilms.length) * 100).toFixed(1)}%)`);
    console.log(`   - Exact year match: ${exactYearMatch.toLocaleString()}`);
    console.log(`   - Year ±1 match: ${fuzzy1YearMatch.toLocaleString()}`);
    console.log(`   - Year ±2 match: ${fuzzy2YearMatch.toLocaleString()}`);
    console.log('');
    console.log(`❌ Truly missing: ${trulyMissing.toLocaleString()} (${((trulyMissing / missingFilms.length) * 100).toFixed(1)}%)`);
    console.log('');

    // Show sample of year mismatches
    if (foundWithYearDiff.length > 0) {
      console.log('=== SAMPLE: YEAR MISMATCHES (Found with ±1 or ±2 years) ===');
      console.log('');
      foundWithYearDiff.slice(0, 10).forEach(f => {
        console.log(`"${f.searchTitle}" (${f.searchYear}) → "${f.foundTitle}" (${f.foundYear})`);
        console.log(`  Year difference: ${f.yearDiff} years | Recommendations: ${f.recs}`);
      });
      console.log('');
      if (foundWithYearDiff.length > 10) {
        console.log(`... and ${foundWithYearDiff.length - 10} more year mismatches`);
        console.log('');
      }
    }

    // Show sample of truly missing
    if (trulyMissingList.length > 0) {
      console.log('=== SAMPLE: TRULY MISSING (Top 20 by recommendation count) ===');
      console.log('');
      trulyMissingList
        .sort((a, b) => b.recs - a.recs)
        .slice(0, 20)
        .forEach(f => {
          console.log(`"${f.title}" (${f.year}) - ${f.recs} recommendations`);
        });
      console.log('');
    }

    // Export truly missing to CSV
    if (trulyMissing > 0) {
      const csvPath = './output/truly-missing-films.csv';
      const csvHeader = 'title,year,recommendation_count\n';
      const csvRows = trulyMissingList
        .sort((a, b) => b.recs - a.recs)
        .map(f => `"${f.title.replace(/"/g, '""')}",${f.year},${f.recs}`)
        .join('\n');

      await fs.writeFile(csvPath, csvHeader + csvRows);
      console.log(`📊 Exported ${trulyMissing.toLocaleString()} truly missing films to: ${csvPath}`);
      console.log('');
    }

    console.log('=== RECOMMENDATION ===');
    console.log('');
    if (trulyMissing < missingFilms.length * 0.1) {
      console.log(`✅ Only ${((trulyMissing / missingFilms.length) * 100).toFixed(1)}% are truly missing!`);
      console.log(`   Most "missing" films are already in catalog with title/year variations.`);
      console.log('');
      console.log('Next: Add only the truly missing films via TMDB search.');
    } else {
      console.log(`⚠️ ${((trulyMissing / missingFilms.length) * 100).toFixed(1)}% are truly missing.`);
      console.log('');
      console.log('Next: Proceed with TMDB search for missing films.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

batchDryRun().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
