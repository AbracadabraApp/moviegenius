/**
 * Process analyses WITHOUT links to find any missed movie links
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set for Railway processing');
  }
  
  console.log('🚂 Connecting to Railway PostgreSQL...');
  return new Client({ connectionString: dbUrl });
}

/**
 * Extract clean HTML text from JSON-structured content
 */
function extractHTMLFromJSON(jsonContent) {
  if (!jsonContent || typeof jsonContent !== 'object') {
    return null;
  }

  try {
    let extractedText = '';
    
    // Handle different JSON structures we might encounter
    if (jsonContent.content && Array.isArray(jsonContent.content)) {
      // Structure: { content: [{ text: "..." }, { text: "..." }] }
      extractedText = jsonContent.content
        .map(section => section.text || section.content || '')
        .filter(text => text.trim().length > 0)
        .join('\n\n');
    } else if (jsonContent.text) {
      // Structure: { text: "..." }
      extractedText = jsonContent.text;
    } else if (jsonContent.analysis) {
      // Structure: { analysis: "..." }
      extractedText = jsonContent.analysis;
    } else if (typeof jsonContent === 'string') {
      // Already a string
      extractedText = jsonContent;
    }

    return extractedText.trim() || null;
  } catch (error) {
    console.warn('⚠️ Error extracting text from JSON:', error.message);
    return null;
  }
}

/**
 * Count movie links in HTML content
 */
function countMovieLinks(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return 0;
  }
  
  const movieLinkPattern = /<a[^>]*href="\/movie\/\d+"[^>]*>/g;
  const matches = htmlContent.match(movieLinkPattern);
  return matches ? matches.length : 0;
}

/**
 * Process a single analysis record
 */
async function processAnalysisRecord(client, analysis, dryRun = false) {
  const movieResult = await client.query('SELECT title, year FROM movies WHERE id = $1', [analysis.movie_id]);
  const movie = movieResult.rows[0];
  const movieTitle = movie ? `${movie.title} (${movie.year})` : `Movie ID ${analysis.movie_id}`;

  console.log(`\n📄 Processing: ${movieTitle}`);

  const claudeResponse = analysis.claude_response;
  
  // Extract HTML from JSON structure - use raw_content for missing processed_content
  let extractedHTML = null;
  
  if (claudeResponse && claudeResponse.raw_content) {
    if (typeof claudeResponse.raw_content === 'string') {
      // Check if it's JSON string that needs parsing
      try {
        const parsedContent = JSON.parse(claudeResponse.raw_content);
        extractedHTML = extractHTMLFromJSON(parsedContent);
      } catch (e) {
        // Not JSON, use as-is
        extractedHTML = claudeResponse.raw_content;
      }
    } else if (typeof claudeResponse.raw_content === 'object') {
      // Already parsed JSON object
      extractedHTML = extractHTMLFromJSON(claudeResponse.raw_content);
    }
  }

  if (!extractedHTML) {
    console.log(`   ⚠️ No extractable content found - skipping`);
    return { skipped: true, reason: 'no_content' };
  }

  // Count movie links
  const linkCount = countMovieLinks(extractedHTML);
  const hasLinks = linkCount > 0;

  console.log(`   📊 Extracted ${extractedHTML.length} chars, ${linkCount} movie links`);

  if (linkCount > 0) {
    // Show sample links
    const sampleLinks = extractedHTML.match(/<a[^>]*href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g);
    if (sampleLinks) {
      console.log(`   🔗 Sample links: ${sampleLinks.slice(0, 2).join(', ')}`);
    }
  }

  if (!dryRun && hasLinks) {
    // Update database with clean HTML and correct metadata
    const updatedClaudeResponse = {
      ...claudeResponse,
      processed_content: extractedHTML
    };

    const updateQuery = `
      UPDATE movie_analyses 
      SET 
        claude_response = $1,
        has_links = $2,
        link_count = $3,
        linked_at = NOW()
      WHERE id = $4
    `;

    await client.query(updateQuery, [
      JSON.stringify(updatedClaudeResponse),
      hasLinks,
      linkCount,
      analysis.id
    ]);

    console.log(`   ✅ Updated database - has_links: ${hasLinks}, link_count: ${linkCount}`);
  } else if (!dryRun && !hasLinks) {
    console.log(`   ⚠️ No links found - keeping has_links=false`);
  } else {
    console.log(`   🔍 DRY RUN - would set has_links: ${hasLinks}, link_count: ${linkCount}`);
  }

  return { 
    processed: true, 
    hasLinks, 
    linkCount, 
    contentLength: extractedHTML.length,
    foundNewLinks: hasLinks 
  };
}

/**
 * Get analyses that need processing (currently flagged as has_links=false)
 */
async function getAnalysesToProcess(client, limit = 2000) {
  console.log(`📋 Finding analyses WITHOUT links to process (limit: ${limit})...`);
  
  const query = `
    SELECT 
      ma.id,
      ma.movie_id,
      ma.claude_response,
      ma.has_links,
      ma.link_count,
      m.title,
      m.year
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE 
      ma.claude_response IS NOT NULL
      AND (ma.has_links IS NULL OR ma.has_links = false)
      AND (ma.claude_response->>'raw_content') IS NOT NULL
    ORDER BY ma.created_at DESC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);
  console.log(`📊 Found ${result.rows.length} analyses without links to check`);
  
  return result.rows;
}

/**
 * Main processing function
 */
async function processAnalysesWithoutLinks(testCount = 2000, dryRun = false) {
  console.log('🚂 Railway Analysis Link Processor - Find Missing Links');
  console.log('=====================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Processing: ${testCount} analyses without links\n`);

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');

    // Get analyses to process
    const analyses = await getAnalysesToProcess(client, testCount);
    
    if (analyses.length === 0) {
      console.log('✅ No analyses without links need processing');
      return;
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalLinksFound = 0;
    let totalNewLinksFound = 0;
    let totalErrors = 0;

    console.log(`🔄 Processing ${analyses.length} analyses...\n`);

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      
      try {
        console.log(`[${i + 1}/${analyses.length}]`);
        const result = await processAnalysisRecord(client, analysis, dryRun);
        
        if (result.skipped) {
          totalSkipped++;
        } else if (result.processed) {
          totalProcessed++;
          totalLinksFound += result.linkCount;
          if (result.foundNewLinks) {
            totalNewLinksFound++;
          }
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Error processing analysis: ${error.message}`);
        totalErrors++;
      }
    }

    // Final summary
    console.log(`\n📊 Processing Complete:`);
    console.log(`  • Processed: ${totalProcessed}`);
    console.log(`  • Skipped: ${totalSkipped}`);
    console.log(`  • Errors: ${totalErrors}`);
    console.log(`  • Total movie links found: ${totalLinksFound}`);
    console.log(`  • Analyses that got new links: ${totalNewLinksFound}`);
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);

    return {
      totalProcessed,
      totalSkipped, 
      totalLinksFound,
      totalNewLinksFound,
      totalErrors
    };

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = args.includes('--dry-run');
  const testCountArg = args.find(arg => arg.startsWith('--test-count='));
  const testCount = testCountArg ? parseInt(testCountArg.split('=')[1]) : 2000;

  // Show help
  if (args.includes('--help')) {
    console.log(`
Process Analyses Without Links Usage:

  # Dry run on analyses without links:
  node process-no-links.js --dry-run --test-count=100

  # Process all analyses without links (LIVE):
  node process-no-links.js --test-count=2000

Features:
  • Targets analyses currently flagged as has_links=false
  • Extracts HTML movie links from raw_content JSON structures
  • Updates has_links and link_count metadata for newly found links
  • Safe dry-run mode for testing before live processing

Environment Variables Required:
  • DATABASE_URL or RAILWAY_DATABASE_URL
`);
    process.exit(0);
  }

  try {
    await processAnalysesWithoutLinks(testCount, dryRun);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();