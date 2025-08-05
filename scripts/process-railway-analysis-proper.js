/**
 * Railway Analysis Processor - V3 Proper Linking Rules
 *
 * Processes remaining analyses with proper movie linking rules:
 * 1. Extracts HTML movie links from JSON-structured processed_content
 * 2. Applies proper linking rules (no self-references, first-mention-only)
 * 3. Converts to clean HTML text format for Railway PostgreSQL database
 * 4. Updates metadata correctly (has_links, link_count)
 * 
 * Run with: node scripts/process-railway-analysis-proper.js [--dry-run] [--test-count=100]
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
 * Extract clean HTML text from JSON-structured content with proper linking rules
 */
function extractHTMLWithProperRules(jsonContent, currentMovieTmdbId) {
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

    if (!extractedText.trim()) {
      return null;
    }

    // Apply proper linking rules
    return applyProperLinkingRules(extractedText, currentMovieTmdbId);

  } catch (error) {
    console.warn('⚠️ Error extracting text from JSON:', error.message);
    return null;
  }
}

/**
 * Apply proper movie linking rules to content
 */
function applyProperLinkingRules(content, currentMovieTmdbId) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let processedContent = content;

  // Step 1: Remove self-referential links (movies shouldn't link to themselves)
  const selfRefRegex = new RegExp(`<a href="/movie/${currentMovieTmdbId}"[^>]*>([^<]+)</a>`, 'g');
  processedContent = processedContent.replace(selfRefRegex, '$1');

  // Step 2: First-mention-only rule (remove duplicate movie links)
  const seenMovies = new Set();
  processedContent = processedContent.replace(/<a href="\/movie\/(\d+)"[^>]*>([^<]+)<\/a>/g, (match, tmdbId, text) => {
    if (seenMovies.has(tmdbId)) {
      return text; // Already seen, return plain text
    } else {
      seenMovies.add(tmdbId);
      return match; // First mention, keep the link
    }
  });

  // Step 3: Clean up any remaining ** patterns that weren't linked
  processedContent = processedContent.replace(/\*\*([^*]+)\*\*\s*\((\d{4})\)/g, '$1 ($2)');
  processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '$1');

  return processedContent;
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
 * Process a single analysis record with proper linking rules
 */
async function processAnalysisWithProperRules(client, analysis, dryRun = false) {
  const movieResult = await client.query('SELECT title, year, tmdb_id FROM movies WHERE id = $1', [analysis.movie_id]);
  const movie = movieResult.rows[0];
  const movieTitle = movie ? `${movie.title} (${movie.year})` : `Movie ID ${analysis.movie_id}`;

  console.log(`\n📄 Processing: ${movieTitle}`);

  // Check if already processed correctly
  if (analysis.has_links && analysis.link_count > 0) {
    console.log(`   ⏭️ Already processed (${analysis.link_count} links) - skipping`);
    return { skipped: true, reason: 'already_processed' };
  }

  const claudeResponse = analysis.claude_response;
  
  // Extract HTML from JSON structure with proper rules applied
  let processedHTML = null;
  
  if (claudeResponse && claudeResponse.processed_content) {
    if (typeof claudeResponse.processed_content === 'string') {
      // Check if it's JSON string that needs parsing
      try {
        const parsedContent = JSON.parse(claudeResponse.processed_content);
        processedHTML = extractHTMLWithProperRules(parsedContent, movie.tmdb_id);
      } catch (e) {
        // Not JSON, apply rules to existing content
        processedHTML = applyProperLinkingRules(claudeResponse.processed_content, movie.tmdb_id);
      }
    } else if (typeof claudeResponse.processed_content === 'object') {
      // Already parsed JSON object
      processedHTML = extractHTMLWithProperRules(claudeResponse.processed_content, movie.tmdb_id);
    }
  }

  // Fallback to raw_content if processed_content isn't available
  if (!processedHTML && claudeResponse && claudeResponse.raw_content) {
    console.log(`   🔄 No processed_content, using raw_content with ** pattern cleaning`);
    processedHTML = applyProperLinkingRules(claudeResponse.raw_content, movie.tmdb_id);
  }

  if (!processedHTML) {
    console.log(`   ⚠️ No processable content found - skipping`);
    return { skipped: true, reason: 'no_content' };
  }

  // Count movie links and check quality
  const linkCount = countMovieLinks(processedHTML);
  const hasLinks = linkCount > 0;

  console.log(`   📊 Extracted ${processedHTML.length} chars, ${linkCount} movie links`);

  if (linkCount > 0) {
    // Show sample links
    const sampleLinks = processedHTML.match(/<a href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g);
    if (sampleLinks) {
      console.log(`   🔗 Sample links: ${sampleLinks.slice(0, 2).join(', ')}`);
    }

    // Verify no self-references made it through
    const selfRefPattern = new RegExp(`href="/movie/${movie.tmdb_id}"`, 'g');
    const selfRefs = processedHTML.match(selfRefPattern);
    if (selfRefs) {
      console.log(`   ❌ WARNING: ${selfRefs.length} self-references still present`);
    } else {
      console.log(`   ✅ No self-references - rules applied correctly`);
    }
  }

  if (!dryRun) {
    // Update database with processed HTML and correct metadata
    const updatedClaudeResponse = {
      ...claudeResponse,
      processed_content: processedHTML
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
    contentLength: processedHTML.length,
    hadSelfRefs: false // Will be updated if we detect any
  };
}

/**
 * Get analyses that need processing (not yet processed with proper rules)
 */
async function getAnalysesNeedingProcessing(client, limit = 100) {
  console.log(`📋 Finding analyses needing processing (limit: ${limit})...`);
  
  const query = `
    SELECT 
      ma.id,
      ma.movie_id,
      ma.claude_response,
      ma.has_links,
      ma.link_count,
      m.title,
      m.year,
      m.tmdb_id
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE 
      ma.claude_response IS NOT NULL
      AND (
        (ma.claude_response->>'processed_content') IS NOT NULL
        OR (ma.claude_response->>'raw_content') IS NOT NULL
      )
      AND (ma.has_links = false OR ma.has_links IS NULL)
    ORDER BY ma.created_at DESC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);
  console.log(`📊 Found ${result.rows.length} analyses needing processing`);
  
  return result.rows;
}

/**
 * Main processing function with proper linking rules
 */
async function processRailwayAnalysesProper(testCount = 100, dryRun = false) {
  console.log('🚂 Railway Analysis Processor - V3 Proper Linking Rules');
  console.log('======================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Processing: ${testCount} analyses\n`);

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');

    // Get analyses to process
    const analyses = await getAnalysesNeedingProcessing(client, testCount);
    
    if (analyses.length === 0) {
      console.log('✅ No analyses need processing');
      return;
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalLinksFound = 0;
    let totalErrors = 0;

    console.log(`🔄 Processing ${analyses.length} analyses with proper linking rules...\n`);

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      
      try {
        console.log(`[${i + 1}/${analyses.length}]`);
        const result = await processAnalysisWithProperRules(client, analysis, dryRun);
        
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
    console.log(`  • Linking rules: ✅ Self-reference prevention ✅ First-mention-only`);

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
  const testCount = testCountArg ? parseInt(testCountArg.split('=')[1]) : 100;

  // Show help
  if (args.includes('--help')) {
    console.log(`
Railway Analysis Processor - V3 Proper Linking Rules Usage:

  # Dry run on 50 analyses (show what would be processed):
  node scripts/process-railway-analysis-proper.js --dry-run --test-count=50

  # Process 100 analyses (LIVE - modifies database):
  node scripts/process-railway-analysis-proper.js --test-count=100

  # Process all remaining analyses:
  node scripts/process-railway-analysis-proper.js --test-count=20000

Features:
  • Extracts HTML movie links from JSON structured content
  • Applies proper linking rules (no self-references, first-mention-only)
  • Converts complex JSON to clean HTML text format
  • Updates has_links and link_count metadata correctly
  • No TMDB API calls needed - uses existing link data
  • Future-proofed with battle-tested linking rules

Linking Rules Applied:
  ✅ Self-reference prevention (movies don't link to themselves)
  ✅ First-mention-only (duplicate movie links become plain text)
  ✅ ** pattern cleanup (unlinked bold patterns become regular text)

Environment Variables Required:
  • DATABASE_URL or RAILWAY_DATABASE_URL
`);
    process.exit(0);
  }

  try {
    await processRailwayAnalysesProper(testCount, dryRun);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();