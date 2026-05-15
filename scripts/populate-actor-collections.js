/**
 * Populate Actor Collections
 *
 * Creates browse_lists entries for 49 prestigious actors (≥10 films)
 * with quality_score = 10 for balanced homepage mix.
 */

import { getPool } from '../lib/database.js';

const actors = [
  // Classical Hollywood
  'Humphrey Bogart', 'James Stewart', 'Cary Grant', 'Henry Fonda',
  'Gary Cooper', 'Spencer Tracy', 'Clark Gable', 'James Cagney',
  'Robert Mitchum', 'Burt Lancaster', 'Kirk Douglas', 'Gregory Peck',
  'John Wayne', 'Sidney Poitier', 'Paul Newman', 'Marlon Brando',

  // New Hollywood and beyond
  'Jack Nicholson', 'Robert De Niro', 'Al Pacino', 'Dustin Hoffman',
  'Gene Hackman', 'Robert Duvall', 'Warren Beatty', 'Robert Redford',
  'Clint Eastwood', 'Steve McQueen', 'Peter O\'Toole',

  // Contemporary
  'Daniel Day-Lewis', 'Anthony Hopkins', 'Tom Hanks', 'Denzel Washington',
  'Sean Penn', 'Philip Seymour Hoffman', 'Joaquin Phoenix', 'Christian Bale',
  'Leonardo DiCaprio', 'Gary Oldman', 'Russell Crowe', 'Jeff Bridges',
  'Forest Whitaker', 'Adrien Brody', 'Casey Affleck',

  // International
  'Toshiro Mifune', 'Marcello Mastroianni', 'Max von Sydow',
  'Tony Leung Chiu-wai', 'Song Kang-ho', 'Jean-Paul Belmondo', 'Gérard Depardieu'
];

async function populateActorCollections() {
  const pool = getPool();

  console.log('Populating actor collections...\n');
  console.log(`Target: ${actors.length} actors\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const actorName of actors) {
    try {
      // 1. Get all films starring this actor
      const films = await pool.query(`
        SELECT DISTINCT
          m.id,
          m.tmdb_id,
          m.title,
          m.year
        FROM movie_contributors mc
        JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
        WHERE mc.person_name = $1
          AND mc.role = 'star'
          AND m.tmdb_id IS NOT NULL
        ORDER BY m.year DESC NULLS LAST
      `, [actorName]);

      if (films.rows.length < 10) {
        console.log(`⚠️  ${actorName}: Only ${films.rows.length} films, skipping`);
        skipped++;
        continue;
      }

      // 2. Check if collection already exists
      const existing = await pool.query(`
        SELECT id FROM browse_lists WHERE title = $1
      `, [actorName]);

      if (existing.rows.length > 0) {
        console.log(`⊘  ${actorName}: Already exists, skipping`);
        skipped++;
        continue;
      }

      // 3. Build editorial_data JSONB structure
      const moviesJson = films.rows.map(film => ({
        tmdb_id: film.tmdb_id,
        title: film.title,
        year: film.year
      }));

      const editorialData = {
        subcategories: [
          {
            name: "Filmography",
            movies: moviesJson
          }
        ]
      };

      // 4. Create browse_list entry
      await pool.query(`
        INSERT INTO browse_lists
          (title, description, curated, quality_score, status, total_movies, categories, editorial_data, created_at, updated_at)
        VALUES ($1, $2, TRUE, 10, 'active', $3, $4, $5, NOW(), NOW())
      `, [
        actorName,
        `Complete filmography of ${actorName} in our catalog.`,
        films.rows.length,
        ['Actors'],
        JSON.stringify(editorialData)
      ]);

      console.log(`✓ ${actorName}: ${films.rows.length} films`);
      created++;

    } catch (err) {
      console.error(`✗ ${actorName}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${actors.length}`);

  await pool.end();
}

populateActorCollections().catch(console.error);
