/**
 * Check actress filmography counts in database
 * Filter to actresses with ≥11 films in our catalog
 */

import { getPool } from '../lib/database.js';

const actresses = [
  "Bette Davis",
  "Katharine Hepburn",
  "Joan Crawford",
  "Barbara Stanwyck",
  "Ingrid Bergman",
  "Greta Garbo",
  "Marlene Dietrich",
  "Audrey Hepburn",
  "Grace Kelly",
  "Marilyn Monroe",
  "Elizabeth Taylor",
  "Lauren Bacall",
  "Vivien Leigh",
  "Olivia de Havilland",
  "Judy Garland",
  "Rita Hayworth",
  "Faye Dunaway",
  "Jane Fonda",
  "Ellen Burstyn",
  "Liv Ullmann",
  "Vanessa Redgrave",
  "Glenda Jackson",
  "Shirley MacLaine",
  "Sissy Spacek",
  "Jessica Lange",
  "Diane Keaton",
  "Meryl Streep",
  "Cate Blanchett",
  "Julianne Moore",
  "Frances McDormand",
  "Nicole Kidman",
  "Kate Winslet",
  "Tilda Swinton",
  "Viola Davis",
  "Helen Mirren",
  "Judi Dench",
  "Emma Thompson",
  "Jessica Chastain",
  "Charlize Theron",
  "Hilary Swank",
  "Marion Cotillard",
  "Olivia Colman",
  "Sigourney Weaver",
  "Holly Hunter",
  "Michelle Yeoh",
  "Jeanne Moreau",
  "Catherine Deneuve",
  "Isabelle Huppert",
  "Anna Magnani",
  "Setsuko Hara"
];

async function checkActressCounts() {
  const pool = getPool();

  console.log('Checking film counts for', actresses.length, 'actresses...\n');

  const results = [];

  for (const actress of actresses) {
    const result = await pool.query(`
      SELECT COUNT(DISTINCT mc.movie_tmdb_id) as film_count
      FROM movie_contributors mc
      JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
      WHERE mc.person_name = $1
        AND mc.role = 'star'
        AND m.tmdb_id IS NOT NULL
    `, [actress]);

    const count = parseInt(result.rows[0]?.film_count || 0);
    results.push({ actress, count });
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  const qualified = results.filter(r => r.count >= 11);
  const cuts = results.filter(r => r.count > 0 && r.count < 11);
  const notFound = results.filter(r => r.count === 0);

  console.log('=== QUALIFIED (≥11 films) ===');
  console.log(`${qualified.length} actresses\n`);
  qualified.forEach(r => {
    console.log(`${r.actress}: ${r.count} films`);
  });

  console.log('\n=== CUTS (<11 films) ===');
  console.log(`${cuts.length} actresses\n`);
  cuts.forEach(r => {
    console.log(`${r.actress}: ${r.count} films`);
  });

  console.log('\n=== NOT IN DATABASE ===');
  console.log(`${notFound.length} actresses\n`);
  notFound.forEach(r => {
    console.log(`${r.actress}: 0 films`);
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Total actresses checked: ${actresses.length}`);
  console.log(`Qualified (≥11 films): ${qualified.length}`);
  console.log(`Would be cut (<11 films): ${cuts.length}`);
  console.log(`Not in database: ${notFound.length}`);

  await pool.end();
}

checkActressCounts().catch(console.error);
