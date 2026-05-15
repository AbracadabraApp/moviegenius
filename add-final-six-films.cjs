const { getTMDBMovieDetails } = require('./lib/services/tmdb-search.js');
const { ensureMovieInDb } = require('./lib/services/tmdb-persist.js');

// Final 6 corrected TMDB IDs
const tmdbIdsToAdd = [
  12207,   // Drunken Master II → "The Legend of Drunken Master"
  21135,   // Eclipse → "L'Eclisse"
  31506,   // Siegfried → "Die Nibelungen: Siegfried"
  760104,  // X (2022)
  8810,    // The Road Warrior → "Mad Max 2"
  196636,  // The Bank Robbery (1908)
];

(async () => {
  const results = [];
  const errors = [];

  console.log(`\n🎬 Adding final 6 films to database...\n`);

  for (const tmdbId of tmdbIdsToAdd) {
    try {
      console.log(`Fetching TMDB ID ${tmdbId}...`);

      const tmdbMovie = await getTMDBMovieDetails(tmdbId);

      if (!tmdbMovie) {
        errors.push({ tmdbId, error: 'TMDB API returned no data' });
        console.log(`   ❌ No data returned from TMDB API\n`);
        continue;
      }

      console.log(`   📽️  Found: "${tmdbMovie.title}" (${tmdbMovie.release_date ? tmdbMovie.release_date.substring(0, 4) : 'unknown year'})`);

      await ensureMovieInDb(tmdbMovie);

      const year = tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null;

      results.push({
        tmdbId,
        title: tmdbMovie.title,
        year
      });

      console.log(`   ✅ Added to database\n`);

      await new Promise(resolve => setTimeout(resolve, 250));

    } catch (err) {
      errors.push({ tmdbId, error: err.message });
      console.log(`   ❌ ERROR: ${err.message}\n`);
    }
  }

  console.log('\n=== RESULTS ===\n');
  console.log(`✅ Successfully added: ${results.length}`);
  console.log(`❌ Errors: ${errors.length}\n`);

  if (results.length > 0) {
    console.log('Successfully added movies:');
    results.forEach(r => {
      console.log(`  - "${r.title}" (${r.year}) [TMDB: ${r.tmdbId}]`);
    });
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => {
      console.log(`  - TMDB ID ${e.tmdbId}: ${e.error}`);
    });
  }

  console.log('\n\n// Swift entries for TierTmdbLookup.swift:');
  console.log('    "Action|Classics|Drunken Master II|1994": 12207,');
  console.log('    "Drama|Connoisseur|Eclipse|1962": 21135,');
  console.log('    "Fantasy|Archivist: The Nibelungen|Siegfried|1924": 31506,');
  console.log('    "Horror|Well-Versed|X|2022": 760104,');
  console.log('    "Science Fiction|Well-Versed: Mad Max 2|The Road Warrior|1981": 8810,');
  console.log('    "Western|Master|The Bank Robbery|1908": 196636,');

  process.exit(0);
})();
