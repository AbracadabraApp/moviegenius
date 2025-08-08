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

async function checkMovie() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check if movie exists
    const result = await client.query('SELECT * FROM movies WHERE tmdb_id = $1', [715253]);
    
    if (result.rows.length > 0) {
      console.log('Movie found:', result.rows[0]);
    } else {
      console.log('Movie NOT found in database');
    }
    
    // Also check for any analyses for this movie
    if (result.rows.length > 0) {
      const analysisResult = await client.query('SELECT id, has_links, link_count, linked_at, created_at FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC', [result.rows[0].id]);
      console.log(`Analysis count: ${analysisResult.rows.length}`);
      
      if (analysisResult.rows.length > 0) {
        const latest = analysisResult.rows[0];
        console.log('Latest analysis linking status:');
        console.log(`  - has_links: ${latest.has_links}`);
        console.log(`  - link_count: ${latest.link_count}`);
        console.log(`  - linked_at: ${latest.linked_at}`);
        console.log(`  - created_at: ${latest.created_at}`);
      }
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await client.end();
  }
}

checkMovie();