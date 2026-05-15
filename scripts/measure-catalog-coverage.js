#!/usr/bin/env node
/**
 * measure-catalog-coverage.js
 *
 * Measures complete catalog coverage across all 8 core features and saves
 * a daily snapshot to the coverage_snapshots table.
 *
 * The 8 Core Features:
 * 1. Title
 * 2. Year
 * 3. Poster
 * 4. Slug
 * 5. Trailer
 * 6. Contributors
 * 7. WhyWatch
 * 8. MoreIdeas
 *
 * Usage:
 *   node --env-file=.env.local scripts/measure-catalog-coverage.js
 *   node --env-file=.env.local scripts/measure-catalog-coverage.js --save
 *
 * Without --save flag, shows report without saving to database.
 */

import pg from 'pg';
const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const saveSnapshot = process.argv.includes('--save');

async function measureCoverage() {
  const client = await pool.connect();

  try {
    const today = new Date().toISOString().split('T')[0];

    console.log('=== CATALOG COVERAGE MEASUREMENT ===');
    console.log(`Date: ${today}`);
    console.log(`Mode: ${saveSnapshot ? '💾 SAVE TO DATABASE' : '📊 REPORT ONLY'}`);
    console.log('');

    // Total catalog size
    const totalResult = await client.query('SELECT COUNT(*) FROM movies');
    const totalCatalog = parseInt(totalResult.rows[0].count);

    console.log(`Total movies in catalog: ${totalCatalog.toLocaleString()}`);
    console.log('');

    // Measure each of the 8 features
    console.log('📊 MEASURING CORE FEATURES (8 total)');
    console.log('');

    const features = {};

    // 1. Title (required field, should be 100%)
    const titleResult = await client.query(`
      SELECT COUNT(*) FROM movies
      WHERE title IS NOT NULL AND title != ''
    `);
    features.has_title = parseInt(titleResult.rows[0].count);

    // 2. Year (required field, should be 100%)
    const yearResult = await client.query(`
      SELECT COUNT(*) FROM movies
      WHERE year IS NOT NULL
    `);
    features.has_year = parseInt(yearResult.rows[0].count);

    // 3. Poster
    const posterResult = await client.query(`
      SELECT COUNT(*) FROM movies
      WHERE poster_url IS NOT NULL AND poster_url != ''
    `);
    features.has_poster = parseInt(posterResult.rows[0].count);

    // 4. Slug
    const slugResult = await client.query(`
      SELECT COUNT(*) FROM movies
      WHERE slug IS NOT NULL AND slug != ''
    `);
    features.has_slug = parseInt(slugResult.rows[0].count);

    // 5. Trailer
    const trailerResult = await client.query(`
      SELECT COUNT(*) FROM movies
      WHERE trailer_url IS NOT NULL AND trailer_url != ''
    `);
    features.has_trailer = parseInt(trailerResult.rows[0].count);

    // 6. Contributors
    const contributorsResult = await client.query(`
      SELECT COUNT(*) FROM movies
      WHERE contributors_json IS NOT NULL
    `);
    features.has_contributors = parseInt(contributorsResult.rows[0].count);

    // 7. WhyWatch
    const whyWatchResult = await client.query(`
      SELECT COUNT(DISTINCT movie_id) FROM enhanced_why_watch
    `);
    features.has_whywatch = parseInt(whyWatchResult.rows[0].count);

    // 8. MoreIdeas
    const moreIdeasResult = await client.query(`
      SELECT COUNT(DISTINCT movie_id) FROM more_ideas
      WHERE movie_id IS NOT NULL
    `);
    features.has_moreideas = parseInt(moreIdeasResult.rows[0].count);

    // Print feature breakdown
    console.log('Feature         | Coverage | Missing  | %');
    console.log('----------------|----------|----------|-------');

    const featureList = [
      { name: 'Title', count: features.has_title },
      { name: 'Year', count: features.has_year },
      { name: 'Poster', count: features.has_poster },
      { name: 'Slug', count: features.has_slug },
      { name: 'Trailer', count: features.has_trailer },
      { name: 'Contributors', count: features.has_contributors },
      { name: 'WhyWatch', count: features.has_whywatch },
      { name: 'MoreIdeas', count: features.has_moreideas }
    ];

    featureList.forEach(f => {
      const pct = ((f.count / totalCatalog) * 100).toFixed(1);
      const missing = totalCatalog - f.count;
      console.log(
        `${f.name.padEnd(15)} | ${f.count.toLocaleString().padStart(8)} | ${missing.toLocaleString().padStart(8)} | ${pct.padStart(5)}%`
      );
    });

    console.log('');

    // Completeness tiers
    console.log('📊 COMPLETENESS ANALYSIS');
    console.log('');

    // Movies with ALL 8 features
    const completeAll8 = await client.query(`
      SELECT COUNT(*) FROM movies m
      WHERE m.title IS NOT NULL AND m.title != ''
        AND m.year IS NOT NULL
        AND m.poster_url IS NOT NULL AND m.poster_url != ''
        AND m.slug IS NOT NULL AND m.slug != ''
        AND m.trailer_url IS NOT NULL AND m.trailer_url != ''
        AND m.contributors_json IS NOT NULL
        AND EXISTS (SELECT 1 FROM enhanced_why_watch WHERE movie_id = m.id)
        AND EXISTS (SELECT 1 FROM more_ideas WHERE movie_id = m.id)
    `);

    // Movies with 7 of 8 features
    const complete7of8 = await client.query(`
      SELECT COUNT(*) FROM movies m
      WHERE (
        CASE WHEN m.title IS NOT NULL AND m.title != '' THEN 1 ELSE 0 END +
        CASE WHEN m.year IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN m.poster_url IS NOT NULL AND m.poster_url != '' THEN 1 ELSE 0 END +
        CASE WHEN m.slug IS NOT NULL AND m.slug != '' THEN 1 ELSE 0 END +
        CASE WHEN m.trailer_url IS NOT NULL AND m.trailer_url != '' THEN 1 ELSE 0 END +
        CASE WHEN m.contributors_json IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM enhanced_why_watch WHERE movie_id = m.id) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM more_ideas WHERE movie_id = m.id) THEN 1 ELSE 0 END
      ) = 7
    `);

    // Movies with 6 of 8 features
    const complete6of8 = await client.query(`
      SELECT COUNT(*) FROM movies m
      WHERE (
        CASE WHEN m.title IS NOT NULL AND m.title != '' THEN 1 ELSE 0 END +
        CASE WHEN m.year IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN m.poster_url IS NOT NULL AND m.poster_url != '' THEN 1 ELSE 0 END +
        CASE WHEN m.slug IS NOT NULL AND m.slug != '' THEN 1 ELSE 0 END +
        CASE WHEN m.trailer_url IS NOT NULL AND m.trailer_url != '' THEN 1 ELSE 0 END +
        CASE WHEN m.contributors_json IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM enhanced_why_watch WHERE movie_id = m.id) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM more_ideas WHERE movie_id = m.id) THEN 1 ELSE 0 END
      ) = 6
    `);

    const countAll8 = parseInt(completeAll8.rows[0].count);
    const count7of8 = parseInt(complete7of8.rows[0].count);
    const count6of8 = parseInt(complete6of8.rows[0].count);

    const pctAll8 = ((countAll8 / totalCatalog) * 100).toFixed(1);
    const pct7of8 = ((count7of8 / totalCatalog) * 100).toFixed(1);
    const pct6of8 = ((count6of8 / totalCatalog) * 100).toFixed(1);

    console.log(`Complete (all 8 features): ${countAll8.toLocaleString()} (${pctAll8}%)`);
    console.log(`Complete (7 of 8): ${count7of8.toLocaleString()} (${pct7of8}%)`);
    console.log(`Complete (6 of 8): ${count6of8.toLocaleString()} (${pct6of8}%)`);
    console.log(`Incomplete: ${(totalCatalog - countAll8).toLocaleString()} (${(100 - pctAll8).toFixed(1)}%)`);
    console.log('');

    // External coverage (MoreIdeas recommendations)
    console.log('📊 EXTERNAL COVERAGE (MoreIdeas Recommendations)');
    console.log('');

    const externalCoverage = await client.query(`
      SELECT
        COUNT(*) as total_recommended,
        SUM(CASE WHEN catalog_status IN ('exact_match', 'normalized_match', 'fuzzy_year_match') THEN 1 ELSE 0 END) as in_catalog,
        SUM(CASE WHEN catalog_status = 'missing' THEN 1 ELSE 0 END) as missing,
        SUM(CASE WHEN catalog_status = 'missing' AND recommendation_count >= 8 THEN 1 ELSE 0 END) as high_priority
      FROM more_ideas_frequency
    `);

    const external = externalCoverage.rows[0];
    const recommendedTotal = parseInt(external.total_recommended);
    const recommendedInCatalog = parseInt(external.in_catalog);
    const recommendedMissing = parseInt(external.missing);
    const recommendedHighPriority = parseInt(external.high_priority);

    const externalCoveragePct = ((recommendedInCatalog / recommendedTotal) * 100).toFixed(1);

    console.log(`Total films recommended: ${recommendedTotal.toLocaleString()}`);
    console.log(`  In catalog: ${recommendedInCatalog.toLocaleString()} (${externalCoveragePct}%)`);
    console.log(`  Missing: ${recommendedMissing.toLocaleString()} (${(100 - externalCoveragePct).toFixed(1)}%)`);
    console.log(`  High priority missing (8+ recs): ${recommendedHighPriority.toLocaleString()}`);
    console.log('');

    // Save snapshot to database if --save flag provided
    if (saveSnapshot) {
      console.log('💾 SAVING SNAPSHOT TO DATABASE');
      console.log('');

      // Check if snapshot for today already exists
      const existing = await client.query(
        'SELECT snapshot_date FROM coverage_snapshots WHERE snapshot_date = $1',
        [today]
      );

      if (existing.rows.length > 0) {
        console.log('⚠️ Snapshot for today already exists, updating...');

        await client.query(`
          UPDATE coverage_snapshots SET
            total_catalog = $1,
            has_title = $2,
            has_year = $3,
            has_poster = $4,
            has_slug = $5,
            has_trailer = $6,
            has_contributors = $7,
            has_whywatch = $8,
            has_moreideas = $9,
            complete_all_8 = $10,
            complete_7_of_8 = $11,
            complete_6_of_8 = $12,
            recommended_total = $13,
            recommended_in_catalog = $14,
            recommended_missing = $15,
            recommended_high_priority = $16,
            created_at = NOW()
          WHERE snapshot_date = $17
        `, [
          totalCatalog,
          features.has_title,
          features.has_year,
          features.has_poster,
          features.has_slug,
          features.has_trailer,
          features.has_contributors,
          features.has_whywatch,
          features.has_moreideas,
          countAll8,
          count7of8,
          count6of8,
          recommendedTotal,
          recommendedInCatalog,
          recommendedMissing,
          recommendedHighPriority,
          today
        ]);

        console.log('✅ Snapshot updated');
      } else {
        await client.query(`
          INSERT INTO coverage_snapshots (
            snapshot_date,
            total_catalog,
            has_title,
            has_year,
            has_poster,
            has_slug,
            has_trailer,
            has_contributors,
            has_whywatch,
            has_moreideas,
            complete_all_8,
            complete_7_of_8,
            complete_6_of_8,
            recommended_total,
            recommended_in_catalog,
            recommended_missing,
            recommended_high_priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
          today,
          totalCatalog,
          features.has_title,
          features.has_year,
          features.has_poster,
          features.has_slug,
          features.has_trailer,
          features.has_contributors,
          features.has_whywatch,
          features.has_moreideas,
          countAll8,
          count7of8,
          count6of8,
          recommendedTotal,
          recommendedInCatalog,
          recommendedMissing,
          recommendedHighPriority
        ]);

        console.log('✅ Snapshot saved');
      }

      console.log('');
    } else {
      console.log('📊 REPORT ONLY MODE - Not saving to database');
      console.log('');
      console.log('To save this snapshot, run:');
      console.log('  node --env-file=.env.local scripts/measure-catalog-coverage.js --save');
      console.log('');
    }

    console.log('✅ Measurement complete!');

  } catch (error) {
    console.error('❌ Error measuring coverage:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

measureCoverage().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
