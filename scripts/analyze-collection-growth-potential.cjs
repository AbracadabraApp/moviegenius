/**
 * Comprehensive Collection Growth Analysis
 *
 * Analyzes all browse collections to determine growth potential using More Ideas data
 * Focuses on collections with <6 movies that could reach the threshold
 */

const { Pool } = require('pg');

async function analyzeCollectionGrowth() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('COLLECTION GROWTH POTENTIAL ANALYSIS - Using More Ideas Data');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all collections grouped by size
    const sizeDistributionQuery = `
      SELECT
        CASE
          WHEN total_movies >= 20 THEN '20+'
          WHEN total_movies >= 10 THEN '10-19'
          WHEN total_movies >= 6 THEN '6-9'
          WHEN total_movies >= 4 THEN '4-5'
          WHEN total_movies >= 2 THEN '2-3'
          ELSE '1'
        END as size_range,
        COUNT(*) as count,
        MIN(total_movies) as min_size,
        MAX(total_movies) as max_size
      FROM browse_lists
      WHERE status = 'active'
      GROUP BY size_range
      ORDER BY min_size DESC
    `;
    const distribution = await pool.query(sizeDistributionQuery);

    console.log('CURRENT COLLECTION DISTRIBUTION:\n');
    distribution.rows.forEach(row => {
      console.log(`  ${row.size_range.padEnd(8)} movies: ${row.count.toString().padStart(5)} collections`);
    });

    // Focus on collections with 1-5 movies (candidates for growth)
    const smallCollectionsQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active' AND total_movies < 6
      ORDER BY total_movies DESC, title
    `;
    const smallCollections = await pool.query(smallCollectionsQuery);

    console.log(`\n\n═══════════════════════════════════════════════════════════════`);
    console.log(`ANALYZING ${smallCollections.rows.length} COLLECTIONS WITH <6 MOVIES`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    // Track results
    const results = {
      byCurrentSize: {
        1: { total: 0, canGrow: 0, canReach6: 0, avgCandidates: [] },
        2: { total: 0, canGrow: 0, canReach6: 0, avgCandidates: [] },
        3: { total: 0, canGrow: 0, canReach6: 0, avgCandidates: [] },
        4: { total: 0, canGrow: 0, canReach6: 0, avgCandidates: [] },
        5: { total: 0, canGrow: 0, canReach6: 0, avgCandidates: [] }
      },
      examples: {
        great: [],      // Collections that can grow significantly (2x or more)
        good: [],       // Collections that can reach 6+ threshold
        limited: [],    // Collections with some growth but can't reach 6
        none: []        // Collections with no More Ideas data
      }
    };

    let processedCount = 0;

    for (const collection of smallCollections.rows) {
      processedCount++;

      // Progress indicator
      if (processedCount % 100 === 0) {
        process.stdout.write(`  Progress: ${processedCount}/${smallCollections.rows.length}...\r`);
      }

      const currentSize = collection.total_movies;

      // Get movies in this collection
      const moviesQuery = `
        SELECT m.tmdb_id
        FROM movies m
        JOIN list_movies lm ON m.id = lm.movie_id
        WHERE lm.list_id = $1
      `;
      const movies = await pool.query(moviesQuery, [collection.id]);
      const tmdbIds = movies.rows.map(m => m.tmdb_id);

      if (tmdbIds.length === 0) {
        results.byCurrentSize[currentSize].total++;
        continue;
      }

      // Count unique More Ideas candidates
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
      const moreIdeasResult = await pool.query(moreIdeasQuery, [tmdbIds, collection.id]);
      const candidateCount = parseInt(moreIdeasResult.rows[0].count) || 0;
      const potentialSize = currentSize + candidateCount;

      // Update stats
      results.byCurrentSize[currentSize].total++;
      results.byCurrentSize[currentSize].avgCandidates.push(candidateCount);

      if (candidateCount > 0) {
        results.byCurrentSize[currentSize].canGrow++;
      }

      if (potentialSize >= 6) {
        results.byCurrentSize[currentSize].canReach6++;
      }

      // Collect examples
      const example = {
        title: collection.title,
        current: currentSize,
        candidates: candidateCount,
        potential: potentialSize,
        growthFactor: candidateCount > 0 ? (potentialSize / currentSize).toFixed(1) : 0
      };

      if (candidateCount >= currentSize * 2) {
        if (results.examples.great.length < 10) {
          results.examples.great.push(example);
        }
      } else if (potentialSize >= 6) {
        if (results.examples.good.length < 10) {
          results.examples.good.push(example);
        }
      } else if (candidateCount > 0) {
        if (results.examples.limited.length < 10) {
          results.examples.limited.push(example);
        }
      } else {
        if (results.examples.none.length < 10) {
          results.examples.none.push(example);
        }
      }
    }

    console.log('\n');

    // Print results by current size
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('GROWTH POTENTIAL BY CURRENT COLLECTION SIZE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (let size = 5; size >= 1; size--) {
      const data = results.byCurrentSize[size];
      if (data.total === 0) continue;

      const avgCandidates = data.avgCandidates.length > 0
        ? (data.avgCandidates.reduce((a, b) => a + b, 0) / data.avgCandidates.length).toFixed(1)
        : 0;

      const percentCanGrow = ((data.canGrow / data.total) * 100).toFixed(1);
      const percentCanReach6 = ((data.canReach6 / data.total) * 100).toFixed(1);

      console.log(`Collections with ${size} movie${size > 1 ? 's' : ''}:`);
      console.log(`  Total: ${data.total}`);
      console.log(`  Can grow (have More Ideas data): ${data.canGrow} (${percentCanGrow}%)`);
      console.log(`  Can reach ≥6 threshold: ${data.canReach6} (${percentCanReach6}%)`);
      console.log(`  Average More Ideas candidates: ${avgCandidates}`);
      console.log('');
    }

    // Print examples
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('EXAMPLE COLLECTIONS - GREAT GROWTH POTENTIAL (2x+ size)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.examples.great.forEach((ex, i) => {
      console.log(`${i + 1}. "${ex.title}"`);
      console.log(`   ${ex.current} → ${ex.potential} movies (${ex.growthFactor}x growth, +${ex.candidates} candidates)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('EXAMPLE COLLECTIONS - GOOD GROWTH (Can reach ≥6)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.examples.good.forEach((ex, i) => {
      console.log(`${i + 1}. "${ex.title}"`);
      console.log(`   ${ex.current} → ${ex.potential} movies (+${ex.candidates} candidates)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('EXAMPLE COLLECTIONS - LIMITED GROWTH (Has data but <6)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.examples.limited.forEach((ex, i) => {
      console.log(`${i + 1}. "${ex.title}"`);
      console.log(`   ${ex.current} → ${ex.potential} movies (+${ex.candidates} candidates, shortfall: ${6 - ex.potential})`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('EXAMPLE COLLECTIONS - NO GROWTH DATA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.examples.none.forEach((ex, i) => {
      console.log(`${i + 1}. "${ex.title}"`);
      console.log(`   ${ex.current} movies (no More Ideas data available)`);
    });

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const totalSmall = smallCollections.rows.length;
    const totalCanReach6 = Object.values(results.byCurrentSize)
      .reduce((sum, data) => sum + data.canReach6, 0);
    const totalCanGrow = Object.values(results.byCurrentSize)
      .reduce((sum, data) => sum + data.canGrow, 0);

    console.log(`Total collections with <6 movies: ${totalSmall}`);
    console.log(`Collections with More Ideas data: ${totalCanGrow} (${((totalCanGrow / totalSmall) * 100).toFixed(1)}%)`);
    console.log(`Collections that can reach ≥6: ${totalCanReach6} (${((totalCanReach6 / totalSmall) * 100).toFixed(1)}%)`);
    console.log(`Collections that cannot reach ≥6: ${totalSmall - totalCanReach6}`);

    console.log('\nRECOMMENDATION:');
    if (totalCanReach6 > totalSmall * 0.5) {
      console.log('✅ More than 50% of small collections can reach ≥6 threshold.');
      console.log('   Automated expansion using More Ideas data is viable!');
    } else if (totalCanReach6 > totalSmall * 0.25) {
      console.log('⚠️  25-50% of small collections can reach ≥6 threshold.');
      console.log('   Selective expansion recommended for viable collections.');
    } else {
      console.log('❌ Less than 25% of small collections can reach ≥6 threshold.');
      console.log('   More Ideas data alone insufficient - need additional sources.');
    }

    console.log('\n');

    await pool.end();

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the analysis
analyzeCollectionGrowth();
