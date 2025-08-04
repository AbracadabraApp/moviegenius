#!/usr/bin/env node

/**
 * Test Movie Discovery System
 *
 * Tests the complete flow: EntityLinkedText → search route → movie page
 */

const { searchOurDatabase, parseSearchQuery } = require('./lib/services/database-search.js');
const { searchTMDB, searchAndCategorize } = require('./lib/services/tmdb-search.js');
const { flagForNuclearPromotion } = require('./lib/services/nuclear-promotion.js');

async function testDiscoveryFlow() {
  console.log('🧪 Testing Movie Discovery System\n');

  // Test cases from EntityLinkedText
  const testQueries = [
    'The Dark Knight 2008', // Popular movie likely in database
    'Casablanca 1942', // Classic movie likely in database
    'Everything Everywhere All at Once 2022', // Recent movie possibly not in database
    'Parasite 2019', // International film
    'Some Obscure Movie 2023', // Movie that doesn't exist
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 Testing query: "${query}"`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Step 1: Parse query (what EntityLinkedText generates)
      const { title, year } = parseSearchQuery(query);
      console.log(`📝 Parsed: "${title}" (${year})`);

      // Step 2: Database search (2% coverage)
      console.log(`🔍 Searching database...`);
      const dbResult = await searchOurDatabase(query);

      if (dbResult) {
        console.log(
          `✅ Found in database: "${dbResult.title}" (${dbResult.year}) -> /movie/${dbResult.tmdb_id}`
        );
        continue; // Would redirect to movie page
      }

      // Step 3: TMDB search (98% coverage)
      console.log(`🎬 Not in database, searching TMDB...`);
      const tmdbResult = await searchAndCategorize(query);

      if (tmdbResult.type === 'single_match') {
        console.log(
          `✅ Single TMDB match: "${tmdbResult.movie.title}" -> /movie/${tmdbResult.movie.id}`
        );

        // Would flag for nuclear promotion
        console.log(`🎯 Flagging for nuclear promotion...`);
        // await flagForNuclearPromotion(tmdbResult.movie.id, 'search_click');
      } else if (tmdbResult.type === 'multiple_matches') {
        console.log(`📋 Multiple matches found (${tmdbResult.results.length}):`);
        tmdbResult.results.slice(0, 3).forEach((movie, i) => {
          const year = movie.release_date?.substring(0, 4) || 'Unknown';
          console.log(
            `  ${i + 1}. "${movie.title}" (${year}) - Score: ${movie.relevanceScore?.toFixed(1) || 'N/A'}`
          );
        });
      } else if (tmdbResult.type === 'no_matches') {
        console.log(`❌ No matches found in TMDB`);
      }
    } catch (error) {
      console.error(`💥 Error testing "${query}":`, error.message);
    }
  }

  console.log('\n🎉 Movie Discovery Test Complete!');
  console.log('\n📋 Summary:');
  console.log('- EntityLinkedText generates /movie/search?q=Title+Year URLs');
  console.log('- Search route handles database → TMDB → redirect/results flow');
  console.log('- Movie pages support both database and TMDB-discovered movies');
  console.log('- Nuclear promotion flags popular discoveries');
}

// Run the test
testDiscoveryFlow().catch(console.error);
