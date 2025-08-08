// Check analysis format for movies with contributors
import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

async function checkAnalysisFormat() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // First, check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\nTables in Railway database:');
    tablesResult.rows.forEach(row => console.log(' -', row.table_name));

    // Get movies that have contributors (these were successfully processed)
    const contributorMoviesResult = await client.query(`
      SELECT DISTINCT movie_tmdb_id 
      FROM movie_contributors 
      ORDER BY movie_tmdb_id 
      LIMIT 10
    `);

    console.log(`\nFound ${contributorMoviesResult.rows.length} movies with contributors`);

    for (const row of contributorMoviesResult.rows) {
      const tmdbId = row.movie_tmdb_id;
      
      // Get movie details - check if the movie exists and what analysis data is available
      const movieResult = await client.query(`
        SELECT tmdb_id, title, year 
        FROM movies 
        WHERE tmdb_id = $1
      `, [tmdbId]);
      
      if (movieResult.rows.length === 0) {
        console.log(`\n--- Movie ID: ${tmdbId} NOT FOUND in movies table ---`);
        continue;
      }

      const movie = movieResult.rows[0];
      console.log(`\n--- ${movie.title} (${movie.year}) - ID: ${tmdbId} ---`);
      console.log(`Movie exists in Railway database but no analysis format to check here`);
      console.log(`Need to check the actual website to see if footer displays`)
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAnalysisFormat();