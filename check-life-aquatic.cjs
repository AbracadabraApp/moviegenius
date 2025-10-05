const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT
    ma.claude_response->>'processed_content' as processed,
    ma.has_links
  FROM movie_analyses ma
  JOIN movies m ON ma.movie_id = m.id
  WHERE m.tmdb_id = 421
  LIMIT 1
`).then(res => {
  const row = res.rows[0];
  console.log('Life Aquatic (TMDB 421):');
  console.log('Has processed_content:', row.processed !== null);
  console.log('Has links flag:', row.has_links);

  if (row.processed) {
    const firstLink = row.processed.indexOf('<a href=');
    console.log('First link position:', firstLink);
    console.log('\nSample (first 500 chars):');
    console.log(row.processed.substring(0, 500));
  } else {
    console.log('\nNo processed_content - needs backfill');
  }

  pool.end();
}).catch(err => {
  console.error(err);
  pool.end();
});