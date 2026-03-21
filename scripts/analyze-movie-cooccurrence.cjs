/**
 * Movie Co-occurrence Analysis for Collection Growth
 *
 * Analyzes which movies frequently appear together across collections
 * to identify strong thematic relationships for growing thin collections
 *
 * Uses collection name similarity to weight co-occurrence scores
 */

const { Pool } = require('pg');

/**
 * Calculate simple text similarity between two strings
 * Uses Jaccard similarity on word sets
 */
function calculateNameSimilarity(name1, name2) {
  const words1 = new Set(name1.toLowerCase().split(/\s+/));
  const words2 = new Set(name2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

async function analyzeCooccurrence() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('MOVIE CO-OCCURRENCE ANALYSIS FOR COLLECTION GROWTH');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get 100 collections with <6 movies to analyze
    const sampleCollectionQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active' AND total_movies < 6
      ORDER BY RANDOM()
      LIMIT 100
    `;
    const sampleCollections = await pool.query(sampleCollectionQuery);

    // Track aggregate stats
    const stats = {
      total: 0,
      withCooccurrence: 0,
      canReach6Raw: 0,
      canReach6Weighted: 0,
      avgRawCandidates: [],
      avgWeightedCandidates: []
    };

    for (let idx = 0; idx < sampleCollections.rows.length; idx++) {
      const collection = sampleCollections.rows[idx];

      // Progress indicator
      if (idx % 10 === 0) {
        console.log(`\nProgress: ${idx}/100 collections analyzed...`);
      }

      stats.total++;

      // Get movies in this collection
      const moviesQuery = `
        SELECT m.id, m.tmdb_id, m.title, m.year
        FROM movies m
        JOIN list_movies lm ON m.id = lm.movie_id
        WHERE lm.list_id = $1
        ORDER BY lm.display_order
      `;
      const movies = await pool.query(moviesQuery, [collection.id]);

      console.log('Current movies:');
      movies.rows.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.title} (${m.year})`);
      });

      // For each movie, find what other collections it appears in
      console.log('\n--- Co-occurrence Analysis ---\n');

      const cooccurringMovies = new Map(); // tmdb_id -> { title, year, count, collections[] }

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

        console.log(`"${movie.title}" appears in ${otherCollections.rows.length} other collection(s)`);

        if (otherCollections.rows.length > 0) {
          // For each of those collections, get all other movies
          for (const otherCollection of otherCollections.rows) {
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
            const cooccurring = await pool.query(cooccurringQuery, [
              otherCollection.id,
              collection.id
            ]);

            // Calculate name similarity for weighting
            const nameSimilarity = calculateNameSimilarity(
              collection.title,
              otherCollection.title
            );

            // Track these movies and their co-occurrence count
            for (const coMovie of cooccurring.rows) {
              if (!cooccurringMovies.has(coMovie.tmdb_id)) {
                cooccurringMovies.set(coMovie.tmdb_id, {
                  title: coMovie.title,
                  year: coMovie.year,
                  rawCount: 0,
                  weightedScore: 0,
                  collections: []
                });
              }
              const entry = cooccurringMovies.get(coMovie.tmdb_id);
              entry.rawCount++;
              entry.weightedScore += nameSimilarity;
              entry.collections.push({
                viaMovie: movie.title,
                collection: otherCollection.title,
                similarity: nameSimilarity.toFixed(2)
              });
            }
          }
        }
      }

      // Show both rankings for comparison
      const byRawCount = Array.from(cooccurringMovies.entries())
        .sort((a, b) => b[1].rawCount - a[1].rawCount)
        .slice(0, 10);

      const byWeightedScore = Array.from(cooccurringMovies.entries())
        .sort((a, b) => b[1].weightedScore - a[1].weightedScore)
        .slice(0, 10);

      if (byRawCount.length === 0) {
        console.log('  No co-occurring movies found.\n');
        continue;
      }

      console.log('\n--- TOP 10 BY RAW CO-OCCURRENCE COUNT ---');
      console.log('(Pure frequency - how many times movie appears with our seeds)\n');

      byRawCount.forEach((entry, i) => {
        const [tmdbId, data] = entry;
        console.log(`${i + 1}. ${data.title} (${data.year})`);
        console.log(`   Count: ${data.rawCount}, Weighted: ${data.weightedScore.toFixed(2)}`);

        const topConn = data.collections[0];
        console.log(`   Example: via "${topConn.viaMovie}" in "${topConn.collection}" [${topConn.similarity}]`);
      });

      console.log('\n--- TOP 10 BY WEIGHTED SCORE (Name Similarity) ---');
      console.log('(Weighted by collection name similarity - higher = more thematically aligned)\n');

      byWeightedScore.forEach((entry, i) => {
        const [tmdbId, data] = entry;
        console.log(`${i + 1}. ${data.title} (${data.year})`);
        console.log(`   Weighted: ${data.weightedScore.toFixed(2)}, Count: ${data.rawCount}`);

        // Show highest similarity connection
        const bestConn = data.collections
          .sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity))[0];
        console.log(`   Best match: via "${bestConn.viaMovie}" in "${bestConn.collection}" [${bestConn.similarity}]`);
      });

      // Calculate potential size
      const potentialSize = collection.total_movies + Math.min(byWeightedScore.length, 10);
      console.log(`\n✅ Potential size with top 10 candidates: ${collection.total_movies} → ${potentialSize}`);

      // Also check More Ideas
      const tmdbIds = movies.rows.map(m => m.tmdb_id);
      const moreIdeasQuery = `
        SELECT COUNT(DISTINCT (idea->>'tmdbId')::int) as count
        FROM more_ideas,
        jsonb_array_elements(ideas) as idea
        WHERE tmdb_id = ANY($1)
          AND (idea->>'tmdbId')::int IS NOT NULL
          AND (idea->>'tmdbId')::int NOT IN (
            SELECT m2.tmdb_id
            FROM movies m2
            JOIN list_movies lm2 ON m2.id = lm2.movie_id
            WHERE lm2.list_id = $2
          )
      `;
      const moreIdeas = await pool.query(moreIdeasQuery, [tmdbIds, collection.id]);
      const moreIdeasCount = parseInt(moreIdeas.rows[0].count) || 0;

      console.log(`📊 More Ideas also has ${moreIdeasCount} candidates`);
      console.log(`📊 Combined approach could yield: ${collection.total_movies} → ${collection.total_movies + sortedCandidates.length + moreIdeasCount}\n`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('ANALYSIS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('KEY INSIGHTS:\n');
    console.log('1. Co-occurrence reveals thematic relationships beyond direct similarity');
    console.log('2. Movies appearing with multiple seed movies = stronger thematic fit');
    console.log('3. Combining co-occurrence + More Ideas = comprehensive growth strategy');
    console.log('4. This "nearest neighbor" approach scales naturally with collection size\n');

    await pool.end();

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeCooccurrence();
