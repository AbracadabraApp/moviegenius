/**
 * Check if sample MoreIdeas titles exist in our database with variations
 */

const { Pool } = require('pg');

async function checkSample() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const testCases = [
    { title: 'Colateral Beauty', year: 2016 },
    { title: 'Monsters Inc', year: 2001 },
    { title: "Pee Wee's Big Adventure", year: 1985 },
    { title: 'The Lion, the Witch & the Wardrobe', year: 2005 },
    { title: 'My Brilliant Friend', year: 2018 },
    { title: 'Gurren Lagann', year: 2007 },
    { title: 'Train to Busan Presents: Peninsula', year: 2020 },
    { title: 'Yes, God, Yes', year: 2019 },
    { title: 'The Sinner', year: 2017 },
    { title: 'Linsanity', year: 2013 }
  ];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('CHECKING IF TITLES EXIST IN DATABASE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const test of testCases) {
    // Check for exact match
    const exact = await pool.query(
      'SELECT tmdb_id, title, year FROM movies WHERE LOWER(title) = LOWER($1) AND year = $2',
      [test.title, test.year]
    );

    // Check for fuzzy match (contains key words, ±1 year)
    const keywords = test.title.split(/[\s,&]+/).filter(w => w.length > 2).slice(0, 3).join('|');
    const fuzzy = await pool.query(
      `SELECT tmdb_id, title, year FROM movies
       WHERE title ~* $1
       AND year BETWEEN $2 - 1 AND $2 + 1
       LIMIT 3`,
      [keywords, test.year]
    );

    console.log(`"${test.title}" (${test.year}):`);
    if (exact.rows.length > 0) {
      console.log(`  ✅ EXACT: ${exact.rows[0].title} (${exact.rows[0].year}) [${exact.rows[0].tmdb_id}]`);
    } else if (fuzzy.rows.length > 0) {
      console.log(`  🔍 FUZZY MATCHES:`);
      fuzzy.rows.forEach(r => console.log(`     - ${r.title} (${r.year}) [${r.tmdb_id}]`));
    } else {
      console.log(`  ❌ NOT IN DATABASE`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  await pool.end();
}

checkSample();
