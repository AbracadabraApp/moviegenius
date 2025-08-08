import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });

async function fixLinkFlags(dryRun = false, batchSize = 1000) {
  await client.connect();
  
  try {
    console.log('🔧 Fixing has_links and link_count flags...');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalWithLinks = 0;
    
    while (true) {
      // Get batch of analyses
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
      
      console.log(`\n📦 Processing batch ${Math.floor(offset/batchSize) + 1} (${result.rows.length} analyses)...`);
      
      const updates = [];
      
      for (const row of result.rows) {
        totalProcessed++;
        const claudeText = row.claude_response_text;
        
        // Count movie links using the pattern we found
        const movieLinkMatches = claudeText.match(/<a[^>]*href=[^>]*\/movie\/\d+[^>]*>/g) || [];
        const linkCount = movieLinkMatches.length;
        const hasLinks = linkCount > 0;
        
        if (hasLinks) totalWithLinks++;
        
        // Check if update is needed
        const needsUpdate = (row.has_links !== hasLinks) || (row.link_count !== linkCount);
        
        if (needsUpdate) {
          updates.push({
            id: row.id,
            hasLinks,
            linkCount
          });
        }
        
        if (totalProcessed % 250 === 0) {
          console.log(`  Processed ${totalProcessed}... (${totalWithLinks} with links found so far)`);
        }
      }
      
      // Apply updates for this batch
      if (updates.length > 0) {
        console.log(`  📝 Updating ${updates.length} records in this batch...`);
        
        if (!dryRun) {
          await client.query('BEGIN');
          
          try {
            for (const update of updates) {
              await client.query(
                'UPDATE movie_analyses SET has_links = $1, link_count = $2 WHERE id = $3',
                [update.hasLinks, update.linkCount, update.id]
              );
            }
            
            await client.query('COMMIT');
            console.log(`  ✅ Successfully updated ${updates.length} records`);
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        } else {
          console.log(`  🔍 DRY RUN: Would update ${updates.length} records`);
          // Show a few examples
          updates.slice(0, 3).forEach(update => {
            console.log(`    - ID ${update.id}: has_links=${update.hasLinks}, link_count=${update.linkCount}`);
          });
        }
        
        totalUpdated += updates.length;
      }
      
      offset += batchSize;
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`  • Total analyses processed: ${totalProcessed}`);
    console.log(`  • Analyses with movie links: ${totalWithLinks}`);
    console.log(`  • Coverage: ${((totalWithLinks/totalProcessed)*100).toFixed(1)}%`);
    console.log(`  • Records ${dryRun ? 'that would be' : ''} updated: ${totalUpdated}`);
    
    if (!dryRun) {
      // Verify the update worked
      const verifyQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN has_links = true THEN 1 END) as with_links,
          SUM(link_count) as total_links
        FROM movie_analyses
      `;
      
      const verifyResult = await client.query(verifyQuery);
      const verify = verifyResult.rows[0];
      
      console.log(`\n✅ Verification:`);
      console.log(`  • Total analyses: ${verify.total}`);
      console.log(`  • Flagged as has_links: ${verify.with_links}`);
      console.log(`  • Total movie links: ${verify.total_links}`);
      console.log(`  • Updated coverage: ${((verify.with_links/verify.total)*100).toFixed(1)}%`);
    }
    
  } finally {
    await client.end();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = args.includes('--dry-run');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 1000;
  
  if (args.includes('--help')) {
    console.log(`
Fix Movie Link Flags Usage:

  # Dry run (show what would be changed):
  node fix-link-flags.js --dry-run

  # Live update (modify database):
  node fix-link-flags.js

  # Custom batch size:
  node fix-link-flags.js --batch-size=500

This script will:
• Scan all movie analyses for HTML movie links
• Update has_links and link_count fields with correct values
• Process in batches to avoid memory issues
• Show progress and final statistics
    `);
    process.exit(0);
  }
  
  try {
    await fixLinkFlags(dryRun, batchSize);
  } catch (error) {
    console.error('\\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();