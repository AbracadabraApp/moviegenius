// Verify link processing rules: no self-references and first-mention-only
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyLinkRules() {
  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Get processed analyses to check link rules
    const result = await client.query(`
      SELECT 
        ma.claude_response->>'processed_content' as content,
        m.title,
        m.year,
        m.tmdb_id,
        ma.link_count
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE 
        ma.has_links = true 
        AND ma.link_count > 0
        AND LENGTH(ma.claude_response->>'processed_content') > 1000
      ORDER BY ma.link_count DESC
      LIMIT 8
    `);
    
    console.log('=== VERIFYING LINK PROCESSING RULES ===\n');
    
    result.rows.forEach((row, index) => {
      console.log(`--- MOVIE ${index + 1}: ${row.title} (${row.year}) - ${row.link_count} links ---`);
      
      const content = row.content;
      const movieTitle = row.title;
      const movieTmdbId = row.tmdb_id;
      
      // Check 1: Self-referential links (look for this movie's TMDB ID in links)
      const selfRefPattern = new RegExp(`href="/movie/${movieTmdbId}"`, 'g');
      const selfLinks = content.match(selfRefPattern);
      console.log(`Self-referential links: ${selfLinks ? selfLinks.length : 0} (should be 0)`);
      
      if (selfLinks && selfLinks.length > 0) {
        console.log(`  ❌ FOUND SELF-REFERENCE to movie ${movieTmdbId}`);
      } else {
        console.log(`  ✅ No self-references found`);
      }
      
      // Check 2: Multiple mentions analysis
      const allLinks = content.match(/<a href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g) || [];
      const linkCounts = {};
      
      allLinks.forEach(link => {
        const movieMatch = link.match(/href="\/movie\/(\d+)"/);
        if (movieMatch) {
          const tmdbId = movieMatch[1];
          linkCounts[tmdbId] = (linkCounts[tmdbId] || 0) + 1;
        }
      });
      
      console.log(`Unique movies linked: ${Object.keys(linkCounts).length}`);
      console.log(`Total link instances: ${allLinks.length}`);
      
      // Check for movies mentioned multiple times
      let hasMultipleMentions = false;
      Object.entries(linkCounts).forEach(([tmdbId, count]) => {
        if (count > 1) {
          hasMultipleMentions = true;
          console.log(`  ⚠️  Movie ${tmdbId} linked ${count} times`);
        }
      });
      
      if (!hasMultipleMentions) {
        console.log(`  ✅ All movies linked only once`);
      }
      
      // Show sample links
      console.log(`Sample links:`);
      allLinks.slice(0, 3).forEach(link => {
        console.log(`  - ${link}`);
      });
      
      console.log('');
    });
    
    // Summary stats
    const totalMovies = result.rows.length;
    const selfRefViolations = result.rows.filter(row => {
      const content = row.content;
      const selfRefPattern = new RegExp(`href="/movie/${row.tmdb_id}"`, 'g');
      return content.match(selfRefPattern);
    }).length;
    
    console.log('=== SUMMARY ===');
    console.log(`Movies checked: ${totalMovies}`);
    console.log(`Self-reference violations: ${selfRefViolations}`);
    console.log(`Self-reference rule: ${selfRefViolations === 0 ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyLinkRules();