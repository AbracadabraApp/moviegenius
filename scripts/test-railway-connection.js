// Quick test to verify Railway PostgreSQL connection from main MovieGenius app
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testRailwayConnection() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL
  });

  try {
    console.log('🔗 Connecting to Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test query - get movie count
    const movieResult = await client.query('SELECT COUNT(*) as count FROM movies');
    console.log(`📺 Movies in Railway database: ${movieResult.rows[0].count}`);
    
    // Test query - get analysis count  
    const analysisResult = await client.query('SELECT COUNT(*) as count FROM movie_analyses');
    console.log(`🎬 Movie analyses in Railway database: ${analysisResult.rows[0].count}`);
    
    // Test specific movie lookup
    const movieTest = await client.query(`
      SELECT m.title, m.year, COUNT(ma.id) as analysis_count 
      FROM movies m 
      LEFT JOIN movie_analyses ma ON m.id = ma.movie_id 
      GROUP BY m.id, m.title, m.year 
      ORDER BY m.title 
      LIMIT 5
    `);
    
    console.log('\n🎥 Sample movies with analysis counts:');
    movieTest.rows.forEach(row => {
      console.log(`  - ${row.title} (${row.year}) - ${row.analysis_count} analyses`);
    });
    
    console.log('\n🎉 Railway PostgreSQL connection test successful!');
    
  } catch (error) {
    console.error('❌ Railway connection failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

testRailwayConnection();