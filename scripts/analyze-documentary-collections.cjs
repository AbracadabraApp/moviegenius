/**
 * Analyze Documentary Collections
 *
 * Determines which collections are actually documentaries by examining
 * the genre of movies in each collection, not just title keywords.
 */

const { Pool } = require('pg');

async function analyzeDocumentaryCollections() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('DOCUMENTARY COLLECTION ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Keywords that might indicate documentary collections
    const keywords = ['studies', 'culture', 'cinema', 'industry', 'pioneers', 'documentary', 'documentaries'];

    console.log('Analyzing collections with keywords:', keywords.join(', '));
    console.log('Checking actual movie genres to determine true documentary collections...\n');

    // Get collections matching these keywords
    const collectionsQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active'
        AND (
          LOWER(title) LIKE '%studies%' OR
          LOWER(title) LIKE '%culture%' OR
          LOWER(title) LIKE '%cinema%' OR
          LOWER(title) LIKE '%industry%' OR
          LOWER(title) LIKE '%pioneers%' OR
          LOWER(title) LIKE '%documentary%' OR
          LOWER(title) LIKE '%documentaries%'
        )
      ORDER BY total_movies DESC
    `;

    const collections = await pool.query(collectionsQuery);
    console.log(`Found ${collections.rows.length.toLocaleString()} collections with these keywords\n`);
    console.log('Analyzing movie genres...\n');

    const results = [];

    for (const collection of collections.rows) {
      // Get movies in this collection with genre data
      const moviesQuery = `
        SELECT
          m.id,
          m.title,
          ma.enhanced_key_elements::jsonb->>'genre' as genre
        FROM movies m
        JOIN list_movies lm ON m.id = lm.movie_id
        LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE lm.list_id = $1
      `;

      const movies = await pool.query(moviesQuery, [collection.id]);

      if (movies.rows.length === 0) continue;

      // Count how many are documentaries
      let docCount = 0;
      let genreCount = 0; // Movies with genre data

      movies.rows.forEach(movie => {
        if (movie.genre) {
          genreCount++;
          const genre = movie.genre.toLowerCase();
          if (genre.includes('documentary') || genre.includes('doc')) {
            docCount++;
          }
        }
      });

      if (genreCount === 0) continue; // Skip if no genre data

      const docPercentage = (docCount / genreCount) * 100;

      results.push({
        id: collection.id,
        title: collection.title,
        totalMovies: collection.total_movies,
        moviesWithGenre: genreCount,
        docCount: docCount,
        docPercentage: docPercentage
      });
    }

    // Sort by doc percentage
    results.sort((a, b) => b.docPercentage - a.docPercentage);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('RESULTS: Collections by Documentary Percentage');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Show distribution
    const ranges = {
      '90-100%': results.filter(r => r.docPercentage >= 90).length,
      '70-89%': results.filter(r => r.docPercentage >= 70 && r.docPercentage < 90).length,
      '50-69%': results.filter(r => r.docPercentage >= 50 && r.docPercentage < 70).length,
      '30-49%': results.filter(r => r.docPercentage >= 30 && r.docPercentage < 50).length,
      '10-29%': results.filter(r => r.docPercentage >= 10 && r.docPercentage < 30).length,
      '0-9%': results.filter(r => r.docPercentage < 10).length
    };

    console.log('Distribution of Documentary Percentage:\n');
    Object.entries(ranges).forEach(([range, count]) => {
      console.log(`  ${range.padEnd(10, ' ')}: ${String(count).padStart(4, ' ')} collections`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TOP 20 DOCUMENTARY COLLECTIONS (Highest % of docs)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.slice(0, 20).forEach((r, i) => {
      console.log(`${String(i + 1).padStart(2, ' ')}. "${r.title}"`);
      console.log(`    ${r.docCount}/${r.moviesWithGenre} movies are docs (${r.docPercentage.toFixed(1)}%)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('BOTTOM 20 (Lowest % of docs - likely narrative films)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    results.slice(-20).reverse().forEach((r, i) => {
      console.log(`${String(i + 1).padStart(2, ' ')}. "${r.title}"`);
      console.log(`    ${r.docCount}/${r.moviesWithGenre} movies are docs (${r.docPercentage.toFixed(1)}%)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECOMMENDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const threshold70 = results.filter(r => r.docPercentage >= 70).length;
    const threshold50 = results.filter(r => r.docPercentage >= 50).length;

    console.log(`Collections with ≥70% documentaries: ${threshold70}`);
    console.log(`Collections with ≥50% documentaries: ${threshold50}`);
    console.log(`Total collections analyzed: ${results.length}\n`);

    console.log('Suggested threshold: 70% (collections with 70%+ docs = Documentary category)\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeDocumentaryCollections();
