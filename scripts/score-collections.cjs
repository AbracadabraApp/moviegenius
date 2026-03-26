/**
 * score-collections.cjs
 *
 * Scores every active browse_list by how many honored movies it contains.
 * Uses a single bulk SQL UPDATE — runs in seconds regardless of collection count.
 *
 * Honored list: AFI Top 100 + Criterion Collection Top 70 (Rotten Tomatoes)
 *
 * Run: node --env-file=.env.local scripts/score-collections.cjs
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Combined honored tmdb_ids: AFI Top 100 + Criterion Top 70
const HONORED = [
  // AFI Top 100
  11, 12, 33, 62, 78, 93, 105, 111, 120, 137, 143, 185, 213, 238, 240, 244,
  280, 287, 288, 343, 348, 389, 408, 424, 426, 475, 521, 567, 576, 595, 597,
  601, 629, 630, 639, 642, 665, 680, 703, 756, 769, 770, 793, 804, 808, 821,
  828, 829, 857, 858, 862, 877, 881, 901, 947, 963, 967, 981, 990, 995, 1092,
  1366, 1578, 1585, 1939, 2039, 2280, 2323, 3078, 3089, 3110, 3114, 3170,
  5693, 6844, 8587, 9390, 10020, 10895, 11224, 11549, 11694, 11787, 11881,
  11977, 12102, 15794, 17641, 17687, 18254, 18900, 19140, 20283, 24226, 25431,
  27899, 28963, 29005, 35119, 37257,
  // Criterion Top 70 (additional — not already in AFI)
  147, 216, 269, 405, 406, 422, 499, 648, 649, 655, 704, 789, 827, 832, 851,
  895, 905, 940, 985, 1018, 1093, 1554, 1628, 1678, 1786, 1933, 3082, 3782,
  5156, 5165, 5511, 7857, 8816, 10086, 10331, 10971, 11104, 11368, 11502,
  11655, 14807, 15244, 15383, 15804, 16093, 16306, 17295, 17905, 20108, 20530,
  25237, 25468, 25623, 25670, 26302, 30959, 31417, 32015, 36095, 40423, 41791,
  43003, 46918, 5961, 16391, 758866,
  // Criterion Top 100 films #71–100 (additional — not already in list)
  780, 5801, 11020, 10403, 10227, 9056, 548, 19542, 307, 11257,
  776, 9538, 11159, 346, 4495, 1398, 11830, 843, 110, 36819,
  18148, 204, 36040, 614, 29845, 11878, 2721, 833,
];

// Deduplicate
const honored = [...new Set(HONORED)];

async function run() {
  const client = await pool.connect();
  try {
    // Ensure column exists
    await client.query(`
      ALTER TABLE browse_lists
      ADD COLUMN IF NOT EXISTS quality_score INT NOT NULL DEFAULT 0
    `);
    console.log('✓ quality_score column ready');
    console.log(`Scoring with ${honored.length} honored films...`);

    // Single bulk UPDATE: count honored overlaps per collection via JSONB
    const result = await client.query(`
      UPDATE browse_lists bl
      SET quality_score = overlap.score
      FROM (
        SELECT
          bl2.id,
          COUNT(*) FILTER (
            WHERE (mv->>'tmdb_id')::int = ANY($1::int[])
          ) AS score
        FROM browse_lists bl2,
             jsonb_array_elements(bl2.editorial_data->'subcategories') sub,
             jsonb_array_elements(sub->'movies') mv
        WHERE bl2.status = 'active'
          AND bl2.editorial_data IS NOT NULL
          AND (mv->>'tmdb_id') IS NOT NULL
          AND (mv->>'tmdb_id') != 'null'
        GROUP BY bl2.id
      ) overlap
      WHERE bl.id = overlap.id
    `, [honored]);

    console.log(`✓ Updated ${result.rowCount} collections`);

    // Distribution
    const dist = await client.query(`
      SELECT quality_score, COUNT(*) AS collections
      FROM browse_lists
      WHERE status = 'active'
      GROUP BY quality_score
      ORDER BY quality_score DESC
      LIMIT 12
    `);
    console.log('\nScore distribution:');
    dist.rows.forEach(r =>
      console.log(`  score ${r.quality_score}: ${r.collections} collections`)
    );

    // Top 10 collections
    const top = await client.query(`
      SELECT revised_title, quality_score
      FROM browse_lists
      WHERE status = 'active' AND quality_score > 0
      ORDER BY quality_score DESC
      LIMIT 10
    `);
    console.log('\nTop 10 collections by quality score:');
    top.rows.forEach(r => console.log(`  [${r.quality_score}] ${r.revised_title}`));

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
