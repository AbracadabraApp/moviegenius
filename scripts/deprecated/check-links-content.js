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

async function checkLinksContent() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get the analysis with processed content
    const result = await client.query(`
      SELECT 
        ma.claude_response,
        m.title,
        m.year
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
      ORDER BY ma.created_at DESC
      LIMIT 1
    `, [715253]);
    
    if (result.rows.length > 0) {
      const analysis = result.rows[0];
      console.log(`\nAnalysis for: ${analysis.title} (${analysis.year})`);
      
      const claudeResponse = analysis.claude_response;
      
      // Check if processed_content exists
      if (claudeResponse.processed_content) {
        console.log('\n✅ Processed content found with links:');
        
        // Extract movie links
        const linkMatches = claudeResponse.processed_content.match(/<a[^>]*href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g);
        
        if (linkMatches) {
          console.log(`\n🔗 Found ${linkMatches.length} movie links:`);
          linkMatches.forEach((link, index) => {
            console.log(`${index + 1}. ${link}`);
          });
        } else {
          console.log('\n❌ No movie links found in processed content');
        }
        
        // Show a sample of the processed content
        console.log('\n📄 Sample processed content (first 500 chars):');
        console.log(claudeResponse.processed_content.substring(0, 500) + '...');
      } else {
        console.log('\n❌ No processed_content found');
        
        if (claudeResponse.raw_content) {
          console.log('\n📄 Raw content found - checking for ** patterns:');
          const content = typeof claudeResponse.raw_content === 'string' 
            ? claudeResponse.raw_content 
            : JSON.stringify(claudeResponse.raw_content);
            
          const boldPatterns = content.match(/\*\*[^*]+\*\*/g);
          if (boldPatterns) {
            console.log(`Found ${boldPatterns.length} ** patterns:`, boldPatterns.slice(0, 5));
          } else {
            console.log('No ** patterns found');
          }
        }
      }
    } else {
      console.log('No analysis found');
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await client.end();
  }
}

checkLinksContent();