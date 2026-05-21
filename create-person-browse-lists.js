import fs from 'fs';
import { Pool } from 'pg';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_API = 'https://api.themoviedb.org/3';
const CALL_SLEEP_MS = 30;
const LEAD_ORDER_MAX = 2; // Top-3 billed (positions 0, 1, 2)
const MIN_MOVIES = 5; // Minimum movies to create a list
const DOC_GENRE_ID = 99; // TMDB genre ID for documentaries

// Self/narrator/uncredited markers
const SELF_MARKERS = ['self', 'himself', 'herself', 'narrator', 'host', 'uncredited', 'archive footage'];

// Helper: Check if a cast credit is a leading role
function isLeadingRole(credit) {
  const order = credit.order;
  if (order === null || order === undefined || order > LEAD_ORDER_MAX) {
    return false;
  }

  // Exclude self/narrator/uncredited
  const character = (credit.character || '').toLowerCase();
  if (SELF_MARKERS.some(marker => character.includes(marker))) {
    return false;
  }

  return true;
}

// Helper: Fetch from TMDB API
async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_API}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }

  await new Promise(resolve => setTimeout(resolve, CALL_SLEEP_MS));
  return response.json();
}

// Fetch and filter filmography for a person
async function buildFilmography(personId, personType) {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`);

  const seenMovies = new Set();
  const movies = [];

  if (personType === 'directors') {
    // For directors: filter crew to job === "Director"
    const crew = data.crew || [];
    for (const credit of crew) {
      if (credit.job !== 'Director') continue;

      const tmdbId = credit.id;
      if (!tmdbId || seenMovies.has(tmdbId)) continue;

      // Skip documentaries
      if ((credit.genre_ids || []).includes(DOC_GENRE_ID)) continue;

      seenMovies.add(tmdbId);
      movies.push(tmdbId);
    }
  } else {
    // For actors/actresses: filter cast to billing_order <= 2
    const cast = data.cast || [];
    for (const credit of cast) {
      if (!isLeadingRole(credit)) continue;

      const tmdbId = credit.id;
      if (!tmdbId || seenMovies.has(tmdbId)) continue;

      // Skip documentaries
      if ((credit.genre_ids || []).includes(DOC_GENRE_ID)) continue;

      seenMovies.add(tmdbId);
      movies.push(tmdbId);
    }
  }

  return movies;
}

// Main processing
async function createPersonBrowseLists() {
  console.log('=== Creating Person Browse Lists ===\n');

  // Read persons list
  const personsData = JSON.parse(fs.readFileSync('persons-list-with-ids.json', 'utf-8'));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5, // Limit concurrent connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const [personType, persons] of Object.entries(personsData)) {
      console.log(`\n📋 Processing ${personType}...`);

      const subcategory = personType.charAt(0).toUpperCase() + personType.slice(1);

      for (const person of persons) {
        const { name, tmdbId } = person;
        totalProcessed++;

        console.log(`\n  🔍 ${name} (TMDB ID: ${tmdbId})`);

        try {
          // Fetch filmography from TMDB
          const tmdbMovieIds = await buildFilmography(tmdbId, personType);
          console.log(`     Found ${tmdbMovieIds.length} ${personType === 'directors' ? 'directed' : 'leading-role'} films in TMDB`);

          if (tmdbMovieIds.length === 0) {
            console.log(`     ⚠️  No films found - skipping`);
            totalSkipped++;
            continue;
          }

          // Cross-reference with database - use client from pool
          const client = await pool.connect();
          try {
            const dbResult = await client.query(
              'SELECT id, tmdb_id, title, year FROM movies WHERE tmdb_id = ANY($1)',
              [tmdbMovieIds]
            );

            const matchedMovies = dbResult.rows;
            console.log(`     Matched ${matchedMovies.length} movies in database`);

            if (matchedMovies.length < MIN_MOVIES) {
              console.log(`     ⚠️  Only ${matchedMovies.length} movies (minimum ${MIN_MOVIES}) - skipping`);
              totalSkipped++;
              continue;
            }

            // Create browse list
            const listResult = await client.query(
              `INSERT INTO browse_lists (name, category, subcategory, movie_count, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               RETURNING id`,
              [name, 'People', subcategory, matchedMovies.length]
            );

            const listId = listResult.rows[0].id;

            // Insert list_movies entries in batch
            const values = matchedMovies.map((movie, idx) =>
              `($${idx * 2 + 1}, $${idx * 2 + 2})`
            ).join(',');
            const params = matchedMovies.flatMap(movie => [listId, movie.id]);

            await client.query(
              `INSERT INTO list_movies (list_id, movie_id)
               VALUES ${values}
               ON CONFLICT DO NOTHING`,
              params
            );

            console.log(`     ✅ Created browse list (${matchedMovies.length} movies)`);
            totalCreated++;

          } finally {
            client.release();
          }

        } catch (error) {
          console.log(`     ❌ Error: ${error.message}`);
          totalSkipped++;
        }
      }
    }

    console.log('\n\n=== Summary ===');
    console.log(`Total persons processed: ${totalProcessed}`);
    console.log(`Browse lists created: ${totalCreated}`);
    console.log(`Skipped: ${totalSkipped}`);
    console.log(`\n✅ Done`);

  } finally {
    await pool.end();
  }
}

createPersonBrowseLists().catch(console.error);
