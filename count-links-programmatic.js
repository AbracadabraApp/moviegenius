import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });

async function countLinksProgrammatically() {
  await client.connect();
  
  try {
    console.log('🔍 Counting movie links programmatically...');
    
    // Get all analyses in batches
    const query = `
      SELECT 
        ma.id,
        m.title,
        m.tmdb_id,
        claude_response::text as claude_response_text
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      ORDER BY ma.id
      LIMIT 5000
    `;
    
    const result = await client.query(query);
    console.log(`Checking ${result.rows.length} analyses...`);
    
    let totalWithLinks = 0;
    let totalChecked = 0;
    const examplesWithLinks = [];
    
    for (const row of result.rows) {
      totalChecked++;
      const claudeText = row.claude_response_text;
      
      // Look for the movie link pattern we found in Reality Bites
      const hasMovieLinks = claudeText.includes('href=\\"/movie/') || 
                           claudeText.includes('/movie/') && claudeText.includes('<a href');
      
      if (hasMovieLinks) {
        totalWithLinks++;
        if (examplesWithLinks.length < 5) {
          examplesWithLinks.push({
            title: row.title,
            tmdb_id: row.tmdb_id
          });
        }
        
        // Count actual movie links in this analysis
        const movieLinkMatches = claudeText.match(/<a[^>]*href=[^>]*\/movie\/\d+[^>]*>/g) || [];
        
        if (movieLinkMatches.length > 0) {
          console.log(`✓ ${row.title} (${row.tmdb_id}): ${movieLinkMatches.length} movie links`);
        }
      }
      
      if (totalChecked % 100 === 0) {
        console.log(`  Processed ${totalChecked}/${result.rows.length}...`);
      }
    }
    
    console.log(`\n📊 Programmatic Results (first 1000 analyses):`);
    console.log(`  • Analyses checked: ${totalChecked}`);
    console.log(`  • With movie links: ${totalWithLinks}`);
    console.log(`  • Coverage in sample: ${((totalWithLinks/totalChecked)*100).toFixed(1)}%`);
    
    console.log(`\n📋 Examples with links:`);
    examplesWithLinks.forEach(movie => {
      console.log(`  • ${movie.title} (TMDB: ${movie.tmdb_id})`);
    });
    
    // Extrapolate to full dataset
    const totalAnalysesResult = await client.query('SELECT COUNT(*) as total FROM movie_analyses');
    const totalAnalyses = totalAnalysesResult.rows[0].total;
    const estimatedWithLinks = Math.round((totalWithLinks / totalChecked) * totalAnalyses);
    
    console.log(`\n🎯 Estimated Full Coverage:`);
    console.log(`  • Total analyses: ${totalAnalyses}`);
    console.log(`  • Estimated with links: ${estimatedWithLinks}`);
    console.log(`  • Estimated coverage: ${((estimatedWithLinks/totalAnalyses)*100).toFixed(1)}%`);
    
  } finally {
    await client.end();
  }
}

countLinksProgrammatically().catch(console.error);