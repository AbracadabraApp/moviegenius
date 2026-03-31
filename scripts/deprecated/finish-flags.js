import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });

async function finishFlags() {
  await client.connect();

  console.log('🔧 Finishing flag updates...');

  let offset = 11500; // Start where we left off
  const batchSize = 1000;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalWithLinks = 0;

  while (true) {
    const query = `
      SELECT 
        ma.id,
        ma.has_links,
        ma.link_count,
        claude_response::text as claude_response_text
      FROM movie_analyses ma
      ORDER BY ma.id
      LIMIT ${batchSize}
      OFFSET ${offset}
    `;
    
    const result = await client.query(query);
    if (result.rows.length === 0) break;
    
    console.log(`Processing batch at offset ${offset} (${result.rows.length} analyses)...`);
    
    const updates = [];
    
    for (const row of result.rows) {
      totalProcessed++;
      const claudeText = row.claude_response_text;
      
      const movieLinkMatches = claudeText.match(/<a[^>]*href=[^>]*\/movie\/\d+[^>]*>/g) || [];
      const linkCount = movieLinkMatches.length;
      const hasLinks = linkCount > 0;
      
      if (hasLinks) totalWithLinks++;
      
      const needsUpdate = (row.has_links !== hasLinks) || (row.link_count !== linkCount);
      
      if (needsUpdate) {
        updates.push({ id: row.id, hasLinks, linkCount });
      }
    }
    
    if (updates.length > 0) {
      console.log(`  Updating ${updates.length} records...`);
      
      await client.query('BEGIN');
      
      try {
        for (const update of updates) {
          await client.query(
            'UPDATE movie_analyses SET has_links = $1, link_count = $2 WHERE id = $3',
            [update.hasLinks, update.linkCount, update.id]
          );
        }
        
        await client.query('COMMIT');
        console.log(`  ✅ Updated ${updates.length} records`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      
      totalUpdated += updates.length;
    }
    
    offset += batchSize;
    
    if (totalProcessed % 2000 === 0) {
      console.log(`  Progress: ${totalProcessed} processed, ${totalWithLinks} with links, ${totalUpdated} updated`);
    }
  }

  console.log(`\n📊 Final batch results:`);
  console.log(`  • Processed: ${totalProcessed}`);
  console.log(`  • With links: ${totalWithLinks}`);
  console.log(`  • Updated: ${totalUpdated}`);

  await client.end();
}

finishFlags().catch(console.error);