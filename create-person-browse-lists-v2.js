import fs from 'fs';
import { Pool } from 'pg';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_API = 'https://api.themoviedb.org/3';
const CALL_SLEEP_MS = 30;
const LEAD_ORDER_MAX = 2;
const MIN_MOVIES = 5;
const DOC_GENRE_ID = 99;

const SELF_MARKERS = ['self', 'himself', 'herself', 'narrator', 'host', 'uncredited', 'archive footage'];

// Helper: Check if a cast credit is a leading role
function isLeadingRole(credit) {
  const order = credit.order;
  if (order === null || order === undefined || order > LEAD_ORDER_MAX) {
    return false;
  }

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
    const crew = data.crew || [];
    for (const credit of crew) {
      if (credit.job !== 'Director') continue;

      const tmdbId = credit.id;
      if (!tmdbId || seenMovies.has(tmdbId)) continue;
      if ((credit.genre_ids || []).includes(DOC_GENRE_ID)) continue;

      seenMovies.add(tmdbId);
      movies.push(tmdbId);
    }
  } else {
    const cast = data.cast || [];
    for (const credit of cast) {
      if (!isLeadingRole(credit)) continue;

      const tmdbId = credit.id;
      if (!tmdbId || seenMovies.has(tmdbId)) continue;
      if ((credit.genre_ids || []).includes(DOC_GENRE_ID)) continue;

      seenMovies.add(tmdbId);
      movies.push(tmdbId);
    }
  }

  return movies;
}

// PHASE 1: Fetch all TMDB filmographies (no database connection)
async function fetchAllFilmographies(personsData) {
  console.log('=== PHASE 1: Fetching TMDB Filmographies ===\n');

  const personFilms = [];

  for (const [personType, persons] of Object.entries(personsData)) {
    console.log(`\n📋 Fetching ${personType}...`);
    const subcategory = personType.charAt(0).toUpperCase() + personType.slice(1);

    for (const person of persons) {
      const { name, tmdbId } = person;
      console.log(`  🔍 ${name} (TMDB ID: ${tmdbId})`);

      try {
        const tmdbMovieIds = await buildFilmography(tmdbId, personType);
        console.log(`     Found ${tmdbMovieIds.length} films`);

        if (tmdbMovieIds.length > 0) {
          personFilms.push({
            name,
            tmdbId,
            personType,
            subcategory,
            tmdbMovieIds
          });
        } else {
          console.log(`     ⚠️  No films found`);
        }
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Phase 1 complete: ${personFilms.length} persons with filmographies\n`);
  return personFilms;
}

// PHASE 2: Process database inserts in batches
async function processDatabaseInserts(personFilms, pool) {
  console.log('=== PHASE 2: Creating Browse Lists in Database ===\n');

  let totalCreated = 0;
  let totalSkipped = 0;

  // Process in small batches to avoid holding connections too long
  const BATCH_SIZE = 5;

  for (let i = 0; i < personFilms.length; i += BATCH_SIZE) {
    const batch = personFilms.slice(i, i + BATCH_SIZE);

    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(personFilms.length / BATCH_SIZE)}...`);

    for (const person of batch) {
      console.log(`  🔍 ${person.name}`);

      try {
        // Get connection from pool
        const client = await pool.connect();

        try {
          // Query movies - this is the slow part
          const dbResult = await client.query(
            'SELECT id, tmdb_id FROM movies WHERE tmdb_id = ANY($1)',
            [person.tmdbMovieIds]
          );

          const matchedMovies = dbResult.rows;
          console.log(`     Matched ${matchedMovies.length}/${person.tmdbMovieIds.length} movies in database`);

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
            [person.name, 'People', person.subcategory, matchedMovies.length]
          );

          const listId = listResult.rows[0].id;

          // Batch insert list_movies
          if (matchedMovies.length > 0) {
            const values = matchedMovies.map((_, idx) =>
              `($${idx * 2 + 1}, $${idx * 2 + 2})`
            ).join(',');
            const params = matchedMovies.flatMap(movie => [listId, movie.id]);

            await client.query(
              `INSERT INTO list_movies (list_id, movie_id)
               VALUES ${values}
               ON CONFLICT DO NOTHING`,
              params
            );
          }

          console.log(`     ✅ Created browse list (${matchedMovies.length} movies)`);
          totalCreated++;

        } finally {
          // ALWAYS release connection
          client.release();
        }

      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
        totalSkipped++;
      }
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Summary ===');
  console.log(`Browse lists created: ${totalCreated}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`\n✅ Done`);
}

// Main
async function createPersonBrowseLists() {
  const personsData = JSON.parse(fs.readFileSync('persons-list-with-ids.json', 'utf-8'));

  // Phase 1: Fetch TMDB data (no database)
  const personFilms = await fetchAllFilmographies(personsData);

  // Phase 2: Database inserts
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3, // Limit concurrent connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    await processDatabaseInserts(personFilms, pool);
  } finally {
    await pool.end();
  }
}

createPersonBrowseLists().catch(console.error);
