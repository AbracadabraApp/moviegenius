const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        m.title,
        m.year,
        ew.recommendation,
        ew.reasons
      FROM movies m
      INNER JOIN enhanced_why_watch ew ON m.tmdb_id = ew.tmdb_id
      WHERE ew.recommendation IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 10
    `);

    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.title} (${row.year})`);
      console.log(`   Database: ${row.recommendation}`);
      row.reasons.forEach(r => console.log(`   - ${r}`));
      console.log();
    });

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
