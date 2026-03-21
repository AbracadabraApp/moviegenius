/**
 * Apply Category Assignments to Browse Lists
 *
 * Assigns collections to categories based on genre percentages
 * with the following thresholds:
 * - Documentary: 90% of movies must be documentaries
 * - Other categories: 30% threshold for multi-category assignment
 */

const { Pool } = require('pg');

async function applyCategoryAssignments() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('APPLYING CATEGORY ASSIGNMENTS TO COLLECTIONS');
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
    console.log(`Processing ${collections.rows.length.toLocaleString()} collections...\n`);

    const categoryCounts = {};
    const categoryPercentages = {}; // category -> { collections: [{id, title, percentage}] }

    Object.keys(categoryMappings).forEach(cat => {
      categoryCounts[cat] = 0;
      categoryPercentages[cat] = [];
    });

    let processed = 0;
    let withCategories = 0;
    let withoutCategories = 0;
    let updated = 0;

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

        if (processed % 100 === 0) {
          process.stdout.write(`  Progress: ${processed}/${collections.rows.length} | Updated: ${updated}...\r`);
        }
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

      // Calculate percentages and assign to categories
      const assignedCategories = [];
      const totalMovies = movies.rows.length;
      const categoryDetails = {}; // category -> percentage

      Object.entries(genreMatchCounts).forEach(([category, count]) => {
        const percentage = (count / totalMovies) * 100;
        categoryDetails[category] = percentage;

        // Documentary needs 90%
        if (category === 'Documentary') {
          if (percentage >= 90) {
            assignedCategories.push(category);
            categoryCounts[category]++;
            categoryPercentages[category].push({
              id: collection.id,
              title: collection.title,
              percentage: percentage.toFixed(1)
            });
          }
        } else {
          // Other categories: 30% threshold for multi-category
          if (percentage >= 30) {
            assignedCategories.push(category);
            categoryCounts[category]++;
            categoryPercentages[category].push({
              id: collection.id,
              title: collection.title,
              percentage: percentage.toFixed(1)
            });
          }
        }
      });

      // Sort categories by percentage (highest first)
      assignedCategories.sort((a, b) => categoryDetails[b] - categoryDetails[a]);

      if (assignedCategories.length > 0) {
        // Update the collection with assigned categories
        await pool.query(
          `UPDATE browse_lists SET categories = $1 WHERE id = $2`,
          [assignedCategories, collection.id]
        );

        withCategories++;
        updated++;
      } else {
        // Set to empty array if no categories
        await pool.query(
          `UPDATE browse_lists SET categories = $1 WHERE id = $2`,
          [[], collection.id]
        );
        withoutCategories++;
      }

      processed++;

      if (processed % 100 === 0) {
        process.stdout.write(`  Progress: ${processed}/${collections.rows.length} | Updated: ${updated}...\r`);
      }
    }

    console.log(`\n\n═══════════════════════════════════════════════════════════════`);
    console.log('CATEGORY ASSIGNMENT COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Total collections processed: ${processed.toLocaleString()}`);
    console.log(`Collections with categories: ${withCategories.toLocaleString()}`);
    console.log(`Collections without categories: ${withoutCategories.toLocaleString()}`);
    console.log(`Database records updated: ${updated.toLocaleString()}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CATEGORY DISTRIBUTION (sorted by percentage)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sorted = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1]);

    console.log('Rank | Category          | Collections | % of Total');
    console.log('-----|-------------------|-------------|------------');

    sorted.forEach(([category, count], index) => {
      const percentage = ((count / withCategories) * 100).toFixed(1);
      const paddedCategory = category.padEnd(17);
      const paddedCount = count.toString().padStart(11);
      const rank = (index + 1).toString().padStart(4);
      console.log(`${rank} | ${paddedCategory} | ${paddedCount} | ${percentage}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Error applying category assignments:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
applyCategoryAssignments()
  .then(() => {
    console.log('✅ Category assignment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Category assignment failed:', error);
    process.exit(1);
  });
