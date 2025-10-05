const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT ma.claude_response->>'raw_content' as raw
  FROM movie_analyses ma
  JOIN movies m ON ma.movie_id = m.id
  WHERE m.tmdb_id = 10601
  LIMIT 1
`).then(res => {
  const raw = JSON.parse(res.rows[0].raw);
  console.log('KEY_CONTRIBUTORS check:');
  console.log('Has keyElements:', !!raw.keyElements);
  console.log('keyElements:', JSON.stringify(raw.keyElements, null, 2));
  console.log('\nFirst section text sample:');
  console.log(raw.content[0].text.substring(0, 500));
  pool.end();
}).catch(err => {
  console.error(err);
  pool.end();
});