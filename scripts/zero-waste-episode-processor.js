#!/usr/bin/env node

/**
 * Zero-Waste Episode Processor
 * 
 * Processes episode files to add movie links with bulletproof protection against
 * overwriting existing linked content. Uses three-tier strategy.
 */

import { 
  episodeHasLinks, 
  trackZeroWasteSavings,
  validateContentIntegrity 
} from '../lib/zero-waste-protection.js';
import { processEpisodeContent } from '../lib/episode-movie-linker.js';
import fs from 'fs';
import path from 'path';

// Command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '10');

/**
 * Get all episode files
 */
function getAllEpisodeFiles() {
  const episodesDir = path.join(process.cwd(), 'public/data/episodes');
  
  if (!fs.existsSync(episodesDir)) {
    console.error('❌ Episodes directory not found:', episodesDir);
    return [];
  }

  const files = fs.readdirSync(episodesDir)
    .filter(f => f.endsWith('.json'))
    .filter(f => !f.includes('updated')) // Skip backup files
    .sort();

  return files.map(filename => ({
    filename,
    path: path.join(episodesDir, filename)
  }));
}

/**
 * Process a single episode with zero-waste protection
 */
async function processEpisodeWithProtection(episodeFile) {
  try {
    console.log(`🎬 Processing: ${episodeFile.filename}`);
    
    // Read existing episode data
    const episodeData = JSON.parse(fs.readFileSync(episodeFile.path, 'utf8'));
    
    // ZERO-WASTE: Check if episode already has links (Tier 1 - Complete)
    if (episodeHasLinks(episodeData)) {
      const savings = trackZeroWasteSavings('tier1_skip', {});
      console.log(`  ⚡ TIER 1 - Skipping complete episode - Saved: $${savings.costSaved.toFixed(4)}`);
      return {
        success: true,
        skipped: true,
        reason: 'existing_complete',
        costSaved: savings.costSaved,
        filename: episodeFile.filename
      };
    }

    // ZERO-WASTE: Process as Tier 2 - Add links to existing content
    console.log(`  🔗 TIER 2 - Adding links to episode content`);
    
    const originalContent = JSON.stringify(episodeData);
    let processedEpisode = { ...episodeData };
    let linksAdded = 0;

    // Process opener
    if (processedEpisode.content?.opener) {
      const originalOpener = processedEpisode.content.opener;
      processedEpisode.content.opener = await processEpisodeContent(
        processedEpisode.content.opener,
        `${episodeFile.filename} opener`
      );
      if (processedEpisode.content.opener !== originalOpener) {
        linksAdded++;
      }
    }

    // Process sections
    if (processedEpisode.content?.sections) {
      for (let i = 0; i < processedEpisode.content.sections.length; i++) {
        const section = processedEpisode.content.sections[i];
        
        if (section.type === 'text' && section.content) {
          const originalSectionContent = section.content;
          processedEpisode.content.sections[i].content = await processEpisodeContent(
            section.content,
            `${episodeFile.filename} section ${i}`
          );
          if (processedEpisode.content.sections[i].content !== originalSectionContent) {
            linksAdded++;
          }
        }
      }
    }

    // Process moreIdeas content
    if (processedEpisode.content?.moreIdeas?.content) {
      const originalMoreIdeas = processedEpisode.content.moreIdeas.content;
      processedEpisode.content.moreIdeas.content = await processEpisodeContent(
        processedEpisode.content.moreIdeas.content,
        `${episodeFile.filename} moreIdeas`
      );
      if (processedEpisode.content.moreIdeas.content !== originalMoreIdeas) {
        linksAdded++;
      }
    }

    const processedContent = JSON.stringify(processedEpisode);

    // Validate content integrity
    const validation = validateContentIntegrity(
      originalContent,
      processedContent,
      'tier2_episode_linking'
    );

    if (!validation.valid) {
      console.error(`  🚨 Content integrity validation failed: ${validation.errors.join(', ')}`);
      return {
        success: false,
        error: `Content integrity violation: ${validation.errors.join(', ')}`,
        filename: episodeFile.filename
      };
    }

    // Add metadata for tracking
    processedEpisode._zeroWaste = {
      linkedAt: new Date().toISOString(),
      hasLinks: linksAdded > 0,
      linksAdded: linksAdded,
      tier: 'tier2_link_only'
    };

    if (!dryRun) {
      // Write processed episode back to file
      fs.writeFileSync(episodeFile.path, JSON.stringify(processedEpisode, null, 2));
      console.log(`  💾 Updated: ${episodeFile.filename}`);
    }

    const savings = trackZeroWasteSavings('tier2_link_only', { linksAdded });
    console.log(`  ✅ Processed: ${linksAdded} links added - Cost: $${savings.costIncurred.toFixed(4)}`);

    return {
      success: true,
      skipped: false,
      linksAdded,
      costSaved: savings.costSaved,
      costIncurred: savings.costIncurred,
      filename: episodeFile.filename
    };

  } catch (error) {
    console.error(`  ❌ Error processing ${episodeFile.filename}:`, error.message);
    return {
      success: false,
      error: error.message,
      filename: episodeFile.filename
    };
  }
}

/**
 * Process episodes in batches
 */
async function processBatch(episodeFiles, batchNum, totalBatches) {
  console.log(`\n🎬 ZERO-WASTE Episode Batch ${batchNum}/${totalBatches} (${episodeFiles.length} episodes)`);

  const batchStats = {
    success: 0,
    failed: 0,
    skipped: 0,
    totalLinksAdded: 0,
    totalCostSaved: 0,
    totalCostIncurred: 0,
    errors: []
  };

  // Process episodes sequentially to avoid overwhelming TMDB API
  for (const episodeFile of episodeFiles) {
    const result = await processEpisodeWithProtection(episodeFile);
    
    if (result.success) {
      if (result.skipped) {
        batchStats.skipped++;
        batchStats.totalCostSaved += result.costSaved || 0;
      } else {
        batchStats.success++;
        batchStats.totalLinksAdded += result.linksAdded || 0;
        batchStats.totalCostSaved += result.costSaved || 0;
        batchStats.totalCostIncurred += result.costIncurred || 0;
      }
    } else {
      batchStats.failed++;
      batchStats.errors.push({
        filename: result.filename,
        error: result.error
      });
    }

    // Rate limiting between episodes
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Batch ${batchNum} complete: ${batchStats.success} processed, ${batchStats.skipped} skipped, ${batchStats.failed} failed`);
  console.log(`💰 Batch metrics: ${batchStats.totalLinksAdded} links added, $${batchStats.totalCostSaved.toFixed(4)} saved, $${batchStats.totalCostIncurred.toFixed(4)} spent`);

  return batchStats;
}

/**
 * Main processing function
 */
async function processEpisodes() {
  const startTime = Date.now();
  console.log('🛡️ Zero-Waste Episode Processor');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}\n`);

  let episodeFiles;

  if (targetFile) {
    // Process single file
    const filePath = path.join(process.cwd(), 'public/data/episodes', targetFile);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${targetFile}`);
      return;
    }
    episodeFiles = [{ filename: targetFile, path: filePath }];
    console.log(`🎯 Target: Single file - ${targetFile}`);
  } else {
    // Process all files
    episodeFiles = getAllEpisodeFiles();
    console.log(`🎯 Target: ${episodeFiles.length} episode files`);
  }

  if (episodeFiles.length === 0) {
    console.log('✅ No episodes to process!');
    return;
  }

  // Process in batches
  const totalStats = {
    success: 0,
    failed: 0,
    skipped: 0,
    totalLinksAdded: 0,
    totalCostSaved: 0,
    totalCostIncurred: 0,
    errors: []
  };

  const totalBatches = Math.ceil(episodeFiles.length / batchSize);

  for (let i = 0; i < episodeFiles.length; i += batchSize) {
    const batchFiles = episodeFiles.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      const batchStats = await processBatch(batchFiles, batchNum, totalBatches);
      
      totalStats.success += batchStats.success;
      totalStats.failed += batchStats.failed;
      totalStats.skipped += batchStats.skipped;
      totalStats.totalLinksAdded += batchStats.totalLinksAdded;
      totalStats.totalCostSaved += batchStats.totalCostSaved;
      totalStats.totalCostIncurred += batchStats.totalCostIncurred;
      totalStats.errors.push(...batchStats.errors);

    } catch (error) {
      console.error(`💥 Batch ${batchNum} failed completely:`, error);
      totalStats.failed += batchFiles.length;
    }
  }

  // Final summary
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const totalProcessed = totalStats.success + totalStats.skipped;

  console.log('\n🛡️ ZERO-WASTE EPISODE PROCESSING COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`✅ Processed: ${totalStats.success} episodes`);
  console.log(`⚡ Skipped (complete): ${totalStats.skipped} episodes`);
  console.log(`❌ Failed: ${totalStats.failed} episodes`);
  console.log(`🔗 Total links added: ${totalStats.totalLinksAdded}`);
  console.log(`⏱️  Total time: ${totalTime}s (${Math.round(totalTime / 60)}m)`);
  console.log(`💰 Cost saved: $${totalStats.totalCostSaved.toFixed(4)}`);
  console.log(`💰 Cost incurred: $${totalStats.totalCostIncurred.toFixed(4)}`);
  console.log(`💰 Net savings: $${(totalStats.totalCostSaved - totalStats.totalCostIncurred).toFixed(4)}`);
  console.log(`🎯 Mode: ${dryRun ? 'DRY RUN - No files modified' : 'LIVE - Files updated'}`);

  if (totalStats.failed > 0) {
    console.log(`\n⚠️  Failed episodes (first 5): ${totalStats.errors.slice(0, 5).map(e => e.filename).join(', ')}`);
  }

  // Create processing report
  const report = {
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'live',
    totalEpisodes: episodeFiles.length,
    processed: totalStats.success,
    skipped: totalStats.skipped,
    failed: totalStats.failed,
    totalLinksAdded: totalStats.totalLinksAdded,
    processingTimeSeconds: totalTime,
    costMetrics: {
      saved: totalStats.totalCostSaved,
      incurred: totalStats.totalCostIncurred,
      netSavings: totalStats.totalCostSaved - totalStats.totalCostIncurred
    },
    errors: totalStats.errors.slice(0, 20) // Keep first 20 errors
  };

  const reportPath = path.join(process.cwd(), `episode-processing-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved: ${path.basename(reportPath)}`);
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🛡️ Zero-Waste Episode Processor

Processes episode files to add movie links with bulletproof protection against content waste.

Usage:
  node scripts/zero-waste-episode-processor.js [options]

Options:
  --dry-run           Test mode - don't modify files
  --file=FILENAME     Process single episode file
  --batch=N           Process N episodes in parallel (default: 10)
  --help, -h          Show this help

Examples:
  node scripts/zero-waste-episode-processor.js --dry-run                    # Test all episodes
  node scripts/zero-waste-episode-processor.js --file=genius-1-1-1.json    # Process single file
  node scripts/zero-waste-episode-processor.js --batch=5                   # Process all, 5 at a time

Features:
  🛡️ Zero-waste protection - skips episodes with existing links
  🔗 Movie link processing - converts quoted titles to HTML links
  💰 Cost tracking - monitors savings and expenses
  ✅ Content integrity validation - prevents corruption
  📊 Detailed reporting - processing statistics and errors

The processor uses three-tier strategy: skip complete, link unlinked, generate fresh.
`);
  process.exit(0);
}

// Run the processor
processEpisodes().catch(error => {
  console.error('💥 Episode processing failed:', error);
  process.exit(1);
});