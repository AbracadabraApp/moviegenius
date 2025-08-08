import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });

async function debugLinkPattern() {
  await client.connect();
  
  try {
    // Get the exact text around Garden State from Reality Bites
    const query = `
      SELECT 
        claude_response::text as full_text
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = 2788
    `;
    
    const result = await client.query(query);
    if (result.rows.length > 0) {
      const fullText = result.rows[0].full_text;
      
      // Find the Garden State section
      const gardenStateIndex = fullText.indexOf('Garden State');
      if (gardenStateIndex !== -1) {
        const start = Math.max(0, gardenStateIndex - 200);
        const end = Math.min(fullText.length, gardenStateIndex + 300);
        const excerpt = fullText.substring(start, end);
        
        console.log('📝 Text around Garden State:');
        console.log(excerpt);
        
        console.log('\n🔍 Pattern analysis:');
        console.log('  • Contains "href=\\"/movie/": ', excerpt.includes('href="/movie/'));
        console.log('  • Contains "/movie/401": ', excerpt.includes('/movie/401'));
        console.log('  • Contains "<a href": ', excerpt.includes('<a href'));
        console.log('  • Contains "movie-title": ', excerpt.includes('movie-title'));
        
        // Check for escaped quotes
        console.log('  • Contains href=\\"\\\\\\"/movie/: ', excerpt.includes('href=\\"/movie/'));
        console.log('  • Contains href=\\\\\\"\\\\\\\\\\": ', excerpt.includes('href=\\\\\\"'));
      }
      
      // Count total href="/movie/ patterns in the entire text
      const hrefCount = (fullText.match(/href="\/movie\//g) || []).length;
      const hrefEscapedCount = (fullText.match(/href=\\"\/movie\//g) || []).length;
      const movieLinkCount = (fullText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
      
      console.log('\n📊 Full document counts:');
      console.log(`  • href="/movie/ patterns: ${hrefCount}`);
      console.log(`  • href=\\"/movie/ patterns: ${hrefEscapedCount}`);
      console.log(`  • Complete <a> movie links: ${movieLinkCount}`);
    }
    
  } finally {
    await client.end();
  }
}

debugLinkPattern().catch(console.error);