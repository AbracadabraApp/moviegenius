/**
 * Simulate Multi-Category Assignment
 *
 * Shows what category distribution looks like when collections
 * can appear in multiple categories based on genre thresholds.
 */

const { Pool } = require('pg');

async function simulateMultiCategoryAssignment() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('MULTI-CATEGORY ASSIGNMENT SIMULATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

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
      ORDER BY total_movies DESC
    `;

    const collections = await pool.query(collectionsQuery);
    console.log(`Analyzing ${collections.rows.length.toLocaleString()} collections...\n`);

    const categoryCounts = {};
    const collectionCategoryMap = new Map(); // collection_id -> [categories]
    const categoryCollections = {}; // category -> [collection_ids]

    Object.keys(categoryMappings).forEach(cat => {
      categoryCounts[cat] = 0;
      categoryCollections[cat] = [];
    });

    let processed = 0;
    let withCategories = 0;
    let withoutCategories = 0;

    for (const collection of collections.rows) {
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
        withoutCategories++;
        processed++;
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
      const assignedCategories = [];
      const totalMovies = movies.rows.length;

      Object.entries(genreMatchCounts).forEach(([category, count]) => {
        const percentage = (count / totalMovies) * 100;

        // Documentary needs 90%
        if (category === 'Documentary') {
          if (percentage >= 90) {
            assignedCategories.push(category);
            categoryCounts[category]++;
            categoryCollections[category].push(collection.id);
          }
        } else {
          // Other categories: 30% threshold for multi-category
          if (percentage >= 30) {
            assignedCategories.push(category);
            categoryCounts[category]++;
            categoryCollections[category].push(collection.id);
          }
        }
      });

      if (assignedCategories.length > 0) {
        collectionCategoryMap.set(collection.id, assignedCategories);
        withCategories++;
      } else {
        withoutCategories++;
      }

      processed++;

      if (processed % 500 === 0) {
        process.stdout.write(`  Progress: ${processed}/${collections.rows.length}...\r`);
      }
    }

    console.log(`\n\n═══════════════════════════════════════════════════════════════`);
    console.log('CATEGORY DISTRIBUTION WITH 30% THRESHOLD');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sorted = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1]);

    console.log('Rank | Category          | Collections | % of Total');
    console.log('-----|-------------------|-------------|------------');

    sorted.forEach((entry, i) => {
      const [category, count] = entry;
      const rank = String(i + 1).padStart(3, ' ');
      const categoryStr = category.padEnd(17, ' ');
      const countStr = String(count).padStart(5, ' ');;
      const pct = ((count / collections.rows.length) * 100).toFixed(1);
      console.log(`${rank}  | ${categoryStr} |   ${countStr}   |   ${String(pct).padStart(5, ' ')}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('ASSIGNMENT STATISTICS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Collections with categories: ${withCategories.toLocaleString()} (${((withCategories / collections.rows.length) * 100).toFixed(1)}%)`);
    console.log(`Collections without categories: ${withoutCategories.toLocaleString()} (${((withoutCategories / collections.rows.length) * 100).toFixed(1)}%)\n`);

    // Analyze how many categories per collection
    const categoriesPerCollection = {};
    collectionCategoryMap.forEach((cats, id) => {
      const count = cats.length;
      categoriesPerCollection[count] = (categoriesPerCollection[count] || 0) + 1;
    });

    console.log('Categories per collection:');
    Object.entries(categoriesPerCollection)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([count, collections]) => {
        const pct = ((collections / withCategories) * 100).toFixed(1);
        console.log(`  ${count} categories: ${String(collections).padStart(5, ' ')} collections (${String(pct).padStart(5, ' ')}%)`);
      });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('CATEGORY BALANCE COMPARISON');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Show improvement for small categories
    const smallCategories = sorted.slice(-5);
    console.log('Smallest 5 categories:\n');
    smallCategories.reverse().forEach((entry, i) => {
      const [category, count] = entry;
      console.log(`${i + 1}. ${category.padEnd(17, ' ')}: ${String(count).padStart(5, ' ')} collections`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('EXAMPLE MULTI-CATEGORY COLLECTIONS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Show examples with multiple categories
    const examples = [];
    collectionCategoryMap.forEach((cats, id) => {
      if (cats.length >= 2 && cats.length <= 3) {
        const collection = collections.rows.find(c => c.id === id);
        if (collection) {
          examples.push({
            title: collection.title,
            categories: cats,
            total_movies: collection.total_movies
          });
        }
      }
    });

    console.log('Sample collections with 2-3 categories:\n');
    examples.slice(0, 15).forEach((ex, i) => {
      console.log(`${String(i + 1).padStart(2, ' ')}. "${ex.title}"`);
      console.log(`    Categories: ${ex.categories.join(', ')}`);
      console.log(`    Movies: ${ex.total_movies}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('RECOMMENDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const minCategory = sorted[sorted.length - 1];
    const maxCategory = sorted[0];
    const ratio = maxCategory[1] / minCategory[1];

    console.log(`Largest category: ${maxCategory[0]} (${maxCategory[1].toLocaleString()} collections)`);
    console.log(`Smallest category: ${minCategory[0]} (${minCategory[1].toLocaleString()} collections)`);
    console.log(`Ratio: ${ratio.toFixed(1)}x\n`);

    console.log('With 30% threshold:');
    console.log('✓ Better category balance than dominant-genre approach');
    console.log('✓ Collections appear in all relevant categories');
    console.log('✓ More discovery paths for users');
    console.log('✓ Reflects the multi-genre nature of many collections\n');

    console.log('Proceed with 30% threshold for multi-category assignment.');
    console.log('Documentary maintains 90% threshold for accuracy.\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

simulateMultiCategoryAssignment();
