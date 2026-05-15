const { Pool } = require('pg');

async function investigate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Check movie_list_relationships schema
    const schema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'movie_list_relationships'
      ORDER BY ordinal_position
    `);

    console.log('movie_list_relationships schema:');
    schema.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Sample data
    const sample = await pool.query(`SELECT * FROM movie_list_relationships LIMIT 3`);
    console.log('\nSample rows:');
    console.log(JSON.stringify(sample.rows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

investigate();
