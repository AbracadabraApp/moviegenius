import { Client } from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

const client = new Client({ 
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL 
});

async function fixMovieFlags(tmdbId) {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get movie and its analysis data
    const result = await client.query(`
      SELECT 
        m.id as movie_id,
        m.title,
        m.year,
        m.has_analysis,
        m.has_linked_analysis,
        COUNT(ma.id) as analysis_count,
        MAX(CASE WHEN ma.has_links = true THEN 1 ELSE 0 END) as has_linked_analysis_flag,
        MAX(ma.linked_at) as latest_linked_at
      FROM movies m
      LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
      WHERE m.tmdb_id = $1
      GROUP BY m.id, m.title, m.year, m.has_analysis, m.has_linked_analysis
    `, [tmdbId]);
    
    if (result.rows.length === 0) {
      console.log('Movie not found');
      return;
    }
    
    const movie = result.rows[0];
    console.log(`\n🎬 Movie: ${movie.title} (${movie.year})`);
    console.log(`Current flags: has_analysis=${movie.has_analysis}, has_linked_analysis=${movie.has_linked_analysis}`);
    console.log(`Analysis count: ${movie.analysis_count}`);
    console.log(`Has linked analysis: ${movie.has_linked_analysis_flag === 1}`);
    
    // Determine correct flag values
    const correctHasAnalysis = movie.analysis_count > 0;
    const correctHasLinkedAnalysis = movie.has_linked_analysis_flag === 1;
    
    console.log(`\n📊 Correct flags should be:`);
    console.log(`  - has_analysis: ${correctHasAnalysis}`);
    console.log(`  - has_linked_analysis: ${correctHasLinkedAnalysis}`);
    
    // Update if needed
    if (movie.has_analysis !== correctHasAnalysis || movie.has_linked_analysis !== correctHasLinkedAnalysis) {
      console.log(`\n🔧 Updating movie flags...`);
      
      const updateResult = await client.query(`
        UPDATE movies 
        SET 
          has_analysis = $1,
          has_linked_analysis = $2,
          analysis_completed_at = $3,
          updated_at = NOW()
        WHERE tmdb_id = $4
        RETURNING title, year, has_analysis, has_linked_analysis
      `, [
        correctHasAnalysis,
        correctHasLinkedAnalysis,
        movie.latest_linked_at || (correctHasAnalysis ? new Date() : null),
        tmdbId
      ]);
      
      if (updateResult.rows.length > 0) {
        const updated = updateResult.rows[0];
        console.log(`✅ Updated movie flags:`);
        console.log(`  - ${updated.title} (${updated.year})`);
        console.log(`  - has_analysis: ${updated.has_analysis}`);
        console.log(`  - has_linked_analysis: ${updated.has_linked_analysis}`);
      }
    } else {
      console.log(`\n✅ Movie flags are already correct!`);
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await client.end();
  }
}

// Fix the flags for our test movie
fixMovieFlags(715253);