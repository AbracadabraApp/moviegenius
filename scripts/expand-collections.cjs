/**
 * Production Collection Expansion Script
 *
 * Processes all collections with <6 movies and generates expansion candidates
 * using co-occurrence analysis with name similarity weighting.
 *
 * Estimated runtime: ~1.5 hours for 7,516 collections
 * Cost: $0 (database-only, no API calls)
 *
 * Results stored in browse_lists.expansion_candidates JSONB column
 */

const { Pool } = require('pg');
const fs = require('fs');

// Jaccard similarity on word sets
function calculateNameSimilarity(name1, name2) {
  const words1 = new Set(name1.toLowerCase().split(/\s+/));
  const words2 = new Set(name2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

async function expandCollections() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('PRODUCTION COLLECTION EXPANSION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all collections with <6 movies
    const collectionsQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active' AND total_movies < 6
      ORDER BY total_movies ASC, title
    `;
    const collections = await pool.query(collectionsQuery);
    const total = collections.rows.length;

    console.log(`Processing ${total.toLocaleString()} collections...\n`);
    console.log('Starting expansion analysis...\n');

    const stats = {
      processed: 0,
      successful: 0,
      noCandidates: 0,
      canReach6: 0,
      totalCandidatesFound: 0,
      errors: []
    };

    const startTime = Date.now();
    let lastCheckpoint = 0;

    for (let idx = 0; idx < collections.rows.length; idx++) {
      const collection = collections.rows[idx];

      try {
        // Get current movies
        const moviesQuery = `
          SELECT m.id, m.tmdb_id, m.title, m.year
          FROM movies m
          JOIN list_movies lm ON m.id = lm.movie_id
          WHERE lm.list_id = $1
          ORDER BY lm.display_order
        `;
        const movies = await pool.query(moviesQuery, [collection.id]);

        if (movies.rows.length === 0) {
          stats.processed++;
          continue;
        }

        // Find co-occurring movies with scoring
        const candidates = new Map(); // tmdb_id -> { title, year, rawCount, weightedScore }

        for (const movie of movies.rows) {
          // Find other collections containing this movie
          const otherCollectionsQuery = `
            SELECT DISTINCT bl.id, bl.title
            FROM browse_lists bl
            JOIN list_movies lm ON bl.id = lm.list_id
            WHERE lm.movie_id = $1
              AND bl.status = 'active'
              AND bl.id != $2
          `;
          const otherCollections = await pool.query(otherCollectionsQuery, [
            movie.id,
            collection.id
          ]);

          for (const otherCollection of otherCollections.rows) {
            const nameSimilarity = calculateNameSimilarity(
              collection.title,
              otherCollection.title
            );

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
            const cooccurring = await pool.query(cooccurringQuery, [
              otherCollection.id,
              collection.id
            ]);

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

        // Calculate hybrid scores and get top 10
        const scoredCandidates = Array.from(candidates.entries())
          .map(([tmdbId, data]) => ({
            tmdbId: parseInt(tmdbId),
            title: data.title,
            year: data.year,
            rawCount: data.rawCount,
            avgSimilarity: parseFloat((data.weightedScore / data.rawCount).toFixed(3)),
            hybridScore: parseFloat((data.rawCount * (1 + data.weightedScore / data.rawCount)).toFixed(2))
          }))
          .sort((a, b) => b.hybridScore - a.hybridScore)
          .slice(0, 10);

        // Store results
        const expansionData = {
          candidates: scoredCandidates,
          generated_at: new Date().toISOString(),
          potential_size: collection.total_movies + scoredCandidates.length,
          analysis_version: '1.0'
        };

        await pool.query(
          `UPDATE browse_lists
           SET expansion_candidates = $1
           WHERE id = $2`,
          [JSON.stringify(expansionData), collection.id]
        );

        // Update stats
        stats.processed++;
        if (scoredCandidates.length > 0) {
          stats.successful++;
          stats.totalCandidatesFound += scoredCandidates.length;
          if (expansionData.potential_size >= 6) {
            stats.canReach6++;
          }
        } else {
          stats.noCandidates++;
        }

        // Progress indicator every 50 collections
        if ((idx + 1) % 50 === 0 || idx === collections.rows.length - 1) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = stats.processed / elapsed;
          const remaining = total - stats.processed;
          const eta = remaining / rate;

          process.stdout.write(
            `  Progress: ${stats.processed}/${total} ` +
            `(${((stats.processed / total) * 100).toFixed(1)}%) | ` +
            `${rate.toFixed(1)}/sec | ` +
            `ETA: ${Math.round(eta / 60)}min     \r`
          );
        }

        // Checkpoint every 100 collections
        if (stats.processed - lastCheckpoint >= 100) {
          const checkpoint = {
            timestamp: new Date().toISOString(),
            processed: stats.processed,
            total: total,
            percent: ((stats.processed / total) * 100).toFixed(1)
          };
          fs.writeFileSync(
            '/tmp/expansion-checkpoint.json',
            JSON.stringify(checkpoint, null, 2)
          );
          lastCheckpoint = stats.processed;
        }

      } catch (error) {
        stats.errors.push({
          collection_id: collection.id,
          collection_title: collection.title,
          error: error.message
        });
        stats.processed++;
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('EXPANSION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total collections processed: ${stats.processed.toLocaleString()}`);
    console.log(`Successful expansions: ${stats.successful.toLocaleString()} (${((stats.successful / stats.processed) * 100).toFixed(1)}%)`);
    console.log(`Collections with no candidates: ${stats.noCandidates.toLocaleString()}`);
    console.log(`Collections that can reach ≥6: ${stats.canReach6.toLocaleString()} (${((stats.canReach6 / stats.processed) * 100).toFixed(1)}%)`);
    console.log(`Average candidates per collection: ${(stats.totalCandidatesFound / stats.successful).toFixed(1)}`);
    console.log(`\nTotal time: ${Math.round(totalTime / 60)} minutes (${totalTime.toFixed(1)} seconds)`);
    console.log(`Processing rate: ${(stats.processed / totalTime).toFixed(2)} collections/second\n`);

    if (stats.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${stats.errors.length}`);
      console.log('\nFirst 10 errors:');
      stats.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. "${err.collection_title}" (${err.collection_id})`);
        console.log(`     Error: ${err.error}`);
      });

      // Write full error log
      fs.writeFileSync(
        '/tmp/expansion-errors.json',
        JSON.stringify(stats.errors, null, 2)
      );
      console.log('\nFull error log written to /tmp/expansion-errors.json\n');
    }

    // Sample results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SAMPLE RESULTS (5 Random Collections)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sampleQuery = `
      SELECT id, title, total_movies, expansion_candidates
      FROM browse_lists
      WHERE status = 'active'
        AND total_movies < 6
        AND expansion_candidates IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 5
    `;
    const samples = await pool.query(sampleQuery);

    samples.rows.forEach((sample, i) => {
      const expansion = sample.expansion_candidates;
      console.log(`${i + 1}. "${sample.title}"`);
      console.log(`   Current: ${sample.total_movies} movies → Potential: ${expansion.potential_size} movies`);
      console.log(`   Top 3 candidates:`);
      expansion.candidates.slice(0, 3).forEach((c, j) => {
        console.log(`     ${j + 1}. ${c.title} (${c.year}) - score: ${c.hybridScore}`);
      });
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the expansion
expandCollections();
