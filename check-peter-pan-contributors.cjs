const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT ma.claude_response->>'processed_content' as processed
  FROM movie_analyses ma
  JOIN movies m ON ma.movie_id = m.id
  WHERE m.tmdb_id = 10601
  LIMIT 1
`).then(res => {
  if (!res.rows[0] || !res.rows[0].processed) {
    console.log('No processed content for Peter Pan');
    pool.end();
    return;
  }

  const processed = res.rows[0].processed;
  const parsed = JSON.parse(processed);

  console.log('Peter Pan (10601) Analysis Check:\n');
  console.log('Has content array:', !!parsed.content);
  console.log('Content sections:', parsed.content?.length || 0);

  // Check first section for links
  if (parsed.content && parsed.content[0]) {
    const firstSection = parsed.content[0].text;
    const hasMovieLinks = firstSection.includes('<a href="/movie/');
    const hasPersonLinks = firstSection.includes('<a href="/person/');

    console.log('\nFirst section text sample:');
    console.log(firstSection.substring(0, 500));
    console.log('\n---');
    console.log('Has movie links:', hasMovieLinks);
    console.log('Has person links:', hasPersonLinks);

    // Count total links
    const movieLinks = (processed.match(/<a href="\/movie\//g) || []).length;
    const personLinks = (processed.match(/<a href="\/person\//g) || []).length;
    console.log('\nTotal movie links:', movieLinks);
    console.log('Total person links:', personLinks);
  }

  pool.end();
}).catch(err => {
  console.error(err);
  pool.end();
});