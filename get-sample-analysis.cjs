require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT m.title, m.year, ma.claude_response
  FROM movies m
  JOIN movie_analyses ma ON m.id = ma.movie_id
  WHERE m.title = 'The Matrix' AND m.year = 1999
  LIMIT 1
`)
.then(result => {
  if (result.rows.length > 0) {
    const analysis = result.rows[0].claude_response;
    console.log('=== THE MATRIX (1999) ANALYSIS ===');
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    console.log('Matrix analysis not found');
  }
  pool.end();
})
.catch(error => {
  console.error('Error:', error.message);
  pool.end();
});