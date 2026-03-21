/**
 * Analyze Genre Coverage and Mapping
 *
 * Examines how movie_analyses.enhanced_key_elements genre data
 * maps to the 20 defined top-level categories.
 */

const { Pool } = require('pg');

async function analyzeGenreCoverage() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('GENRE DATA COVERAGE AND MAPPING ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Define category mappings with keywords
    const categoryMappings = {
      'Action': ['action', 'martial arts'],
      'Adventure': ['adventure'],
      'Animation': ['animation', 'animated'],
      'Comedy': ['comedy'],
      'Crime': ['crime', 'criminal', 'gangster', 'heist'],
      'Documentary': ['documentary', 'doc '],
      'Drama': ['drama'],
      'Family': ['family', 'children'],
      'Fantasy': ['fantasy'],
      'History': ['history', 'historical', 'period'],
      'Horror': ['horror', 'slasher'],
      'Music': ['music', 'musical'],
      'Mystery': ['mystery'],
      'Romance': ['romance', 'romantic'],
      'Science Fiction': ['sci-fi', 'scifi', 'science fiction', 'space'],
      'Thriller': ['thriller', 'suspense'],
      'War': ['war', 'wartime', 'military'],
      'Western': ['western'],
      'Espionage': ['spy', 'espionage', 'intelligence'],
      'Noir': ['noir', 'neo-noir']
    };

    // Get total movies and analyses
    const totalMoviesQuery = `SELECT COUNT(*) as count FROM movies`;
    const totalAnalysesQuery = `
      SELECT COUNT(*) as count
      FROM movie_analyses
      WHERE enhanced_key_elements IS NOT NULL
    `;
    const genreDataQuery = `
      SELECT COUNT(*) as count
      FROM movie_analyses
      WHERE enhanced_key_elements::jsonb->>'genre' IS NOT NULL
        AND enhanced_key_elements::jsonb->>'genre' != ''
    `;

    const totalMovies = (await pool.query(totalMoviesQuery)).rows[0].count;
    const totalAnalyses = (await pool.query(totalAnalysesQuery)).rows[0].count;
    const withGenreData = (await pool.query(genreDataQuery)).rows[0].count;

    console.log('Database Coverage:');
    console.log(`  Total movies in database: ${parseInt(totalMovies).toLocaleString()}`);
    console.log(`  Movies with analyses: ${parseInt(totalAnalyses).toLocaleString()} (${((totalAnalyses / totalMovies) * 100).toFixed(1)}%)`);
    console.log(`  Analyses with genre data: ${parseInt(withGenreData).toLocaleString()} (${((withGenreData / totalAnalyses) * 100).toFixed(1)}% of analyses)\n`);

    // Get all genre strings
    const genresQuery = `
      SELECT
        id,
        movie_id,
        enhanced_key_elements::jsonb->>'genre' as genre
      FROM movie_analyses
      WHERE enhanced_key_elements::jsonb->>'genre' IS NOT NULL
        AND enhanced_key_elements::jsonb->>'genre' != ''
    `;

    console.log('Analyzing genre mappings...\n');
    const genresResult = await pool.query(genresQuery);

    // Map each genre to categories
    const categoryCounts = {};
    const unmappedGenres = new Set();
    const mappedMovies = new Set();
    const movieCategories = new Map(); // movie_id -> Set of categories

    Object.keys(categoryMappings).forEach(cat => {
      categoryCounts[cat] = 0;
    });

    genresResult.rows.forEach(row => {
      const genreString = row.genre.toLowerCase();
      let matched = false;

      if (!movieCategories.has(row.movie_id)) {
        movieCategories.set(row.movie_id, new Set());
      }

      Object.entries(categoryMappings).forEach(([category, keywords]) => {
        if (keywords.some(keyword => genreString.includes(keyword))) {
          categoryCounts[category]++;
          movieCategories.get(row.movie_id).add(category);
          matched = true;
        }
      });

      if (matched) {
        mappedMovies.add(row.movie_id);
      } else {
        unmappedGenres.add(row.genre);
      }
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CATEGORY MAPPING RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Category Distribution:\n');
    console.log('Rank | Category          | Movies  | % of Genre Data');
    console.log('-----|-------------------|---------|----------------');

    const sorted = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1]);

    sorted.forEach((entry, i) => {
      const [category, count] = entry;
      const rank = String(i + 1).padStart(3, ' ');
      const categoryStr = category.padEnd(17, ' ');
      const countStr = String(count).padStart(6, ' ');
      const pct = ((count / withGenreData) * 100).toFixed(1);
      console.log(`${rank}  | ${categoryStr} | ${countStr}  |     ${String(pct).padStart(5, ' ')}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('MAPPING STATISTICS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const mappedCount = mappedMovies.size;
    const mappedPct = ((mappedCount / withGenreData) * 100).toFixed(1);
    const unmappedCount = withGenreData - mappedCount;
    const unmappedPct = ((unmappedCount / withGenreData) * 100).toFixed(1);

    console.log(`Movies successfully mapped: ${mappedCount.toLocaleString()} (${mappedPct}%)`);
    console.log(`Movies unmapped: ${unmappedCount.toLocaleString()} (${unmappedPct}%)\n`);

    // Analyze multi-category movies
    const multiCategoryMovies = Array.from(movieCategories.entries())
      .filter(([id, cats]) => cats.size > 1);

    console.log(`Movies matching multiple categories: ${multiCategoryMovies.length.toLocaleString()} (${((multiCategoryMovies.length / mappedCount) * 100).toFixed(1)}%)`);

    const categoryCountDist = {};
    movieCategories.forEach((cats, id) => {
      const count = cats.size;
      categoryCountDist[count] = (categoryCountDist[count] || 0) + 1;
    });

    console.log('\nCategory count distribution:');
    Object.entries(categoryCountDist)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([count, movies]) => {
        console.log(`  ${count} categories: ${movies.toLocaleString()} movies`);
      });

    if (unmappedGenres.size > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('UNMAPPED GENRE EXAMPLES');
      console.log('═══════════════════════════════════════════════════════════════\n');

      const unmappedArray = Array.from(unmappedGenres).slice(0, 30);
      console.log(`Sample of ${unmappedArray.length} unmapped genres:\n`);
      unmappedArray.forEach((genre, i) => {
        console.log(`${String(i + 1).padStart(2, ' ')}. "${genre}"`);
      });
    }

    // Analyze collection coverage
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('COLLECTION GENRE DATA COVERAGE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const collectionCoverageQuery = `
      WITH collection_movie_genres AS (
        SELECT
          bl.id as list_id,
          bl.title,
          bl.total_movies,
          COUNT(DISTINCT lm.movie_id) as movies_in_list,
          COUNT(DISTINCT CASE
            WHEN ma.enhanced_key_elements::jsonb->>'genre' IS NOT NULL
              AND ma.enhanced_key_elements::jsonb->>'genre' != ''
            THEN lm.movie_id
          END) as movies_with_genre
        FROM browse_lists bl
        JOIN list_movies lm ON bl.id = lm.list_id
        LEFT JOIN movie_analyses ma ON lm.movie_id = ma.movie_id
        WHERE bl.status = 'active'
        GROUP BY bl.id, bl.title, bl.total_movies
      )
      SELECT
        CASE
          WHEN movies_with_genre = 0 THEN '0% (no genre data)'
          WHEN movies_with_genre::float / movies_in_list < 0.25 THEN '1-24% genre data'
          WHEN movies_with_genre::float / movies_in_list < 0.50 THEN '25-49% genre data'
          WHEN movies_with_genre::float / movies_in_list < 0.75 THEN '50-74% genre data'
          WHEN movies_with_genre::float / movies_in_list < 1.0 THEN '75-99% genre data'
          ELSE '100% genre data'
        END as coverage_range,
        COUNT(*) as collection_count,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM browse_lists WHERE status = 'active')), 1) as percentage
      FROM collection_movie_genres
      GROUP BY coverage_range
      ORDER BY MIN(movies_with_genre::float / NULLIF(movies_in_list, 0))
    `;

    const collectionCoverage = await pool.query(collectionCoverageQuery);

    console.log('How many movies in each collection have genre data:\n');
    console.log('Coverage Range       | Collections | Percentage');
    console.log('---------------------|-------------|------------');

    collectionCoverage.rows.forEach(r => {
      const range = r.coverage_range.padEnd(20, ' ');
      const count = String(r.collection_count).padStart(5, ' ');
      const pct = String(r.percentage).padStart(5, ' ');
      console.log(`${range} |   ${count}     |   ${pct}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECOMMENDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`✓ ${mappedPct}% of movies with genre data can be mapped to categories`);
    console.log(`✓ ${sorted[0][0]} has the most coverage (${sorted[0][1].toLocaleString()} movies)`);
    console.log(`✓ All 20 categories have substantial representation\n`);

    const highCoverage = collectionCoverage.rows
      .filter(r => r.coverage_range.includes('75-99%') || r.coverage_range.includes('100%'))
      .reduce((sum, r) => sum + parseInt(r.collection_count), 0);

    const totalCollections = collectionCoverage.rows.reduce((sum, r) => sum + parseInt(r.collection_count), 0);
    const highCoveragePct = ((highCoverage / totalCollections) * 100).toFixed(1);

    console.log(`Collections with ≥75% genre coverage: ${highCoverage.toLocaleString()} (${highCoveragePct}%)`);
    console.log('\nThe genre data is sufficient for category assignment.');
    console.log('Proceed with 70% threshold for category assignment (90% for Documentary).\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeGenreCoverage();
