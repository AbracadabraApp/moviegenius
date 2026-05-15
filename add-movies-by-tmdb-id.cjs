const { getTMDBMovieDetails } = require('./lib/services/tmdb-search.js');
const { ensureMovieInDb } = require('./lib/services/tmdb-persist.js');

// TMDB IDs to add (from user's manual collection)
const tmdbIdsToAdd = [
  // Action
  9316,    // Ong-Bak
  165282,  // Wolf Guy
  54860,   // Bodyguard Kiba (The Bodyguard)
  16662,   // The Big Gundown

  // Crime
  5910,    // Hana-bi (Fireworks)
  137302,  // $ (Dollars)

  // Documentary
  86655,   // A Married Couple
  1268890, // An American Family
  79161,   // 51 Birch Street
  150838,  // Hôtel des Invalides
  91262,   // Le Sang des bêtes (Blood of the Beasts)
  183005,  // The 400 Million

  // Espionage
  45235,   // Pickup Alley (Interpol)
  581577,  // Persian Lessons
  32050,   // The Black Windmill
  32627,   // The Mackintosh Man
  94641,   // OSS (O.S.S.)

  // Fantasy
  51857,   // Cría Cuervos (Cria!)
  127628,  // The Bluebird

  // History
  74778,   // Socrates
  111423,  // Augustine of Hippo
  616038,  // Que Viva Mexico!
  144586,  // The Assassination of the Duke of Guise
  400749,  // Mothers of Men
  179835,  // Atlantis

  // Horror
  28681,   // Equinox
  52849,   // A Bell from Hell
  949423,  // Pearl
  95469,   // Ringu (Ring)
  60304,   // Alone

  // Mystery
  77965,   // The Tattered Dress
  32615,   // The Offence
  48787,   // Mute Witness

  // Noir
  11652,   // Quai des Orfèvres (Jenny Lamour)
  20028,   // Decoy
  43463,   // Railroaded!

  // Science Fiction
  25530,   // First on the Moon

  // Thriller
  11003,   // Le Salaire de la Peur (The Wages of Fear)
  432139,  // Vikram Vedha
  44117,   // Number 17

  // War
  25237,   // Idi i Smotri (Come and See)
  41355,   // Memphis Belle: A Story of a Flying Fortress
  102384,  // Two Arabian Knights

  // Western
  135275,  // Wild and Woolly
  121953,  // Straight Shooting
];

(async () => {
  const results = [];
  const errors = [];

  console.log(`\n🎬 Adding ${tmdbIdsToAdd.length} movies to database...\n`);

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

      // Rate limit (TMDB allows 50 requests per second, being conservative)
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

  process.exit(0);
})();
