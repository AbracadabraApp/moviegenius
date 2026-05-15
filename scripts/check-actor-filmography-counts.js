/**
 * Check actor filmography counts in database
 * Filter to actors with ≥10 films in our catalog
 */

import { getPool } from '../lib/database.js';

const actors = [
  // Classical Hollywood
  "Humphrey Bogart",
  "James Stewart",
  "Cary Grant",
  "Henry Fonda",
  "Gary Cooper",
  "Spencer Tracy",
  "Clark Gable",
  "James Cagney",
  "Robert Mitchum",
  "Burt Lancaster",
  "Kirk Douglas",
  "Gregory Peck",
  "John Wayne",
  "Sidney Poitier",
  "Paul Newman",
  "Marlon Brando",

  // New Hollywood and beyond
  "Jack Nicholson",
  "Robert De Niro",
  "Al Pacino",
  "Dustin Hoffman",
  "Gene Hackman",
  "Robert Duvall",
  "Warren Beatty",
  "Robert Redford",
  "Clint Eastwood",
  "Steve McQueen",
  "Peter O'Toole",

  // Contemporary
  "Daniel Day-Lewis",
  "Anthony Hopkins",
  "Tom Hanks",
  "Denzel Washington",
  "Sean Penn",
  "Philip Seymour Hoffman",
  "Joaquin Phoenix",
  "Christian Bale",
  "Leonardo DiCaprio",
  "Gary Oldman",
  "Russell Crowe",
  "Jeff Bridges",
  "Forest Whitaker",
  "Adrien Brody",
  "Casey Affleck",
  "Mahershala Ali",

  // International
  "Toshiro Mifune",
  "Marcello Mastroianni",
  "Max von Sydow",
  "Tony Leung Chiu-wai",
  "Song Kang-ho",
  "Jean-Paul Belmondo",
  "Gérard Depardieu"
];

async function checkActorCounts() {
  const pool = getPool();

  console.log('Checking film counts for', actors.length, 'actors...\n');

  const results = [];

  for (const actor of actors) {
    const result = await pool.query(`
      SELECT COUNT(DISTINCT mc.movie_tmdb_id) as film_count
      FROM movie_contributors mc
      JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
      WHERE mc.person_name = $1
        AND mc.role = 'star'
        AND m.tmdb_id IS NOT NULL
    `, [actor]);

    const count = parseInt(result.rows[0]?.film_count || 0);
    results.push({ actor, count });
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  const qualified = results.filter(r => r.count >= 10);
  const cuts = results.filter(r => r.count > 0 && r.count < 10);
  const notFound = results.filter(r => r.count === 0);

  console.log('=== QUALIFIED (≥10 films) ===');
  console.log(`${qualified.length} actors\n`);
  qualified.forEach(r => {
    console.log(`${r.actor}: ${r.count} films`);
  });

  console.log('\n=== CUTS (<10 films) ===');
  console.log(`${cuts.length} actors\n`);
  cuts.forEach(r => {
    console.log(`${r.actor}: ${r.count} films`);
  });

  console.log('\n=== NOT IN DATABASE ===');
  console.log(`${notFound.length} actors\n`);
  notFound.forEach(r => {
    console.log(`${r.actor}: 0 films`);
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Total actors checked: ${actors.length}`);
  console.log(`Qualified (≥10 films): ${qualified.length}`);
  console.log(`Would be cut (<10 films): ${cuts.length}`);
  console.log(`Not in database: ${notFound.length}`);

  await pool.end();
}

checkActorCounts().catch(console.error);
