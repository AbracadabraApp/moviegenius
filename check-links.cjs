const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT
    ma.claude_response->>'processed_content' as processed,
    ma.has_links
  FROM movie_analyses ma
  JOIN movies m ON ma.movie_id = m.id
  WHERE m.tmdb_id = 10601
  LIMIT 1
`).then(res => {
  const row = res.rows[0];
  console.log('Has processed_content:', row.processed !== null);
  console.log('Has links flag:', row.has_links);
  console.log('Processed content length:', row.processed ? row.processed.length : 0);
  pool.end();
}).catch(err => {
  console.error(err);
  pool.end();
});