// Debug script for movie 242224 missing formatted content
import { Client } from 'pg';
import dotenv from 'dotenv';

async function debugMovie242224() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔍 Debugging Movie 242224 Missing Formatted Content');
    
    // Query the movie analysis data
    const query = `
      SELECT 
        tmdb_id,
        title,
        year,
        has_analysis,
        has_linked_analysis,
        analysis_completed_at
      FROM movies 
      WHERE tmdb_id = 242224
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ Movie 242224 not found in database');
      return;
    }
    
    const movie = result.rows[0];
    console.log('\n📽️ Movie Info:');
    console.log(`Title: ${movie.title} (${movie.year})`);
    console.log(`Has Analysis: ${movie.has_analysis}`);
    console.log(`Has Linked Analysis: ${movie.has_linked_analysis}`);
    console.log(`Analysis Completed: ${movie.analysis_completed_at}`);
    
    if (!movie.has_analysis) {
      console.log('\n❌ Movie has no analysis - this explains missing content');
      console.log('The API will try to generate fresh analysis using Claude');
      return;
    }
    
    console.log('\n✅ Movie should have analysis - checking why content is not formatted...');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

// Load environment variables
dotenv.config({ path: '.env.local' });
debugMovie242224();