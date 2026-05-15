/**
 * Analyze Missing MoreIdeas Recommendations
 *
 * Find which recommended movies are NOT in our catalog
 * Show recommendation frequency to identify candidates for addition
 */

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function analyzeRecommendations() {
  console.log('🔍 Analyzing MoreIdeas Recommendations\n');

  // Get all unique recommendations and check catalog matches
  const result = await pool.query(`
    WITH ideas_expanded AS (
      SELECT
        idea->>'title' as title,
        (idea->>'year')::int as year,
        COUNT(*) as recommendation_count
      FROM more_ideas,
           jsonb_array_elements(ideas) as idea
      GROUP BY idea->>'title', (idea->>'year')::int
    )
    SELECT
      ie.title,
      ie.year,
      ie.recommendation_count,
      m.tmdb_id IS NOT NULL as in_catalog,
      m.poster_url IS NOT NULL AND m.poster_url != '' as has_poster
    FROM ideas_expanded ie
    LEFT JOIN movies m ON
      LOWER(TRIM(m.title)) = LOWER(TRIM(ie.title))
      AND m.year = ie.year
    ORDER BY ie.recommendation_count DESC
  `);

  const all = result.rows;
  const inCatalog = all.filter(r => r.in_catalog);
  const missing = all.filter(r => !r.in_catalog);

  // Summary stats
  console.log('═══════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════\n');
  console.log(`Total unique recommendations: ${all.length}`);
  console.log(`In catalog: ${inCatalog.length} (${(inCatalog.length / all.length * 100).toFixed(1)}%)`);
  console.log(`Missing from catalog: ${missing.length} (${(missing.length / all.length * 100).toFixed(1)}%)`);
  console.log('');

  // Top missing movies by recommendation count
  console.log('═══════════════════════════════════════');
  console.log('TOP 100 MISSING MOVIES (Most Recommended)');
  console.log('═══════════════════════════════════════\n');

  missing.slice(0, 100).forEach((movie, i) => {
    console.log(`${(i + 1).toString().padStart(3)}. ${movie.title} (${movie.year}) - ${movie.recommendation_count}x`);
  });

  // Frequency distribution
  console.log('\n═══════════════════════════════════════');
  console.log('RECOMMENDATION FREQUENCY DISTRIBUTION');
  console.log('═══════════════════════════════════════\n');

  const freqBuckets = {
    '10+': missing.filter(m => m.recommendation_count >= 10).length,
    '5-9': missing.filter(m => m.recommendation_count >= 5 && m.recommendation_count < 10).length,
    '3-4': missing.filter(m => m.recommendation_count >= 3 && m.recommendation_count < 5).length,
    '2': missing.filter(m => m.recommendation_count === 2).length,
    '1': missing.filter(m => m.recommendation_count === 1).length
  };

  console.log('Missing movies by recommendation frequency:');
  console.log(`  10+ times: ${freqBuckets['10+']} movies`);
  console.log(`  5-9 times: ${freqBuckets['5-9']} movies`);
  console.log(`  3-4 times: ${freqBuckets['3-4']} movies`);
  console.log(`  2 times: ${freqBuckets['2']} movies`);
  console.log(`  1 time: ${freqBuckets['1']} movies`);

  // High-value candidates (recommended 5+ times)
  const highValue = missing.filter(m => m.recommendation_count >= 5);

  console.log('\n═══════════════════════════════════════');
  console.log(`HIGH-VALUE CANDIDATES (${highValue.length} movies)`);
  console.log('═══════════════════════════════════════\n');
  console.log('Movies recommended 5+ times - strong candidates for adding to catalog:\n');

  highValue.forEach((movie, i) => {
    console.log(`${i + 1}. ${movie.title} (${movie.year}) - ${movie.recommendation_count}x`);
  });

  // Export to file
  const fs = await import('fs/promises');

  const csvLines = [
    'title,year,recommendation_count,in_catalog',
    ...missing.map(m => `"${m.title}",${m.year},${m.recommendation_count},false`)
  ];

  await fs.writeFile('/tmp/missing-recommendations.csv', csvLines.join('\n'));

  console.log('\n✅ Full list exported to: /tmp/missing-recommendations.csv');
  console.log('');

  await pool.end();
}

analyzeRecommendations().catch(console.error);
