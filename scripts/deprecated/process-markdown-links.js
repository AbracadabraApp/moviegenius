/**
 * Process Markdown Movie Links - Railway Version
 *
 * Converts **Movie Title** patterns to HTML <a> links using Railway PostgreSQL.
 * Run with: node process-markdown-links.js [--dry-run] [--test-count=50]
 *
 * This script:
 * 1. Finds **Movie Title** (Year) and **Movie Title** patterns in raw_content
 * 2. Looks up movies in Railway PostgreSQL database
 * 3. Creates HTML <a href="/movie/TMDB_ID"> links  
 * 4. Updates processed_content, has_links, and link_count
 * 5. Prevents self-referential links
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

/**
 * Extract movie mentions from content
 * Handles **Movie Title** (Year) and **Movie Title** patterns
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];

  const mentions = [];

  // Pattern 1: **Movie Title** (Year) - Bold with year
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;

  while ((match = boldWithYearPattern.exec(content)) !== null) {
    let title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Clean up title
    title = title.replace(/\s*\(\d{4}\)$/, '').trim();
    
    mentions.push({
      originalText: match[0],
      title,
      year,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  // Pattern 2: **Movie Title** - Bold without year
  const boldPattern = /\*\*([^*]+)\*\*/g;

  while ((match = boldPattern.exec(content)) !== null) {
    let title = match[1].trim();
    
    // Skip if already captured with year
    const alreadyCaptured = mentions.some(mention => 
      Math.abs(mention.startIndex - match.index) < 10
    );
    
    if (!alreadyCaptured && title.length > 2) {
      mentions.push({
        originalText: match[0],
        title,
        year: null,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  return mentions.sort((a, b) => b.startIndex - a.startIndex); // Process from end to start
}

/**
 * Look up movie in database
 */
async function lookupMovie(client, title, year = null) {
  let query = 'SELECT id, tmdb_id, title, year FROM movies WHERE title ILIKE $1';
  let params = [title];
  
  if (year) {
    query += ' AND year = $2';
    params.push(year);
  }
  
  query += ' LIMIT 1';
  
  const result = await client.query(query, params);
  return result.rows[0] || null;
}

/**
 * Process movie mentions in content and create HTML links
 */
async function processMovieMentions(client, content, currentMovieTmdbId) {
  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) {
    return { content, linkCount: 0 };
  }

  let processedContent = content;
  let linkCount = 0;
  const seenMovies = new Set();

  console.log(`   🔍 Found ${mentions.length} movie mentions`);

  for (const mention of mentions) {
    try {
      // Look up movie in database
      const movie = await lookupMovie(client, mention.title, mention.year);
      
      if (!movie) {
        // Strip markdown but don't create link
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Skip self-references
      if (movie.tmdb_id === currentMovieTmdbId) {
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Skip if already linked this movie
      if (seenMovies.has(movie.tmdb_id)) {
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Skip if movie has no TMDB ID
      if (!movie.tmdb_id) {
        processedContent = processedContent.substring(0, mention.startIndex) +
          mention.title + (mention.year ? ` (${mention.year})` : '') +
          processedContent.substring(mention.endIndex);
        continue;
      }

      // Create HTML link
      const linkText = mention.title + (mention.year ? ` (${mention.year})` : '');
      const htmlLink = `<a href="/movie/${movie.tmdb_id}" class="movie-title" data-tmdb-id="${movie.tmdb_id}">${mention.title}</a>` + 
        (mention.year ? ` (${mention.year})` : '');

      processedContent = processedContent.substring(0, mention.startIndex) +
        htmlLink +
        processedContent.substring(mention.endIndex);

      seenMovies.add(movie.tmdb_id);
      linkCount++;

      console.log(`   ✅ Linked: ${mention.title} → /movie/${movie.tmdb_id}`);

    } catch (error) {
      console.error(`   ❌ Error processing ${mention.title}: ${error.message}`);
      
      // Strip markdown as fallback
      processedContent = processedContent.substring(0, mention.startIndex) +
        mention.title + (mention.year ? ` (${mention.year})` : '') +
        processedContent.substring(mention.endIndex);
    }
  }

  return { content: processedContent, linkCount };
}

/**
 * Process a single analysis record
 */
async function processAnalysisRecord(client, analysis, dryRun = false) {
  const movieResult = await client.query('SELECT title, year, tmdb_id FROM movies WHERE id = $1', [analysis.movie_id]);
  const movie = movieResult.rows[0];
  const movieTitle = movie ? `${movie.title} (${movie.year})` : `Movie ID ${analysis.movie_id}`;

  console.log(`\n📄 Processing: ${movieTitle}`);

  const claudeResponse = analysis.claude_response;
  
  // Get content from raw_content
  let rawContent = null;
  if (claudeResponse && claudeResponse.raw_content) {
    if (typeof claudeResponse.raw_content === 'string') {
      try {
        const parsed = JSON.parse(claudeResponse.raw_content);
        if (parsed.content && Array.isArray(parsed.content)) {
          // Extract text from content sections
          rawContent = parsed.content
            .map(section => section.text || '')
            .filter(text => text.trim().length > 0)
            .join('\n\n');
        }
      } catch (e) {
        rawContent = claudeResponse.raw_content;
      }
    } else if (typeof claudeResponse.raw_content === 'object') {
      if (claudeResponse.raw_content.content && Array.isArray(claudeResponse.raw_content.content)) {
        rawContent = claudeResponse.raw_content.content
          .map(section => section.text || '')
          .filter(text => text.trim().length > 0)
          .join('\n\n');
      }
    }
  }

  if (!rawContent) {
    console.log(`   ⚠️ No raw content found - skipping`);
    return { skipped: true, reason: 'no_content' };
  }

  // Check if it has markdown patterns
  if (!rawContent.includes('**')) {
    console.log(`   ⚠️ No markdown patterns found - skipping`);
    return { skipped: true, reason: 'no_markdown' };
  }

  // Process movie mentions
  const result = await processMovieMentions(client, rawContent, movie.tmdb_id);

  console.log(`   📊 Processed content: ${result.content.length} chars, ${result.linkCount} movie links`);

  if (result.linkCount > 0) {
    // Show sample links
    const sampleLinks = result.content.match(/<a[^>]*href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g);
    if (sampleLinks) {
      console.log(`   🔗 Sample links: ${sampleLinks.slice(0, 2).join(', ')}`);
    }
  }

  if (!dryRun) {
    // Update database with processed content
    const updatedClaudeResponse = {
      ...claudeResponse,
      processed_content: result.content
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
      result.linkCount > 0,
      result.linkCount,
      analysis.id
    ]);

    console.log(`   ✅ Updated database - has_links: ${result.linkCount > 0}, link_count: ${result.linkCount}`);
  } else {
    console.log(`   🔍 DRY RUN - would set has_links: ${result.linkCount > 0}, link_count: ${result.linkCount}`);
  }

  return { 
    processed: true, 
    hasLinks: result.linkCount > 0,
    linkCount: result.linkCount,
    contentLength: result.content.length 
  };
}

/**
 * Get analyses with markdown patterns that need processing
 */
async function getAnalysesToProcess(client, limit = 100) {
  console.log(`📋 Finding analyses with **Movie** patterns to process (limit: ${limit})...`);
  
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
      AND ma.has_links = false
      AND (ma.claude_response->>'raw_content') LIKE '%**%**%'
    ORDER BY ma.created_at DESC
    LIMIT $1
  `;

  const result = await client.query(query, [limit]);
  console.log(`📊 Found ${result.rows.length} analyses with markdown patterns`);
  
  return result.rows;
}

/**
 * Main processing function
 */
async function processMarkdownLinks(testCount = 100, dryRun = false) {
  console.log('🎬 Process Markdown Movie Links - Railway Version');
  console.log('================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Processing: ${testCount} analyses with markdown patterns\n`);

  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');

    // Get analyses to process
    const analyses = await getAnalysesToProcess(client, testCount);
    
    if (analyses.length === 0) {
      console.log('✅ No analyses with markdown patterns need processing');
      return;
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalLinksCreated = 0;
    let totalWithNewLinks = 0;
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
          totalLinksCreated += result.linkCount;
          if (result.hasLinks) {
            totalWithNewLinks++;
          }
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 200));

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
    console.log(`  • Total movie links created: ${totalLinksCreated}`);
    console.log(`  • Analyses that got new links: ${totalWithNewLinks}`);
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);

    return {
      totalProcessed,
      totalSkipped, 
      totalLinksCreated,
      totalWithNewLinks,
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
Process Markdown Movie Links Usage:

  # Dry run on 50 analyses with markdown patterns:
  node process-markdown-links.js --dry-run --test-count=50

  # Process 100 analyses with markdown patterns (LIVE):
  node process-markdown-links.js --test-count=100

  # Process all analyses with markdown patterns:
  node process-markdown-links.js --test-count=1500

Features:
  • Finds **Movie Title** (Year) and **Movie Title** patterns
  • Looks up movies in Railway PostgreSQL database
  • Creates HTML <a href="/movie/ID" class="movie-title"> links
  • Updates processed_content, has_links, and link_count
  • Prevents self-referential links and duplicates
  • Strips ** marks for movies not found in database

Environment Variables Required:
  • DATABASE_URL or RAILWAY_DATABASE_URL
`);
    process.exit(0);
  }

  try {
    await processMarkdownLinks(testCount, dryRun);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

main();