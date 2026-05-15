const { getTMDBMovieDetails } = require('./lib/services/tmdb-search.js');
const { ensureMovieInDb } = require('./lib/services/tmdb-persist.js');

// Corrected TMDB IDs + missing films
const tmdbIdsToAdd = [
  // Crime - corrected
  31644,   // $ (Dollars) 1971

  // Documentary - corrected + TV series flagged
  12398,   // An American Family (1973) - TV series on TMDB

  // Fantasy - corrected
  71271,   // The Bluebird (1918)

  // History - TV series flagged
  18490,   // The Age of the Medici (1973) - miniseries on TMDB

  // Horror - corrected
  2671,    // Ringu (1998)
  37973,   // Alone (2007)

  // Noir - corrected
  49842,   // Quai des Orfèvres (1947)

  // Thriller - corrected
  204,     // Le Salaire de la Peur (1953)
  15007,   // Number Seventeen (1932)

  // Western - corrected + added
  183821,  // The Aryan (1916)
  157903,  // Straight Shooting (1917)
];

(async () => {
  const results = [];
  const errors = [];
  const tvSeries = [];

  console.log(`\n🎬 Adding ${tmdbIdsToAdd.length} corrected movies to database...\n`);

  for (const tmdbId of tmdbIdsToAdd) {
    try {
      console.log(`Fetching TMDB ID ${tmdbId}...`);

      // Fetch full movie details from TMDB API
      const tmdbMovie = await getTMDBMovieDetails(tmdbId);

      if (!tmdbMovie) {
        errors.push({ tmdbId, error: 'TMDB API returned no data' });
        console.log(`   ❌ No data returned from TMDB API\n`);
        continue;
      }

      // Check if it's a TV series instead of a movie
      if (tmdbMovie.media_type === 'tv' || tmdbMovie.first_air_date) {
        tvSeries.push({
          tmdbId,
          name: tmdbMovie.name || tmdbMovie.title,
          firstAirDate: tmdbMovie.first_air_date
        });
        console.log(`   ⚠️  TV SERIES: "${tmdbMovie.name || tmdbMovie.title}" (first aired: ${tmdbMovie.first_air_date})`);
        console.log(`   ⏭️  Skipping (not a movie)\n`);
        continue;
      }

      console.log(`   📽️  Found: "${tmdbMovie.title}" (${tmdbMovie.release_date ? tmdbMovie.release_date.substring(0, 4) : 'unknown year'})`);

      // Insert into database
      await ensureMovieInDb(tmdbMovie);

      const year = tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null;

      results.push({
        tmdbId,
        title: tmdbMovie.title,
        year
      });

      console.log(`   ✅ Added to database\n`);

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 250));

    } catch (err) {
      errors.push({ tmdbId, error: err.message });
      console.log(`   ❌ ERROR: ${err.message}\n`);
    }
  }

  console.log('\n=== RESULTS ===\n');
  console.log(`✅ Successfully added: ${results.length}`);
  console.log(`⚠️  TV series (skipped): ${tvSeries.length}`);
  console.log(`❌ Errors: ${errors.length}\n`);

  if (results.length > 0) {
    console.log('Successfully added movies:');
    results.forEach(r => {
      console.log(`  - "${r.title}" (${r.year}) [TMDB: ${r.tmdbId}]`);
    });
    console.log();
  }

  if (tvSeries.length > 0) {
    console.log('TV series (skipped):');
    tvSeries.forEach(s => {
      console.log(`  - "${s.name}" (${s.firstAirDate ? s.firstAirDate.substring(0, 4) : 'unknown'}) [TMDB: ${s.tmdbId}]`);
    });
    console.log();
  }

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => {
      console.log(`  - TMDB ID ${e.tmdbId}: ${e.error}`);
    });
  }

  process.exit(0);
})();
