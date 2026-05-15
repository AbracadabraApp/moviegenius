const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  SELECT column_name, data_type, character_maximum_length
  FROM information_schema.columns
  WHERE table_name = 'movies'
  ORDER BY ordinal_position
`).then(result => {
  console.log('Movies table columns:\n');
  result.rows.forEach(row => {
    const len = row.character_maximum_length ? ` (${row.character_maximum_length})` : '';
    console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}${len}`);
  });
  pool.end();
}).catch(err => {
  console.error('Error:', err.message);
  pool.end();
});
