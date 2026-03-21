/**
 * Preview Collection Expansion Results
 * Shows 10 random collections and what movies would be added
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

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('PREVIEW: Collection Expansion Results (10 Random Collections)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get 10 random collections with <6 movies
  const collectionsQuery = `
    SELECT id, title, total_movies
    FROM browse_lists
    WHERE status = 'active' AND total_movies < 6
    ORDER BY RANDOM()
    LIMIT 10
  `;
  const collections = await pool.query(collectionsQuery);

  for (let idx = 0; idx < collections.rows.length; idx++) {
    const collection = collections.rows[idx];

    console.log(`\n[${ idx + 1}/10] ═══════════════════════════════════════════════════`);
    console.log(`COLLECTION: "${collection.title}"`);
    console.log(`Current size: ${collection.total_movies} movies`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Get current movies
    const currentMoviesQuery = `
      SELECT m.tmdb_id, m.title, m.year
      FROM movies m
      JOIN list_movies lm ON m.id = lm.movie_id
      WHERE lm.list_id = $1
      ORDER BY lm.display_order
    `;
    const currentMovies = await pool.query(currentMoviesQuery, [collection.id]);

    console.log('\nCurrent movies:');
    currentMovies.rows.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.title} (${m.year})`);
    });

    // Find co-occurring movies with scoring
    const candidates = new Map(); // tmdb_id -> { title, year, rawCount, weightedScore }

    for (const movie of currentMovies.rows) {
      // Find other collections
      const otherCollectionsQuery = `
        SELECT DISTINCT bl.id, bl.title
        FROM browse_lists bl
        JOIN list_movies lm ON bl.id = lm.list_id
        JOIN movies m ON lm.movie_id = m.id
        WHERE m.tmdb_id = $1
          AND bl.status = 'active'
          AND bl.id != $2
      `;
      const otherCollections = await pool.query(otherCollectionsQuery, [movie.tmdb_id, collection.id]);

      for (const otherCollection of otherCollections.rows) {
        const nameSimilarity = calculateNameSimilarity(collection.title, otherCollection.title);

        // Get movies from that collection
        const cooccurringQuery = `
          SELECT m.tmdb_id, m.title, m.year
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
          if (!candidates.has(coMovie.tmdb_id)) {
            candidates.set(coMovie.tmdb_id, {
              title: coMovie.title,
              year: coMovie.year,
              rawCount: 0,
              weightedScore: 0
            });
          }
          const entry = candidates.get(coMovie.tmdb_id);
          entry.rawCount++;
          entry.weightedScore += nameSimilarity;
        }
      }
    }

    if (candidates.size === 0) {
      console.log('\n❌ No co-occurrence candidates found');
      continue;
    }

    // Calculate hybrid scores and sort
    const scoredCandidates = Array.from(candidates.entries()).map(([tmdbId, data]) => ({
      tmdbId,
      title: data.title,
      year: data.year,
      rawCount: data.rawCount,
      avgSimilarity: (data.weightedScore / data.rawCount).toFixed(2),
      hybridScore: data.rawCount * (1 + data.weightedScore / data.rawCount)
    }));

    // Sort by hybrid score
    scoredCandidates.sort((a, b) => b.hybridScore - a.hybridScore);

    const top10 = scoredCandidates.slice(0, 10);

    console.log(`\nFound ${candidates.size} candidates via co-occurrence`);
    console.log(`\nTOP 10 CANDIDATES (by hybrid score):`);
    console.log('Score = Co-occurrence Count × (1 + Avg Name Similarity)\n');

    top10.forEach((candidate, i) => {
      console.log(`${i + 1}. ${candidate.title} (${candidate.year})`);
      console.log(`   Score: ${candidate.hybridScore.toFixed(1)} (count: ${candidate.rawCount}, sim: ${candidate.avgSimilarity})`);
    });

    const newSize = collection.total_movies + top10.length;
    console.log(`\n✅ Expansion: ${collection.total_movies} → ${newSize} movies (+${top10.length})`);

    if (newSize >= 6) {
      console.log('✅ Reaches ≥6 threshold');
    } else {
      console.log(`⚠️  Shortfall: ${6 - newSize} movies needed`);
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('This preview shows how the hybrid scoring approach works:');
  console.log('• High co-occurrence count = strong thematic connection');
  console.log('• Name similarity boost = additional relevance signal');
  console.log('• Hybrid score balances both factors for optimal ranking\n');

  await pool.end();
}

main();
