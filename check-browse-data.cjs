// Quick script to check browse data in database
const { Client } = require('pg');

async function checkBrowseData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if browse_lists table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'browse_lists'
      );
    `);

    console.log('\n📊 Browse Lists Table Exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Count browse lists
      const listCount = await client.query('SELECT COUNT(*) FROM browse_lists');
      console.log('📝 Total Browse Lists:', listCount.rows[0].count);

      // Count list_movies
      const movieCount = await client.query('SELECT COUNT(*) FROM list_movies');
      console.log('🎬 Total List Movies:', movieCount.rows[0].count);

      // Check browse_list_jobs
      const jobsCount = await client.query('SELECT COUNT(*), status FROM browse_list_jobs GROUP BY status');
      console.log('\n🔧 Browse List Jobs:');
      if (jobsCount.rows.length > 0) {
        jobsCount.rows.forEach(row => {
          console.log(`  - ${row.status}: ${row.count}`);
        });
      } else {
        console.log('  - No jobs found');
      }

      // Sample browse lists
      const samples = await client.query(`
        SELECT id, title, total_movies, status, created_at
        FROM browse_lists
        ORDER BY created_at DESC
        LIMIT 5
      `);

      console.log('\n📚 Sample Browse Lists:');
      if (samples.rows.length > 0) {
        samples.rows.forEach(list => {
          console.log(`  - ${list.title} (${list.total_movies} movies) [${list.status}]`);
        });
      } else {
        console.log('  - No browse lists found');
      }
    } else {
      console.log('\n⚠️  Browse lists table does not exist - schema not installed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkBrowseData();
