#!/usr/bin/env node

/**
 * Transform Browse JSON Data to Database Format
 *
 * Reads all *-build-state.json files and transforms them for database insertion
 * Filters to production-quality collections (>= 6 movies)
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BUILD_DIR = './list-analysis-output';

// Configurable threshold - can be changed via environment variable or command line
// MIN_MOVIES=3 node scripts/transform-browse-data.js
const MIN_MOVIES = parseInt(process.env.MIN_MOVIES || process.argv[2] || '4');
console.log(`📊 Using threshold: ≥${MIN_MOVIES} movies per collection\n`);

async function transformBrowseData() {
  console.log('🔄 Transforming Browse Data for Database...\n');

  const buildFiles = readdirSync(BUILD_DIR).filter(f => f.endsWith('-build-state.json'));

  let totalLists = 0;
  let productionLists = 0;
  let totalMovieAssignments = 0;

  const allCollections = [];
  const allMovieAssignments = [];

  for (const file of buildFiles) {
    const filePath = join(BUILD_DIR, file);
    const genre = file.replace('-build-state.json', '');

    console.log(`📂 Processing ${genre}...`);

    try {
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      const lists = data.allLists || {};

      for (const [listName, listData] of Object.entries(lists)) {
        totalLists++;

        const movieCount = listData.movieIds?.length || 0;

        // Filter: configurable threshold (MIN_MOVIES)
        if (movieCount >= MIN_MOVIES) {
          productionLists++;

          // Transform to production format
          const collection = {
            // Use existing ID or generate new one
            id: listData.id || `browse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: listName,
            description: `${listName} - ${genre} films exploring thematic connections`,
            genre: genre,
            total_movies: movieCount,
            status: 'active',
            created_at: listData.createdAt || new Date().toISOString(),
            updated_at: listData.lastUpdated || listData.createdAt || new Date().toISOString()
          };

          allCollections.push(collection);

          // Transform movie assignments
          listData.movieIds.forEach((movieId, index) => {
            allMovieAssignments.push({
              list_id: collection.id,
              movie_id: movieId,
              relevance_score: 0.85, // Default relevance (could be enhanced later)
              display_order: index + 1
            });
            totalMovieAssignments++;
          });
        }
      }

      const genreLists = Object.keys(lists).length;
      const genreProduction = Object.values(lists).filter(l => (l.movieIds?.length || 0) >= MIN_MOVIES).length;

      console.log(`  ✓ ${genreLists} total → ${genreProduction} production-ready`);

    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error.message);
    }
  }

  console.log('\n📊 Transformation Summary:');
  console.log(`  Threshold used: ≥${MIN_MOVIES} movies`);
  console.log(`  Total lists generated: ${totalLists}`);
  console.log(`  Collections meeting threshold: ${productionLists} (${((productionLists/totalLists)*100).toFixed(1)}%)`);
  console.log(`  Total movie assignments: ${totalMovieAssignments}`);
  console.log(`  Genres processed: ${buildFiles.length}`);

  // Generate SQL for reference
  console.log('\n💾 Sample SQL (first 3 collections):');
  allCollections.slice(0, 3).forEach(col => {
    console.log(`\nINSERT INTO browse_lists (id, title, description, total_movies, status)
VALUES ('${col.id}', '${col.title.replace(/'/g, "''")}', '${col.description.replace(/'/g, "''")}', ${col.total_movies}, '${col.status}');`);
  });

  // Return data for programmatic insertion
  return {
    collections: allCollections,
    movieAssignments: allMovieAssignments,
    stats: {
      totalLists,
      productionLists,
      totalMovieAssignments,
      genresProcessed: buildFiles.length
    }
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  transformBrowseData()
    .then(result => {
      console.log('\n✅ Transformation complete!');
      console.log(`\n📝 Next steps:`);
      console.log(`  1. Review the ${result.collections.length} collections`);
      console.log(`  2. Run database insertion script to populate browse_lists and list_movies tables`);
      console.log(`  3. Verify data integrity with: node scripts/check-browse-schema.js`);
    })
    .catch(error => {
      console.error('\n❌ Transformation failed:', error);
      process.exit(1);
    });
}

export { transformBrowseData };
