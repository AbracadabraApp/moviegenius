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

async function checkMovieFlags() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check movie flags for our test movie
    const movieResult = await client.query(`
      SELECT 
        id,
        title,
        year,
        tmdb_id,
        has_analysis,
        has_linked_analysis,
        analysis_completed_at
      FROM movies 
      WHERE tmdb_id = $1
    `, [715253]);
    
    if (movieResult.rows.length > 0) {
      const movie = movieResult.rows[0];
      console.log(`\n🎬 Movie: ${movie.title} (${movie.year})`);
      console.log(`TMDB ID: ${movie.tmdb_id}`);
      console.log(`Movie flags:`);
      console.log(`  - has_analysis: ${movie.has_analysis}`);
      console.log(`  - has_linked_analysis: ${movie.has_linked_analysis}`);
      console.log(`  - analysis_completed_at: ${movie.analysis_completed_at}`);
      
      // Check analysis flags
      const analysisResult = await client.query(`
        SELECT 
          id,
          has_links,
          link_count,
          linked_at,
          created_at
        FROM movie_analyses 
        WHERE movie_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [movie.id]);
      
      if (analysisResult.rows.length > 0) {
        const analysis = analysisResult.rows[0];
        console.log(`\n📊 Analysis flags:`);
        console.log(`  - has_links: ${analysis.has_links}`);
        console.log(`  - link_count: ${analysis.link_count}`);
        console.log(`  - linked_at: ${analysis.linked_at}`);
        console.log(`  - created_at: ${analysis.created_at}`);
        
        // Check if movie flags are correct
        const shouldHaveAnalysis = true;
        const shouldHaveLinkedAnalysis = analysis.has_links;
        
        console.log(`\n🔍 Flag Accuracy Check:`);
        console.log(`  - Movie has_analysis should be: ${shouldHaveAnalysis} (current: ${movie.has_analysis})`);
        console.log(`  - Movie has_linked_analysis should be: ${shouldHaveLinkedAnalysis} (current: ${movie.has_linked_analysis})`);
        
        if (movie.has_analysis !== shouldHaveAnalysis || movie.has_linked_analysis !== shouldHaveLinkedAnalysis) {
          console.log(`\n⚠️  Movie flags need updating!`);
        } else {
          console.log(`\n✅ Movie flags are correct!`);
        }
      }
    } else {
      console.log('Movie not found');
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await client.end();
  }
}

checkMovieFlags();