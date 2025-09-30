/**
 * Backfill Analysis Links - Add HTML links to existing movie analyses
 *
 * Production-ready batch processor with progress tracking, retry logic, and concurrency control.
 * Processes existing analyses in the database to add clickable movie title
 * and contributor links to the content sections.
 *
 * Usage:
 *   node scripts/backfill-analysis-links.js [--limit N] [--dry-run] [--concurrency N]
 *
 * Options:
 *   --limit N        Process only N analyses (for testing)
 *   --dry-run        Show what would be processed without updating database
 *   --concurrency N  Number of parallel processes (default: 10)
 *
 * Features:
 *   - Progress tracking with automatic resume
 *   - Retry logic with exponential backoff
 *   - Graceful shutdown (SIGINT saves progress)
 *   - Detailed statistics and time estimates
 */

import fs from 'fs/promises';
import { getPool, MovieService } from '../lib/railway-db.js';
import { processAnalysisContent } from '../lib/movie-analysis-linker.js';

const PROGRESS_FILE = 'backfill-links-progress.json';
const MAX_RETRIES = 3;

// Parse command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;
const dryRun = args.includes('--dry-run');
const concurrencyIndex = args.indexOf('--concurrency');
const concurrency = concurrencyIndex !== -1 ? parseInt(args[concurrencyIndex + 1]) : 10;

console.log('🔗 Analysis Link Backfill Script');
console.log('================================\n');
if (dryRun) console.log('🧪 DRY RUN MODE - No database updates\n');
if (limit) console.log(`📊 Processing limit: ${limit} analyses\n`);
console.log(`⚡ Concurrency: ${concurrency} parallel processes\n`);

// Progress tracking
async function loadProgress() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
    const progress = JSON.parse(data);
    progress.processedIds = new Set(progress.processedIds || []);
    console.log(`📂 Loaded progress: ${progress.processed} analyses processed, ${progress.updated} updated\n`);
    return progress;
  } catch (error) {
    return {
      startTime: new Date().toISOString(),
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      totalLinks: 0,
      processedIds: new Set(),
      lastSaved: new Date().toISOString()
    };
  }
}

async function saveProgress(progress) {
  const toSave = {
    ...progress,
    processedIds: Array.from(progress.processedIds),
    lastSaved: new Date().toISOString()
  };
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(toSave, null, 2));
}

// Retry wrapper for processing with exponential backoff
async function processWithRetry(fn, retryCount = 0) {
  try {
    return await fn();
  } catch (error) {
    if (retryCount < MAX_RETRIES && (
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNRESET') ||
      error.code === 'ECONNREFUSED'
    )) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`   ⏳ Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return processWithRetry(fn, retryCount + 1);
    }
    throw error;
  }
}

// Process a single analysis with retry logic
async function processAnalysis(row, pool, progress) {
  const { analysis_id, movie_id, claude_response, title, year, tmdb_id } = row;

  try {
    return await processWithRetry(async () => {
      // Parse the raw_content JSON
      const rawContent = claude_response.raw_content;
      let analysisData;

      try {
        analysisData = JSON.parse(rawContent);
      } catch (e) {
        console.log(`⚠️  ${title} (${year}) - Invalid JSON, skipping`);
        return { analysisId: analysis_id, skipped: true };
      }

      // Check if already has processed_content with links
      if (claude_response.processed_content &&
          claude_response.processed_content.includes('<a href=')) {
        console.log(`✓ ${title} (${year}) - Already has links, skipping`);
        return { analysisId: analysis_id, skipped: true };
      }

      // Check if content array exists
      if (!analysisData.content || !Array.isArray(analysisData.content)) {
        console.log(`⚠️  ${title} (${year}) - No content array, skipping`);
        return { analysisId: analysis_id, skipped: true };
      }

      // Process each content section
      let linksAdded = 0;
      const updatedContent = [];

      for (const section of analysisData.content) {
        if (!section.text || typeof section.text !== 'string') {
          updatedContent.push(section);
          continue;
        }

        // Skip if already has HTML links
        if (section.text.includes('<a href=')) {
          updatedContent.push(section);
          continue;
        }

        // Process this section's text
        const processedText = await processAnalysisContent(
          section.text,
          title,
          `${title} - ${section.type}`,
          rawContent,
          {
            processMovies: true,
            processContributors: true
          }
        );

        // Count links added
        const linkCount = (processedText.match(/<a href=/g) || []).length;
        if (linkCount > 0) {
          linksAdded += linkCount;
        }

        updatedContent.push({
          ...section,
          text: processedText
        });
      }

      if (linksAdded > 0) {
        console.log(`✅ ${title} (${year}) - ${linksAdded} links`);

        if (!dryRun) {
          // Create updated analysis data with processed content
          const updatedAnalysisData = {
            ...analysisData,
            content: updatedContent
          };

          // Save as processed_content
          const updatedClaudeResponse = {
            ...claude_response,
            processed_content: JSON.stringify(updatedAnalysisData),
            has_links: true,
            linked_at: new Date().toISOString(),
            link_count: linksAdded
          };

          // Update database
          const updateQuery = `
            UPDATE movie_analyses
            SET
              claude_response = $1,
              has_links = true,
              linked_at = NOW(),
              link_count = $2,
              updated_at = NOW()
            WHERE id = $3
          `;

          await pool.query(updateQuery, [
            JSON.stringify(updatedClaudeResponse),
            linksAdded,
            analysis_id
          ]);

          return { analysisId: analysis_id, updated: true, linksAdded };
        }

        return { analysisId: analysis_id, updated: true, linksAdded };
      } else {
        console.log(`ℹ️  ${title} (${year}) - No links`);
        return { analysisId: analysis_id, skipped: true };
      }
    });

  } catch (error) {
    console.error(`❌ ${title} (${year}):`, error.message);
    return { analysisId: analysis_id, error: true, errorMessage: error.message };
  }
}

async function backfillAnalysisLinks() {
  const pool = getPool();
  const progress = await loadProgress();
  let shouldExit = false;

  // Graceful shutdown handler
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Received SIGINT - saving progress...');
    shouldExit = true;
    await saveProgress(progress);
    console.log('✅ Progress saved. Safe to exit.');
    process.exit(0);
  });

  try {
    const startTime = Date.now();

    // Get analyses to process, excluding already processed ones
    const processedIdsArray = Array.from(progress.processedIds);
    const processedIdsClause = processedIdsArray.length > 0
      ? `AND ma.id NOT IN (${processedIdsArray.map(id => `'${id}'`).join(',')})`
      : '';

    const query = `
      SELECT
        ma.id as analysis_id,
        ma.movie_id,
        ma.claude_response,
        m.title,
        m.year,
        m.tmdb_id
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE ma.claude_response->>'raw_content' IS NOT NULL
      AND ma.claude_response->>'raw_content' LIKE '{%'
      AND (ma.claude_response->>'processed_content' IS NULL OR ma.has_links = false)
      ${processedIdsClause}
      ORDER BY m.id
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    const result = await pool.query(query);
    const analyses = result.rows;

    console.log(`🎬 Processing ${analyses.length} analyses (${progress.processed} already done)...\n`);

    // Process in batches with concurrency control
    for (let i = 0; i < analyses.length; i += concurrency) {
      if (shouldExit) break;

      const batch = analyses.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(row => processAnalysis(row, pool, progress))
      );

      // Update progress with batch results
      for (const result of batchResults) {
        if (result) {
          progress.processed++;
          progress.processedIds.add(result.analysisId);
          if (result.updated) {
            progress.updated++;
            progress.totalLinks += result.linksAdded;
          } else if (result.skipped) {
            progress.skipped++;
          } else if (result.error) {
            progress.errors++;
          }
        }
      }

      // Save progress periodically (every batch)
      if (progress.processed % 100 < concurrency) {
        await saveProgress(progress);

        // Calculate time estimates
        const elapsed = Date.now() - startTime;
        const rate = progress.processed / (elapsed / 1000); // per second
        const remaining = analyses.length - progress.processed;
        const estimatedSeconds = remaining / rate;
        const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

        console.log(`\n📊 Progress: ${progress.processed}/${analyses.length} | Updated: ${progress.updated} | Skipped: ${progress.skipped} | Errors: ${progress.errors} | Links: ${progress.totalLinks}`);
        console.log(`⏱️  Rate: ${rate.toFixed(2)}/sec | Est. remaining: ${estimatedMinutes} min\n`);
      }
    }

    // Save final progress
    await saveProgress(progress);

    // Final summary
    const totalElapsed = Date.now() - startTime;
    const totalMinutes = Math.floor(totalElapsed / 60000);
    const totalSeconds = Math.floor((totalElapsed % 60000) / 1000);

    console.log('\n================================');
    console.log('✅ Backfill Complete!\n');
    console.log(`📊 Statistics:`);
    console.log(`   Total processed: ${progress.processed}`);
    console.log(`   Updated: ${progress.updated}`);
    console.log(`   Skipped: ${progress.skipped}`);
    console.log(`   Errors: ${progress.errors}`);
    console.log(`   Total links added: ${progress.totalLinks}`);
    console.log(`   Average links per movie: ${(progress.totalLinks / progress.updated).toFixed(1)}`);
    console.log(`\n⏱️  Total time: ${totalMinutes}m ${totalSeconds}s`);
    console.log(`   Rate: ${(progress.processed / (totalElapsed / 1000)).toFixed(2)} analyses/sec`);

    if (dryRun) {
      console.log('\n🧪 DRY RUN - No database changes made');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await saveProgress(progress);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
backfillAnalysisLinks();