/**
 * Check Top 100 Pool Mix
 * See where directors rank in the featured algorithm
 */

import { getPool } from '../lib/database.js';

async function checkTop100Mix() {
  const pool = getPool();
  const dailySeed = 20260511;

  const result = await pool.query(`
    WITH editorial_counts AS (
      SELECT
        bl.id,
        COALESCE(bl.revised_title, bl.title) AS title,
        bl.categories,
        COUNT(*) AS movie_count
      FROM browse_lists bl,
           jsonb_array_elements(bl.editorial_data->'subcategories') sub,
           jsonb_array_elements(sub->'movies') mv
      WHERE bl.status = 'active'
        AND bl.is_suppressed IS NOT TRUE
        AND bl.editorial_data IS NOT NULL
        AND bl.editorial_data->'subcategories' IS NOT NULL
        AND (mv->>'tmdb_id') IS NOT NULL
        AND (mv->>'tmdb_id') != 'null'
        AND COALESCE(bl.revised_title, bl.title) NOT LIKE '[%'
        AND COALESCE(bl.revised_title, bl.title) NOT ILIKE '%NEEDS TITLE%'
      GROUP BY bl.id, bl.revised_title, bl.title, bl.categories
      HAVING COUNT(*) >= 15
    )
    SELECT
      ec.title,
      ec.categories,
      bl.quality_score,
      (bl.quality_score / NULLIF(MAX(bl.quality_score) OVER (), 0)) +
      (('x' || substr(md5(ec.id::text || $1::text), 1, 8))::bit(32)::int::float / 2147483647.0) as sort_score
    FROM editorial_counts ec
    JOIN browse_lists bl ON bl.id = ec.id
    ORDER BY sort_score DESC
    LIMIT 100
  `, [dailySeed]);

  const directors = result.rows.filter(r => r.categories && r.categories.includes('Directors'));
  const thematic = result.rows.filter(r => !r.categories || r.categories.indexOf('Directors') === -1);

  console.log('Top 100 pool breakdown:');
  console.log('  Directors:', directors.length);
  console.log('  Thematic:', thematic.length);

  if (directors.length > 0) {
    console.log('\nFirst 5 directors to appear:\n');
    directors.slice(0, 5).forEach(dir => {
      const rank = result.rows.findIndex(r => r.title === dir.title) + 1;
      console.log(`  #${rank}: ${dir.title} (quality: ${dir.quality_score}, sort: ${dir.sort_score.toFixed(4)})`);
    });
  } else {
    console.log('\n⚠️  NO DIRECTORS in top 100');
  }

  console.log('\nTop 5 thematic for comparison:\n');
  thematic.slice(0, 5).forEach((t, i) => {
    const rank = result.rows.findIndex(r => r.title === t.title) + 1;
    console.log(`  #${rank}: ${t.title} (quality: ${t.quality_score}, sort: ${t.sort_score.toFixed(4)})`);
  });

  await pool.end();
}

checkTop100Mix().catch(console.error);
