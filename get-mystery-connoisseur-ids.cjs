const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const films = [
  ['Charade', 1963],
  ['Wait Until Dark', 1967],
  ['The Manchurian Candidate', 1962],
  ['Klute', 1971],
  ['The Parallax View', 1974],
  ['Three Days of the Condor', 1975],
  ['Marathon Man', 1976],
  ["All the President's Men", 1976],
  ['The Onion Field', 1979],
  ["Cutter's Way", 1981],
  ['Body Double', 1984],
  ['Blow Out', 1981],
  ['House of Games', 1987],
  ['The Vanishing', 1993],
  ['Jagged Edge', 1985],
  ['No Way Out', 1987],
  ['The Morning After', 1986],
  ['Frantic', 1988],
  ['Presumed Innocent', 1990],
  ['Final Analysis', 1992]
];

(async () => {
  console.log('Mystery > Connoisseur TMDB IDs:\n');
  let found = 0;
  for (const [title, year] of films) {
    const res = await pool.query(
      'SELECT tmdb_id, title, year FROM movies WHERE title = $1 AND year = $2',
      [title, year]
    );
    if (res.rows.length > 0) {
      const m = res.rows[0];
      console.log(`["${title}", ${year}, ${m.tmdb_id}],`);
      found++;
    } else {
      console.log(`// NOT FOUND: ${title} (${year})`);
    }
  }
  console.log(`\nFound: ${found}/20`);
  await pool.end();
})();
