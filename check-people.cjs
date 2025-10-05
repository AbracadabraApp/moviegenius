const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT COUNT(*) FROM people").then(res => {
  console.log('Total people in database:', res.rows[0].count);
  return pool.query("SELECT name FROM people WHERE name IN ('Bill Murray', 'Wes Anderson', 'Owen Wilson', 'Cate Blanchett', 'P.J. Hogan', 'Jason Isaacs') ORDER BY name");
}).then(res => {
  console.log('\nWell-known people in database:');
  res.rows.forEach(r => console.log(' -', r.name));
  pool.end();
}).catch(err => {
  console.error(err);
  pool.end();
});