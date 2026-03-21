/**
 * Assign Categories to Collections
 *
 * Analyzes movie genres in each collection and assigns to categories
 * using multi-category approach with 30% threshold (90% for Documentary).
 *
 * Categories stored as JSONB array in browse_lists.categories
 */

const { Pool } = require('pg');

async function assignCategories() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ASSIGN CATEGORIES TO COLLECTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // First, add categories column if it doesn't exist
    console.log('Checking database schema...\n');

    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'browse_lists'
        AND column_name = 'categories'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('Adding categories column to browse_lists...');
      await pool.query(`
        ALTER TABLE browse_lists
        ADD COLUMN categories JSONB DEFAULT '[]'::jsonb
      `);
      console.log('Column added.\n');
    } else {
      console.log('Categories column already exists.\n');
    }

    // Category mappings
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

    // Get all collections
    const collectionsQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active'
      ORDER BY id
    `;

    const collections = await pool.query(collectionsQuery);
    const total = collections.rows.length;

    console.log(`Processing ${total.toLocaleString()} collections...\n`);

    const stats = {
      processed: 0,
      withCategories: 0,
      withoutCategories: 0,
      categoryCounts: {},
      errors: []
    };

    Object.keys(categoryMappings).forEach(cat => {
      stats.categoryCounts[cat] = 0;
    });

    const startTime = Date.now();

    for (const collection of collections.rows) {
      try {
        // Get movies with genre data
        const moviesQuery = `
          SELECT
            m.id,
            ma.enhanced_key_elements::jsonb->>'genre' as genre
          FROM movies m
          JOIN list_movies lm ON m.id = lm.movie_id
          LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
          WHERE lm.list_id = $1
            AND ma.enhanced_key_elements::jsonb->>'genre' IS NOT NULL
            AND ma.enhanced_key_elements::jsonb->>'genre' != ''
        `;

        const movies = await pool.query(moviesQuery, [collection.id]);

        if (movies.rows.length === 0) {
          // No genre data - set empty categories
          await pool.query(
            `UPDATE browse_lists SET categories = '[]'::jsonb WHERE id = $1`,
            [collection.id]
          );
          stats.withoutCategories++;
          stats.processed++;
          continue;
        }

        // Count genre matches per category
        const genreMatchCounts = {};
        Object.keys(categoryMappings).forEach(cat => {
          genreMatchCounts[cat] = 0;
        });

        movies.rows.forEach(movie => {
          const genreString = movie.genre.toLowerCase();

          Object.entries(categoryMappings).forEach(([category, keywords]) => {
            if (keywords.some(keyword => genreString.includes(keyword))) {
              genreMatchCounts[category]++;
            }
          });
        });

        // Assign to categories based on thresholds
        const categoryPercentages = []; // Store {category, percentage} for sorting
        const totalMovies = movies.rows.length;

        Object.entries(genreMatchCounts).forEach(([category, count]) => {
          const percentage = (count / totalMovies) * 100;

          // Documentary needs 90%
          if (category === 'Documentary') {
            if (percentage >= 90) {
              categoryPercentages.push({ category, percentage });
              stats.categoryCounts[category]++;
            }
          } else {
            // Other categories: 30% threshold
            if (percentage >= 30) {
              categoryPercentages.push({ category, percentage });
              stats.categoryCounts[category]++;
            }
          }
        });

        // Sort by percentage (highest first) so categories[0] is the primary/dominant genre
        categoryPercentages.sort((a, b) => b.percentage - a.percentage);
        const assignedCategories = categoryPercentages.map(cp => cp.category);

        // Update collection with categories
        await pool.query(
          `UPDATE browse_lists
           SET categories = $1::jsonb
           WHERE id = $2`,
          [JSON.stringify(assignedCategories), collection.id]
        );

        if (assignedCategories.length > 0) {
          stats.withCategories++;
        } else {
          stats.withoutCategories++;
        }

        stats.processed++;

        // Progress update
        if (stats.processed % 100 === 0) {
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
    console.log('CATEGORY ASSIGNMENT COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total collections processed: ${stats.processed.toLocaleString()}`);
    console.log(`Collections with categories: ${stats.withCategories.toLocaleString()} (${((stats.withCategories / total) * 100).toFixed(1)}%)`);
    console.log(`Collections without categories: ${stats.withoutCategories.toLocaleString()} (${((stats.withoutCategories / total) * 100).toFixed(1)}%)`);
    console.log(`\nTotal time: ${Math.round(totalTime / 60)} minutes (${totalTime.toFixed(1)} seconds)`);
    console.log(`Processing rate: ${(stats.processed / totalTime).toFixed(2)} collections/second\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CATEGORY DISTRIBUTION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sorted = Object.entries(stats.categoryCounts)
      .sort((a, b) => b[1] - a[1]);

    console.log('Rank | Category          | Collections | % of Total');
    console.log('-----|-------------------|-------------|------------');

    sorted.forEach((entry, i) => {
      const [category, count] = entry;
      const rank = String(i + 1).padStart(3, ' ');
      const categoryStr = category.padEnd(17, ' ');
      const countStr = String(count).padStart(5, ' ');
      const pct = ((count / total) * 100).toFixed(1);
      console.log(`${rank}  | ${categoryStr} |   ${countStr}   |   ${String(pct).padStart(5, ' ')}%`);
    });

    if (stats.errors.length > 0) {
      console.log(`\n\n⚠️  Errors encountered: ${stats.errors.length}`);
      console.log('\nFirst 10 errors:');
      stats.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. "${err.collection_title}" (${err.collection_id})`);
        console.log(`     Error: ${err.error}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

assignCategories();
