/**
 * Quick Stats Analysis: Collection Growth via Co-occurrence
 * Analyzes 100 random collections to measure growth potential
 */

const { Pool } = require('pg');

function calculateNameSimilarity(name1, name2) {
  const words1 = new Set(name1.toLowerCase().split(/\s+/));
  const words2 = new Set(name2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('═══════════════════════════════════════════════');
  console.log('COLLECTION GROWTH STATS - 100 Sample Collections');
  console.log('═══════════════════════════════════════════════\n');

  // Get 100 collections with <6 movies
  const collectionsQuery = `
    SELECT id, title, total_movies
    FROM browse_lists
    WHERE status = 'active' AND total_movies < 6
    ORDER BY RANDOM()
    LIMIT 100
  `;
  const collections = await pool.query(collectionsQuery);

  const stats = {
    total: collections.rows.length,
    withCooccurrence: 0,
    canReach6Raw: 0,
    canReach6Weighted: 0,
    avgRawCandidates: 0,
    avgWeightedCandidates: 0,
    totalRawCandidates: 0,
    totalWeightedCandidates: 0
  };

  console.log(`Analyzing ${stats.total} collections...\n`);

  for (let idx = 0; idx < collections.rows.length; idx++) {
    const collection = collections.rows[idx];

    if (idx % 20 === 0) {
      process.stdout.write(`Progress: ${idx}/${stats.total}...\r`);
    }

    // Get movies
    const moviesQuery = `
      SELECT m.id, m.tmdb_id
      FROM movies m
      JOIN list_movies lm ON m.id = lm.movie_id
      WHERE lm.list_id = $1
    `;
    const movies = await pool.query(moviesQuery, [collection.id]);

    if (movies.rows.length === 0) continue;

    // Find co-occurring movies
    const cooccurringMovies = new Map();

    for (const movie of movies.rows) {
      // Find other collections this movie appears in
      const otherCollectionsQuery = `
        SELECT DISTINCT bl.id, bl.title
        FROM browse_lists bl
        JOIN list_movies lm ON bl.id = lm.list_id
        WHERE lm.movie_id = $1
          AND bl.status = 'active'
          AND bl.id != $2
      `;
      const otherCollections = await pool.query(otherCollectionsQuery, [movie.id, collection.id]);

      for (const otherCollection of otherCollections.rows) {
        const nameSimilarity = calculateNameSimilarity(collection.title, otherCollection.title);

        // Get movies from that collection
        const cooccurringQuery = `
          SELECT m.tmdb_id
          FROM movies m
          JOIN list_movies lm ON m.id = lm.movie_id
          WHERE lm.list_id = $1
            AND m.tmdb_id NOT IN (
              SELECT m2.tmdb_id
              FROM movies m2
              JOIN list_movies lm2 ON m2.id = lm2.movie_id
              WHERE lm2.list_id = $2
            )
        `;
        const cooccurring = await pool.query(cooccurringQuery, [otherCollection.id, collection.id]);

        for (const coMovie of cooccurring.rows) {
          if (!cooccurringMovies.has(coMovie.tmdb_id)) {
            cooccurringMovies.set(coMovie.tmdb_id, { rawCount: 0, weightedScore: 0 });
          }
          const entry = cooccurringMovies.get(coMovie.tmdb_id);
          entry.rawCount++;
          entry.weightedScore += nameSimilarity;
        }
      }
    }

    // Calculate stats
    const rawCandidates = cooccurringMovies.size;
    const weightedCandidates = Array.from(cooccurringMovies.values())
      .filter(m => m.weightedScore > 0.5)
      .length;

    if (rawCandidates > 0) {
      stats.withCooccurrence++;
      stats.totalRawCandidates += rawCandidates;
      stats.totalWeightedCandidates += weightedCandidates;
    }

    if (collection.total_movies + Math.min(rawCandidates, 10) >= 6) {
      stats.canReach6Raw++;
    }

    if (collection.total_movies + Math.min(weightedCandidates, 10) >= 6) {
      stats.canReach6Weighted++;
    }
  }

  stats.avgRawCandidates = (stats.totalRawCandidates / stats.withCooccurrence).toFixed(1);
  stats.avgWeightedCandidates = (stats.totalWeightedCandidates / stats.withCooccurrence).toFixed(1);

  console.log('\n\n═══════════════════════════════════════════════');
  console.log('RESULTS');
  console.log('═══════════════════════════════════════════════\n');

  console.log(`Total collections analyzed: ${stats.total}`);
  console.log(`Collections with co-occurrence data: ${stats.withCooccurrence} (${((stats.withCooccurrence/stats.total)*100).toFixed(1)}%)\n`);

  console.log('RAW CO-OCCURRENCE (pure frequency):');
  console.log(`  Can reach >=6: ${stats.canReach6Raw} (${((stats.canReach6Raw/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Avg candidates per collection: ${stats.avgRawCandidates}\n`);

  console.log('WEIGHTED BY NAME SIMILARITY:');
  console.log(`  Can reach >=6: ${stats.canReach6Weighted} (${((stats.canReach6Weighted/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Avg high-similarity candidates: ${stats.avgWeightedCandidates}\n`);

  console.log('═══════════════════════════════════════════════');
  console.log('CONCLUSION');
  console.log('═══════════════════════════════════════════════\n');

  if (stats.canReach6Weighted > stats.total * 0.5) {
    console.log('✅ EXCELLENT: >50% of collections can reach >=6 with weighted approach');
    console.log('   Collection name similarity effectively filters for thematic relevance');
  } else if (stats.canReach6Raw > stats.total * 0.5) {
    console.log('✅ GOOD: >50% can reach >=6 with raw co-occurrence');
    console.log('⚠️  Name weighting may be too restrictive - consider hybrid approach');
  } else {
    console.log('⚠️  Co-occurrence alone insufficient for most collections');
    console.log('   Need to combine with More Ideas data');
  }

  await pool.end();
}

main();
