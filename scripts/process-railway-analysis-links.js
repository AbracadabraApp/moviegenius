/**
 * Railway Analysis Link Processor - V2 JSON Extraction
 *
 * Extracts HTML movie links from JSON-structured processed_content and 
 * converts to clean HTML text format for Railway PostgreSQL database.
 * 
 * Run with: node scripts/process-railway-analysis-links.js [--dry-run] [--test-count=20]
 *
 * This script:
 * 1. Reads JSON-structured processed_content from Railway database
 * 2. Extracts text content containing HTML movie links  
 * 3. Converts to clean HTML text format
 * 4. Updates processed_content with clean HTML
 * 5. Sets has_links and link_count metadata properly
 * 6. No TMDB lookups needed - links already exist in JSON
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

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
  
  const movieLinkPattern = /<a href="\/movie\/\d+"[^>]*>/g;
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

  // Check if already processed correctly
  if (analysis.has_links && analysis.link_count > 0) {
    console.log(`   ⏭️ Already processed (${analysis.link_count} links) - skipping`);
    return { skipped: true, reason: 'already_processed' };
  }

  const claudeResponse = analysis.claude_response;
  
  // Extract HTML from JSON structure
  let extractedHTML = null;
  
  if (claudeResponse && claudeResponse.processed_content) {
    if (typeof claudeResponse.processed_content === 'string') {
      // Check if it's JSON string that needs parsing
      try {
        const parsedContent = JSON.parse(claudeResponse.processed_content);
        extractedHTML = extractHTMLFromJSON(parsedContent);
      } catch (e) {
        // Not JSON, use as-is
        extractedHTML = claudeResponse.processed_content;
      }
    } else if (typeof claudeResponse.processed_content === 'object') {
      // Already parsed JSON object
      extractedHTML = extractHTMLFromJSON(claudeResponse.processed_content);
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
    const sampleLinks = extractedHTML.match(/<a href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g);
    if (sampleLinks) {
      console.log(`   🔗 Sample links: ${sampleLinks.slice(0, 2).join(', ')}`);
    }
  }

  if (!dryRun) {
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
  } else {
    console.log(`   🔍 DRY RUN - would set has_links: ${hasLinks}, link_count: ${linkCount}`);
  }

  return { 
    processed: true, 
    hasLinks, 
    linkCount, 
    contentLength: extractedHTML.length 
  };
}

/**
 * Get analyses that need processing
 */
async function getAnalysesToProcess(client, limit = 20) {
  console.log(`📋 Finding analyses to process (limit: ${limit})...`);
  
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
      AND (ma.claude_response->>'processed_content') IS NOT NULL
    ORDER BY ma.created_at DESC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);
  console.log(`📊 Found ${result.rows.length} analyses with processed_content`);
  
  return result.rows;
}

/**
 * Main processing function
 */
async function processRailwayAnalysisLinks(testCount = 20, dryRun = false) {
  console.log('🚂 Railway Analysis Link Processor - V2 JSON Extraction');
  console.log('========================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Processing: ${testCount} analyses\n`);

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');

    // Get analyses to process
    const analyses = await getAnalysesToProcess(client, testCount);
    
    if (analyses.length === 0) {
      console.log('✅ No analyses need processing');
      return;
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalLinksFound = 0;
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
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);

    return {
      totalProcessed,
      totalSkipped, 
      totalLinksFound,
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
  const testCount = testCountArg ? parseInt(testCountArg.split('=')[1]) : 20;

  // Show help
  if (args.includes('--help')) {
    console.log(`
Railway Analysis Link Processor Usage:

  # Dry run on 10 analyses (show what would be changed):
  node scripts/process-railway-analysis-links.js --dry-run --test-count=10

  # Process 20 analyses (LIVE - modifies database):
  node scripts/process-railway-analysis-links.js --test-count=20

  # Process all analyses needing extraction:
  node scripts/process-railway-analysis-links.js --test-count=20000

Features:
  • Extracts HTML movie links from JSON structured content
  • Converts complex JSON to clean HTML text format  
  • Updates has_links and link_count metadata properly
  • No TMDB API calls needed - uses existing link data
  • Safe dry-run mode for testing before live processing

Environment Variables Required:
  • DATABASE_URL or RAILWAY_DATABASE_URL
`);
    process.exit(0);
  }

  try {
    await processRailwayAnalysisLinks(testCount, dryRun);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();