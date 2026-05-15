#!/usr/bin/env node

/**
 * Simple Contributor Link Processor
 * Processes Railway movie_analyses to add contributor links with person IDs only.
 */

const { Client } = require('pg');

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

/**
 * Extract contributors from Railway keyElements format
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
 * Extract analysis text content from Railway claude_response
 */
function extractAnalysisText(claudeResponse) {
  if (!claudeResponse) return '';
  
  // Try processed_content first
  if (claudeResponse.processed_content) {
    return typeof claudeResponse.processed_content === 'string' 
      ? claudeResponse.processed_content 
      : JSON.stringify(claudeResponse.processed_content);
  }
  
  // Fall back to raw_content
  if (claudeResponse.raw_content) {
    try {
      const rawContent = typeof claudeResponse.raw_content === 'string' 
        ? JSON.parse(claudeResponse.raw_content) 
        : claudeResponse.raw_content;
      
      return rawContent.analysis || rawContent.text || '';
    } catch (error) {
      return typeof claudeResponse.raw_content === 'string' 
        ? claudeResponse.raw_content 
        : '';
    }
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
  const { dryRun = false, force = false } = options;
  
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
  if (analysis.has_links && analysis.link_count > 0 && !dryRun && !force) {
    console.log(`   ⏭️ Already processed (${analysis.link_count} links) - skipping`);
    return { skipped: true, reason: 'already_processed' };
  }
  
  if (force) {
    console.log(`   🔄 Force reprocessing (${analysis.link_count || 0} existing links)`);
  }
  
  const claudeResponse = analysis.claude_response;
  
  // Extract analysis text
  const analysisText = extractAnalysisText(claudeResponse);
  if (!analysisText) {
    console.log(`   ⚠️ No analysis text found`);
    return { skipped: true, reason: 'no_content' };
  }
  
  // Extract contributors
  const contributors = extractContributorsFromRailwayData(claudeResponse);
  console.log(`   👥 Found ${contributors.length} contributors: ${contributors.map(c => c.name).join(', ')}`);
  
  // Process contributor links with person ID lookup
  let processedText = analysisText;
  
  if (contributors.length > 0) {
    processedText = await addContributorLinksWithPersonIds(processedText, contributors, client);
  }
  
  // Count links in processed content
  const contributorLinks = (processedText.match(/<a[^>]*href="\/person\/[^"]*"[^>]*>/g) || []).length;
  const totalLinks = contributorLinks;
  
  console.log(`   🔗 Added ${contributorLinks} contributor links`);
  
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
    contributorLinks,
    totalLinks
  };
}

/**
 * Get analyses that need link processing
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
      m.tmdb_id
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ${whereClause}
    ORDER BY ma.created_at DESC
    LIMIT $1
  `;
  
  const result = await client.query(query, [limit]);
  return result.rows;
}

/**
 * Main processing function
 */
async function processContributorLinks(options = {}) {
  const { 
    limit = 100, 
    dryRun = false, 
    force = false 
  } = options;
  
  console.log('🚂 Railway Contributor Link Processor');
  console.log('=====================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  console.log(`Limit: ${limit} analyses`);
  console.log(`Force reprocess: ${force ? 'Yes' : 'No'}\n`);
  
  const client = getRailwayClient();
  
  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');
    
    const analyses = await getAnalysesToProcess(client, limit, { force });
    console.log(`📋 Found ${analyses.length} analyses to process\n`);
    
    if (analyses.length === 0) {
      console.log('✅ No analyses need processing');
      return { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 };
    }
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalContributorLinks = 0;
    
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      
      try {
        console.log(`[${i + 1}/${analyses.length}]`);
        const result = await processRailwayAnalysis(client, analysis, { 
          dryRun, 
          force 
        });
        
        if (result.skipped) {
          totalSkipped++;
        } else if (result.processed) {
          totalProcessed++;
          totalContributorLinks += result.contributorLinks;
        }
        
        // Rate limiting
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
    console.log(`  • Contributor links added: ${totalContributorLinks}`);
    console.log(`  • Mode: ${dryRun ? 'DRY RUN - No data modified' : 'LIVE - Database updated'}`);
    
    return {
      totalProcessed,
      totalSkipped,
      totalErrors,
      totalContributorLinks
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
  
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    limit: 100
  };
  
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  if (limitArg) {
    options.limit = parseInt(limitArg.split('=')[1]) || 100;
  }
  
  try {
    await processContributorLinks(options);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}