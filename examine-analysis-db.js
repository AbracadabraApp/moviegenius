// Examine actual movie_analyses database structure
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAnalysisStructure() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Get a sample movie_analyses record to see the actual structure
    const result = await client.query('SELECT * FROM movie_analyses LIMIT 1');
    
    if (result.rows.length > 0) {
      const record = result.rows[0];
      console.log('=== MOVIE_ANALYSES RECORD STRUCTURE ===');
      console.log('Columns:', Object.keys(record));
      console.log('');
      
      // Show each field and its type/sample
      for (const [key, value] of Object.entries(record)) {
        const valueType = typeof value;
        const sampleValue = valueType === 'object' ? '(object)' : String(value).substring(0, 100);
        console.log(`${key}: ${valueType} - ${sampleValue}...`);
      }
      
      // If claude_response exists, show its structure
      if (record.claude_response) {
        console.log('');
        console.log('=== CLAUDE_RESPONSE STRUCTURE ===');
        const cr = record.claude_response;
        if (typeof cr === 'object') {
          console.log('Claude response keys:', Object.keys(cr));
          
          // Show sample of content
          if (cr.raw_content) {
            console.log('');
            console.log('Raw content sample (first 300 chars):');
            console.log(cr.raw_content.substring(0, 300) + '...');
          }
          
          // Check for movie data
          if (cr.movie_data) {
            console.log('');
            console.log('Movie data keys:', Object.keys(cr.movie_data));
          }
          
          // Check for processed content
          if (cr.processed_content) {
            console.log('');
            console.log('Processed content sample (first 200 chars):');
            console.log(cr.processed_content.substring(0, 200) + '...');
          }
        }
      }
    } else {
      console.log('No movie_analyses records found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAnalysisStructure();