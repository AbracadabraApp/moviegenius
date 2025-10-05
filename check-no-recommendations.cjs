#!/usr/bin/env node

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(`
      SELECT recommendation, reasons, tmdb_id
      FROM enhanced_why_watch
      WHERE recommendation = 'NO'
      LIMIT 20
    `);

    console.log(`Found ${result.rows.length} NO recommendations\n`);

    result.rows.slice(0, 5).forEach((row, i) => {
      console.log(`${i + 1}. Movie TMDB ${row.tmdb_id}`);
      console.log(`   Recommendation: ${row.recommendation}`);
      row.reasons.forEach((reason, j) => {
        console.log(`   ${j + 1}. ${reason}`);
      });
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
