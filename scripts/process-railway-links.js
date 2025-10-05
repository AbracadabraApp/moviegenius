#!/usr/bin/env node

/**
 * Railway Link Processor - Unified Movie & Contributor Linking
 *
 * Processes Railway movie_analyses to add both movie and contributor links.
 * Uses the same linking logic as new analyses for consistency.
 * 
 * Usage:
 *   node scripts/process-railway-links.js [--dry-run] [--limit=100] [--movies-only] [--contributors-only]
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAnalysisContent } from '../lib/movie-analysis-linker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Railway PostgreSQL connection pool
function getRailwayPool() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Pool({
    connectionString: dbUrl,
    max: 12, // Conservative max connections for concurrency=10
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}

/**
 * Extract contributors from Railway keyElements format
 * Railway analyses have keyElements in raw_content with director, writers, stars, etc.
 */
function extractContributorsFromRailwayData(claudeResponse) {
  if (!claudeResponse || !claudeResponse.raw_content) return [];
  
  const contributors = [];
  
  try {
    const rawContent = typeof claudeResponse.raw_content === 'string' 
      ? JSON.parse(claudeResponse.raw_content) 
      : claudeResponse.raw_content;
    
    const keyElements = rawContent.keyElements;
    if (!keyElements) return [];
    
    // Extract contributors from keyElements structure
    ['director', 'writers', 'stars', 'cinematographer', 'composer'].forEach(role => {
      if (keyElements[role]) {
        const names = Array.isArray(keyElements[role]) ? keyElements[role] : [keyElements[role]];
        names.forEach(name => {
          if (name && name.trim()) {
            contributors.push({ name: name.trim(), role });
          }
        });
      }
    });
    
  } catch (error) {
    console.warn('Error extracting contributors:', error.message);
  }
  
  return contributors;
}

/**
 * Create KEY_CONTRIBUTORS format string from Railway data for compatibility
 */
function createKeyContributorsString(contributors) {
  const roleGroups = {};
  
  contributors.forEach(c => {
    const role = c.role.charAt(0).toUpperCase() + c.role.slice(1);
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(c.name);
  });
  
  const parts = Object.entries(roleGroups).map(([role, names]) => 
    `${role}: ${names.join(', ')}`
  );
  
  return `KEY_CONTRIBUTORS: ${parts.join(', ')}`;
}

/**
 * Extract analysis text content from Railway claude_response
 */
function extractAnalysisText(claudeResponse) {
  if (!claudeResponse) return '';

  // Use raw_content to preserve ** markers for movie linking
  if (claudeResponse.raw_content) {
    try {
      const rawContent = typeof claudeResponse.raw_content === 'string'
        ? JSON.parse(claudeResponse.raw_content)
        : claudeResponse.raw_content;

      // Handle new JSON format with content array
      if (rawContent.content && Array.isArray(rawContent.content)) {
        return rawContent.content
          .map(section => {
            // Preserve contextual subheads
            if (section.subhead && section.text) {
              return `**${section.subhead}**\n\n${section.text}`;
            }
            return section.text || '';
          })
          .filter(text => text.trim().length > 0)
          .join('\n\n');
      }

      // Handle legacy formats
      return rawContent.content || rawContent.analysis || rawContent.text || '';
    } catch (error) {
      return typeof claudeResponse.raw_content === 'string'
        ? claudeResponse.raw_content
        : '';
    }
  }

  // Fall back to processed_content only if raw_content doesn't exist
  if (claudeResponse.processed_content) {
    return typeof claudeResponse.processed_content === 'string'
      ? claudeResponse.processed_content
      : JSON.stringify(claudeResponse.processed_content);
  }

  return '';
}

/**
 * Add contributor links using person IDs from database
 */
async function addContributorLinksWithPersonIds(content, contributors, client) {
  if (!content || !contributors || contributors.length === 0) {
    return content;
  }
  
  let processedContent = content;
  
  for (const contributor of contributors) {
    try {
      // Look up person ID in database
      const personResult = await client.query(`
        SELECT id FROM persons 
        WHERE name = $1 
        LIMIT 1
      `, [contributor.name]);
      
      if (personResult.rows.length === 0) {
        console.log(`   ⚠️ Person not found: ${contributor.name}`);
        continue;
      }
      
      const personId = personResult.rows[0].id;
      
      // Find first mention of contributor name in content
      const nameRegex = new RegExp(`\\b${contributor.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = processedContent.match(nameRegex);
      
      if (match) {
        const matchStart = processedContent.indexOf(match[0]);
        const matchEnd = matchStart + match[0].length;
        
        // Create person link with numeric ID
        const link = `<a href="/person/${personId}" class="person-name">${match[0]}</a>`;
        
        // Replace first mention only
        const beforeMatch = processedContent.substring(0, matchStart);
        const afterMatch = processedContent.substring(matchEnd);
        processedContent = beforeMatch + link + afterMatch;
        
        console.log(`🔗 Linked contributor "${contributor.name}" → /person/${personId}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error linking ${contributor.name}: ${error.message}`);
    }
  }
  
  return processedContent;
}

/**
 * Process a single Railway analysis record
 */
async function processRailwayAnalysis(client, analysis, options = {}) {
  const { dryRun = false, processMovies = true, processContributors = true } = options;
  
  // Get movie details
  const movieResult = await client.query('SELECT title, year, tmdb_id FROM movies WHERE id = $1', [analysis.movie_id]);
  const movie = movieResult.rows[0];
  
  if (!movie) {
    console.log(`⚠️ Movie not found for analysis ${analysis.id}`);
    return { skipped: true, reason: 'movie_not_found' };
  }
  
  const movieTitle = `${movie.title} (${movie.year})`;
  console.log(`\n📄 Processing: ${movieTitle}`);
  
  // Skip if already processed (unless forcing)
  if (analysis.has_links && analysis.link_count > 0 && !dryRun && !options.force) {
    console.log(`   ⏭️ Already processed (${analysis.link_count} links) - skipping`);
    return { skipped: true, reason: 'already_processed' };
  }
  
  if (options.force) {
    console.log(`   🔄 Force reprocessing (${analysis.link_count || 0} existing links)`);
  }
  
  const claudeResponse = analysis.claude_response;
  
  // Extract analysis text
  const analysisText = extractAnalysisText(claudeResponse);
  if (!analysisText) {
    console.log(`   ⚠️ No analysis text found`);
    return { skipped: true, reason: 'no_content' };
  }
  
  // Extract contributors from Railway keyElements format
  const contributors = extractContributorsFromRailwayData(claudeResponse);
  
  console.log(`   👥 Found ${contributors.length} contributors: ${contributors.map(c => c.name).join(', ')}`);
  
  // Check for data quality - skip if too many "Unknown" values
  const unknownCount = contributors.filter(c => c.name.toLowerCase() === 'unknown').length;
  if (unknownCount > 0 && unknownCount === contributors.length) {
    console.log(`   ⚠️ Skipping - all contributors are "Unknown" (poor data quality)`);
    return { skipped: true, reason: 'poor_data_quality' };
  }
  
  if (unknownCount > contributors.length / 2) {
    console.log(`   ⚠️ Warning - ${unknownCount}/${contributors.length} contributors are "Unknown"`);
  }
  
  // Create KEY_CONTRIBUTORS format for universal linker compatibility
  const keyContributorsString = createKeyContributorsString(contributors);
  
  // Process content using universal linker in single pass
  console.log('   🔗 Processing links with universal linker');
  let processedText = await processAnalysisContent(
    analysisText,
    movieTitle,
    'Railway batch processing',
    keyContributorsString,
    {
      processMovies,
      processContributors,
      dbClient: client
    }
  );
  
  // Ensure processedText is a string
  if (typeof processedText !== 'string') {
    console.log(`   ⚠️ Warning: processedText is not a string, got ${typeof processedText}`);
    processedText = String(processedText);
  }
  
  // Count links in processed content
  const movieLinks = (processedText.match(/<a[^>]*href="\/movie\/\d+"[^>]*>/g) || []).length;
  const contributorLinks = (processedText.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
  const totalLinks = movieLinks + contributorLinks;
  
  console.log(`   🔗 Added ${movieLinks} movie links, ${contributorLinks} contributor links`);
  
  if (!dryRun) {
    // Update claude_response with processed content
    const updatedClaudeResponse = {
      ...claudeResponse,
      processed_content: processedText
    };
    
    await client.query(`
      UPDATE movie_analyses 
      SET 
        claude_response = $1,
        has_links = $2,
        link_count = $3,
        linked_at = NOW()
      WHERE id = $4
    `, [
      JSON.stringify(updatedClaudeResponse),
      totalLinks > 0,
      totalLinks,
      analysis.id
    ]);
    
    console.log(`   ✅ Updated database - total links: ${totalLinks}`);
  } else {
    console.log(`   🔍 DRY RUN - would add ${totalLinks} total links`);
  }
  
  return {
    processed: true,
    movieLinks,
    contributorLinks,
    totalLinks
  };
}

/**
 * Get analyses that need link processing
 * Prioritizes analyses with good contributor data (non-"Unknown" values)
 */
async function getAnalysesToProcess(client, limit = 100, options = {}) {
  const { force = false } = options;
  
  let whereClause = 'ma.claude_response IS NOT NULL';
  if (!force) {
    whereClause += ' AND (ma.has_links = false OR ma.has_links IS NULL OR ma.link_count = 0 OR ma.link_count IS NULL)';
  }
  
  const query = `
    SELECT 
      ma.id,
      ma.movie_id,
      ma.claude_response,
      ma.has_links,
      ma.link_count,
      m.title,
      m.year,
      m.tmdb_id,
      -- Score analyses by data quality (lower score = higher priority)
      CASE 
        WHEN ma.claude_response->>'raw_content' IS NULL THEN 100
        WHEN ma.claude_response->>'raw_content' ILIKE '%"unknown"%' THEN 50
        ELSE 1
      END as data_quality_score
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ${whereClause}
    ORDER BY data_quality_score ASC, ma.created_at DESC
    LIMIT $1
  `;
  
  const result = await client.query(query, [limit]);
  return result.rows;
}

/**
 * Main processing function
 */
async function processRailwayLinks(options = {}) {
  const {
    limit = 100,
    dryRun = false,
    processMovies = true,
    processContributors = true,
    force = false
  } = options;

  console.log('🚂 Railway Link Processor - Unified Movie & Contributor Linking');
  console.log('================================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Limit: ${limit} analyses`);
  console.log(`Movies: ${processMovies ? 'Enabled' : 'Disabled'}, Contributors: ${processContributors ? 'Enabled' : 'Disabled'}`);
  console.log(`Force reprocess: ${force ? 'Yes' : 'No'}\n`);

  const pool = getRailwayPool();

  try {
    console.log('✅ Connected to Railway PostgreSQL pool\n');

    // Get total count instead of loading all records
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response IS NOT NULL
        ${!force ? 'AND (ma.has_links = false OR ma.has_links IS NULL OR ma.link_count = 0 OR ma.link_count IS NULL)' : ''}
    `);
    const total = Math.min(parseInt(countResult.rows[0].total), limit);

    console.log(`📋 Found ${total.toLocaleString()} analyses to process\n`);

    if (total === 0) {
      console.log('✅ No analyses need processing');
      return { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 };
    }

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalMovieLinks = 0;
    let totalContributorLinks = 0;

    const BATCH_SIZE = 50; // Process 50 at a time like Why Watch
    const totalBatches = Math.ceil(total / BATCH_SIZE);
    const startTime = Date.now();

    // Sequential batch processing with LIMIT/OFFSET
    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1;

      // Fetch batch from database
      const batchResult = await pool.query(`
        SELECT
          ma.id,
          ma.movie_id,
          ma.claude_response,
          ma.has_links,
          ma.link_count,
          m.title,
          m.year,
          m.tmdb_id,
          CASE
            WHEN ma.claude_response->>'raw_content' IS NULL THEN 100
            WHEN ma.claude_response->>'raw_content' ILIKE '%"unknown"%' THEN 50
            ELSE 1
          END as data_quality_score
        FROM movie_analyses ma
        JOIN movies m ON ma.movie_id = m.id
        WHERE ma.claude_response IS NOT NULL
          ${!force ? 'AND (ma.has_links = false OR ma.has_links IS NULL OR ma.link_count = 0 OR ma.link_count IS NULL)' : ''}
        ORDER BY data_quality_score ASC, ma.created_at DESC
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      // Process all records in batch in parallel
      const promises = batchResult.rows.map(async (analysis, index) => {
        const globalIndex = offset + index + 1;
        console.log(`[${globalIndex}/${total}]`);

        try {
          const result = await processRailwayAnalysis(pool, analysis, {
            dryRun,
            processMovies,
            processContributors,
            force
          });

          return result;
        } catch (error) {
          console.error(`   ❌ Error processing analysis: ${error.message}`);
          return { error: true };
        }
      });

      const results = await Promise.all(promises);

      // Update counters
      for (const result of results) {
        if (result.error) {
          totalErrors++;
        } else if (result.skipped) {
          totalSkipped++;
        } else if (result.processed) {
          totalProcessed++;
          totalMovieLinks += result.movieLinks;
          totalContributorLinks += result.contributorLinks;
        }
      }

      const processed = offset + batchResult.rows.length;

      // Progress update every 10 batches
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = processed / elapsed;
        const remaining = total - processed;
        const eta = Math.round(remaining / rate);
        const pct = ((processed / total) * 100).toFixed(1);

        console.log(`\n[Batch ${batchNum}/${totalBatches}] ${pct}% complete`);
        console.log(`  Processed: ${processed.toLocaleString()}/${total.toLocaleString()}`);
        console.log(`  Links: ${totalMovieLinks.toLocaleString()} movies, ${totalContributorLinks.toLocaleString()} contributors`);
        console.log(`  Rate: ${rate.toFixed(1)} analyses/sec | ETA: ${Math.floor(eta/60)}m ${eta%60}s\n`);
      }
      
      // No delay needed with connection pool management
    }
    
    // Final summary
    console.log(`\n📊 Processing Complete:`);
    console.log(`  • Processed: ${totalProcessed}`);
    console.log(`  • Skipped: ${totalSkipped}`);
    console.log(`  • Errors: ${totalErrors}`);
    console.log(`  • Movie links added: ${totalMovieLinks}`);
    console.log(`  • Contributor links added: ${totalContributorLinks}`);
    console.log(`  • Total links: ${totalMovieLinks + totalContributorLinks}`);
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);
    
    return {
      totalProcessed,
      totalSkipped,
      totalErrors,
      totalMovieLinks,
      totalContributorLinks
    };
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('\n🔒 Database connection pool closed');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Railway Link Processor Usage:

  # Dry run on 20 analyses:
  node scripts/process-railway-links.js --dry-run --limit=20

  # Process 100 analyses with both movie and contributor links:
  node scripts/process-railway-links.js --limit=100

  # Process only movie links:
  node scripts/process-railway-links.js --movies-only --limit=50

  # Process only contributor links:
  node scripts/process-railway-links.js --contributors-only --limit=50

  # Force reprocess already-linked analyses:
  node scripts/process-railway-links.js --force --limit=10

Flags:
  --dry-run         Show what would be changed without modifying database
  --limit=N         Process up to N analyses (default: 100)
  --movies-only     Only process movie links
  --contributors-only  Only process contributor links  
  --force           Reprocess analyses that already have links

Environment Variables:
  DATABASE_URL or RAILWAY_DATABASE_URL
`);
    process.exit(0);
  }
  
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    processMovies: !args.includes('--contributors-only'),
    processContributors: !args.includes('--movies-only'),
    limit: 100
  };
  
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    options.limit = parseInt(limitArg.split('=')[1], 10) || 100;
  }
  
  try {
    await processRailwayLinks(options);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processRailwayLinks };