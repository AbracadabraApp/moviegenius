/**
 * Post-Process Link Fixes - One-Time Cleanup
 *
 * Fixes existing processed analyses that have:
 * 1. Self-referential links (movies linking to themselves)
 * 2. Multiple mentions of same movies (should only link first mention)
 * 
 * Run with: node scripts/post-process-link-fixes.js [--dry-run]
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
  
  return new Client({ connectionString: dbUrl });
}

/**
 * Post-process content to fix link violations
 */
function postProcessLinkFixes(content, currentMovieTmdbId) {
  if (!content || typeof content !== 'string') {
    return { content, changes: [] };
  }

  let processedContent = content;
  const changes = [];

  // Step 1: Remove self-referential links
  const selfRefRegex = new RegExp(`<a href="/movie/${currentMovieTmdbId}"[^>]*>([^<]+)</a>`, 'g');
  let selfRefMatches = 0;
  processedContent = processedContent.replace(selfRefRegex, (match, text) => {
    selfRefMatches++;
    changes.push(`Removed self-reference: ${match} → ${text}`);
    return text; // Keep text, remove link
  });

  // Step 2: First-mention-only deduplication
  const seenMovies = new Set();
  let duplicateLinks = 0;
  
  processedContent = processedContent.replace(/<a href="\/movie\/(\d+)"[^>]*>([^<]+)<\/a>/g, (match, tmdbId, text) => {
    if (seenMovies.has(tmdbId)) {
      duplicateLinks++;
      changes.push(`Removed duplicate link: ${match} → ${text}`);
      return text; // Already seen, return plain text
    } else {
      seenMovies.add(tmdbId);
      return match; // First mention, keep the link
    }
  });

  // Count final links
  const finalLinkCount = (processedContent.match(/<a href="\/movie\/\d+"[^>]*>/g) || []).length;

  return {
    content: processedContent,
    changes,
    stats: {
      selfReferencesRemoved: selfRefMatches,
      duplicateLinksRemoved: duplicateLinks,
      finalLinkCount
    }
  };
}

/**
 * Process a single analysis for post-processing fixes
 */
async function postProcessAnalysis(client, analysis, dryRun = false) {
  const movieResult = await client.query('SELECT title, year, tmdb_id FROM movies WHERE id = $1', [analysis.movie_id]);
  const movie = movieResult.rows[0];
  const movieTitle = movie ? `${movie.title} (${movie.year})` : `Movie ID ${analysis.movie_id}`;

  console.log(`\n📄 Post-processing: ${movieTitle}`);

  const claudeResponse = analysis.claude_response;
  const currentContent = claudeResponse.processed_content;

  if (!currentContent || typeof currentContent !== 'string') {
    console.log(`   ⚠️ No processable content - skipping`);
    return { skipped: true, reason: 'no_content' };
  }

  // Apply post-processing fixes
  const result = postProcessLinkFixes(currentContent, movie.tmdb_id);

  const totalChanges = result.stats.selfReferencesRemoved + result.stats.duplicateLinksRemoved;

  if (totalChanges === 0) {
    console.log(`   ✅ No issues found - content is clean`);
    return { skipped: true, reason: 'no_changes_needed' };
  }

  console.log(`   🔧 Fixed ${result.stats.selfReferencesRemoved} self-references, ${result.stats.duplicateLinksRemoved} duplicates`);
  console.log(`   📊 Final link count: ${result.stats.finalLinkCount}`);

  if (result.changes.length > 0 && result.changes.length <= 5) {
    console.log(`   Changes made:`);
    result.changes.forEach(change => {
      console.log(`     - ${change}`);
    });
  } else if (result.changes.length > 5) {
    console.log(`   Changes made: ${result.changes.length} total (showing first 3):`);
    result.changes.slice(0, 3).forEach(change => {
      console.log(`     - ${change}`);
    });
  }

  if (!dryRun) {
    // Update database with fixed content
    const updatedClaudeResponse = {
      ...claudeResponse,
      processed_content: result.content
    };

    const updateQuery = `
      UPDATE movie_analyses 
      SET 
        claude_response = $1,
        link_count = $2
      WHERE id = $3
    `;

    await client.query(updateQuery, [
      JSON.stringify(updatedClaudeResponse),
      result.stats.finalLinkCount,
      analysis.id
    ]);

    console.log(`   ✅ Updated database - link_count: ${result.stats.finalLinkCount}`);
  } else {
    console.log(`   🔍 DRY RUN - would update link_count to ${result.stats.finalLinkCount}`);
  }

  return { 
    processed: true, 
    stats: result.stats,
    changeCount: totalChanges
  };
}

/**
 * Get analyses that need post-processing (ones with has_links=true that might have violations)
 */
async function getAnalysesNeedingPostProcessing(client) {
  console.log(`📋 Finding analyses needing post-processing...`);
  
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
      ma.has_links = true
      AND ma.link_count > 0
      AND (ma.claude_response->>'processed_content') IS NOT NULL
      AND LENGTH(ma.claude_response->>'processed_content') > 1000
    ORDER BY ma.link_count DESC
  `;

  const result = await client.query(query);
  console.log(`📊 Found ${result.rows.length} analyses with links to check`);
  
  return result.rows;
}

/**
 * Main post-processing function
 */
async function runPostProcessing(dryRun = false) {
  console.log('🔧 Post-Process Link Fixes - One-Time Cleanup');
  console.log('==============================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}\n`);

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');

    // Get analyses that need post-processing
    const analyses = await getAnalysesNeedingPostProcessing(client);
    
    if (analyses.length === 0) {
      console.log('✅ No analyses need post-processing');
      return;
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalChanges = 0;
    let totalSelfRefsFixed = 0;
    let totalDuplicatesFixed = 0;

    console.log(`🔄 Post-processing ${analyses.length} analyses...\n`);

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      
      try {
        console.log(`[${i + 1}/${analyses.length}]`);
        const result = await postProcessAnalysis(client, analysis, dryRun);
        
        if (result.skipped) {
          totalSkipped++;
        } else if (result.processed) {
          totalProcessed++;
          totalChanges += result.changeCount;
          totalSelfRefsFixed += result.stats.selfReferencesRemoved;
          totalDuplicatesFixed += result.stats.duplicateLinksRemoved;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`   ❌ Error post-processing analysis: ${error.message}`);
      }
    }

    // Final summary
    console.log(`\n📊 Post-Processing Complete:`);
    console.log(`  • Analyses processed: ${totalProcessed}`);
    console.log(`  • Analyses skipped: ${totalSkipped}`);
    console.log(`  • Total fixes applied: ${totalChanges}`);
    console.log(`  • Self-references removed: ${totalSelfRefsFixed}`);
    console.log(`  • Duplicate links removed: ${totalDuplicatesFixed}`);
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);

    if (totalChanges > 0) {
      console.log(`\n✅ Link quality rules now enforced on processed analyses!`);
    }

    return {
      totalProcessed,
      totalSkipped, 
      totalChanges,
      totalSelfRefsFixed,
      totalDuplicatesFixed
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

  // Show help
  if (args.includes('--help')) {
    console.log(`
Post-Process Link Fixes Usage:

  # Dry run (show what would be fixed):
  node scripts/post-process-link-fixes.js --dry-run

  # Apply fixes (LIVE - modifies database):
  node scripts/post-process-link-fixes.js

Fixes Applied:
  • Removes self-referential links (movies linking to themselves)
  • Ensures first-mention-only linking (removes duplicate movie links)
  • Updates link_count metadata to match actual clean link count
  • Preserves all good links and proper formatting

Environment Variables Required:
  • DATABASE_URL or RAILWAY_DATABASE_URL
`);
    process.exit(0);
  }

  try {
    await runPostProcessing(dryRun);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();