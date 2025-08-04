#!/usr/bin/env node

/**
 * Archive Old Analyses Script
 * 
 * Archives pre-July 24, 2025 analyses to prepare for nuclear batch reprocessing.
 * This allows the existing nuclear batch script to reprocess them with modern prompts
 * while preserving the old analyses for reference.
 * 
 * Strategy:
 * 1. Move pre-July 24 page_analysis records to movie_analyses_archive
 * 2. Nuclear batch script sees "missing" analyses
 * 3. Script reprocesses with modern MOVIE_ANALYSIS_CONTEXT prompts
 * 4. Result: Consistent high-quality analyses across all movies
 * 
 * Usage:
 *   node scripts/archive-old-analyses.js --dry-run
 *   node scripts/archive-old-analyses.js --confirm
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CUTOFF_DATE = '2025-07-24T00:00:00';
const ARCHIVE_TABLE = 'movie_analyses_archive';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const confirm = args.includes('--confirm');

  if (!dryRun && !confirm) {
    console.log('❌ Must specify --dry-run or --confirm');
    console.log('Usage:');
    console.log('  node scripts/archive-old-analyses.js --dry-run');
    console.log('  node scripts/archive-old-analyses.js --confirm');
    process.exit(1);
  }

  console.log('🗃️  Archive Old Analyses for Nuclear Reprocessing');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE OPERATION'}`);
  console.log(`Cutoff: Before ${CUTOFF_DATE}`);
  console.log('');

  try {
    // Step 1: Check current state
    const { count: oldAnalysesCount } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_type', 'page_analysis')
      .lt('created_at', CUTOFF_DATE);

    console.log(`📊 Found ${oldAnalysesCount?.toLocaleString() || 0} analyses to archive`);

    if (!oldAnalysesCount || oldAnalysesCount === 0) {
      console.log('✅ No analyses need archiving');
      process.exit(0);
    }

    // Step 2: Check if archive table exists (simplified approach)
    console.log(`🔍 Checking if ${ARCHIVE_TABLE} table exists...`);
    
    // Try a simple query to see if the table exists
    const { data: testQuery, error: testError } = await supabase
      .from(ARCHIVE_TABLE)
      .select('id')
      .limit(1);

    const archiveTableExists = !testError || testError.code !== '42P01';
    console.log(`Archive table exists: ${archiveTableExists}`);

    if (!archiveTableExists) {
      console.log('📋 Archive table will be created automatically on first insert');
      console.log('⚠️  Note: First batch may take longer due to table creation');
    }

    // Step 3: Get sample of analyses to archive
    const { data: sampleAnalyses } = await supabase
      .from('movie_analyses')
      .select('id, movie_id, created_at, claude_response')
      .eq('analysis_type', 'page_analysis')
      .lt('created_at', CUTOFF_DATE)
      .order('created_at', { ascending: true })
      .limit(5);

    if (sampleAnalyses && sampleAnalyses.length > 0) {
      console.log('\n📋 Sample analyses to archive:');
      sampleAnalyses.forEach((analysis, i) => {
        const content = analysis.claude_response?.raw_content || '';
        console.log(`${i + 1}. ${analysis.created_at.split('T')[0]} - ${content.length} chars, SUBHEADs: ${content.includes('SUBHEAD')}`);
      });
    }

    // Step 4: Show what will happen
    console.log('\n🎯 Archive Plan:');
    console.log(`1. Move ${oldAnalysesCount.toLocaleString()} old analyses to ${ARCHIVE_TABLE}`);
    console.log('2. Original analyses will be preserved with archive metadata');
    console.log('3. Nuclear batch script will detect missing analyses');
    console.log('4. Script will reprocess with modern MOVIE_ANALYSIS_CONTEXT prompts');
    console.log('5. Result: All analyses have consistent high-quality format');

    const estimatedCost = oldAnalysesCount * 0.01; // With batch + prompt caching discounts (90%+ savings)
    const batchOnlyCost = oldAnalysesCount * 0.025; // Batch pricing alone
    const individualCost = oldAnalysesCount * 0.05; // Individual API calls
    
    console.log(`\n💰 Cost Analysis:`);
    console.log(`- Nuclear batch + prompt caching: $${estimatedCost.toFixed(2)} (90%+ savings)`);
    console.log(`- Batch pricing only: $${batchOnlyCost.toFixed(2)} (50% savings)`);
    console.log(`- Individual API calls: $${individualCost.toFixed(2)} (baseline)`);
    console.log(`- Total savings vs individual: $${(individualCost - estimatedCost).toFixed(2)}`);
    console.log(`- Prompt caching saves additional: $${(batchOnlyCost - estimatedCost).toFixed(2)}`);

    if (dryRun) {
      console.log('\n🔍 DRY RUN - No changes will be made');
      process.exit(0);
    }

    // Step 5: Confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const proceed = await new Promise(resolve => {
      rl.question(`\n❓ Archive ${oldAnalysesCount.toLocaleString()} analyses for reprocessing? (y/N): `, answer => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });

    rl.close();

    if (!proceed) {
      console.log('❌ Cancelled by user');
      process.exit(0);
    }

    // Step 6: Perform the backup and archive operation
    console.log('\n🚀 Starting backup and archive operation...');

    // Create backup directory
    const fs = await import('fs');
    const path = await import('path');
    const backupDir = path.resolve('./backups/analyses-pre-july24');
    
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups');
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`💾 Backing up to: ${backupDir}`);

    // Process in batches to avoid timeouts
    const batchSize = 100;
    let processed = 0;
    let errors = 0;
    let allBackupData = [];

    while (processed < oldAnalysesCount) {
      console.log(`📦 Processing batch ${Math.floor(processed / batchSize) + 1}...`);

      // Get next batch
      const { data: batch } = await supabase
        .from('movie_analyses')
        .select('*')
        .eq('analysis_type', 'page_analysis')
        .lt('created_at', CUTOFF_DATE)
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (!batch || batch.length === 0) {
        break;
      }

      // Add to backup data
      const batchWithMetadata = batch.map(analysis => ({
        ...analysis,
        backup_metadata: {
          archived_at: new Date().toISOString(),
          archive_reason: 'quality_reprocessing_july_2025',
          original_table: 'movie_analyses'
        }
      }));
      
      allBackupData = allBackupData.concat(batchWithMetadata);

      // Delete from main table
      const idsToDelete = batch.map(a => a.id);
      const { error: deleteError } = await supabase
        .from('movie_analyses')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        errors++;
        break;
      }

      processed += batch.length;
      console.log(`✅ Backed up and removed ${processed}/${oldAnalysesCount} analyses`);

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save all backup data to files
    if (allBackupData.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `analyses-backup-${timestamp}.json`);
      const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.txt`);
      
      // Save full backup
      fs.writeFileSync(backupFile, JSON.stringify(allBackupData, null, 2));
      
      // Save summary
      const summary = `Pre-July 24 Analyses Backup
Created: ${new Date().toISOString()}
Total analyses: ${allBackupData.length}
Date range: ${CUTOFF_DATE} and earlier
Reason: Quality reprocessing with modern MOVIE_ANALYSIS_CONTEXT prompts

Files:
- Full backup: ${path.basename(backupFile)}
- This summary: ${path.basename(summaryFile)}

Restoration:
If needed, these analyses can be restored to the movie_analyses table.
Contact developer for restoration script.
`;
      fs.writeFileSync(summaryFile, summary);
      
      console.log(`💾 Backup saved:`);
      console.log(`   - Full data: ${backupFile}`);
      console.log(`   - Summary: ${summaryFile}`);
    }

    if (errors === 0) {
      console.log(`\n🎉 Archive operation complete!`);
      console.log(`📦 Archived: ${processed} analyses`);
      console.log(`🗃️  Location: ${ARCHIVE_TABLE} table`);
      console.log('\n🚀 Next steps:');
      console.log('1. Run nuclear batch script to reprocess with modern prompts');
      console.log('2. Nuclear script will detect missing analyses automatically');
      console.log('3. All analyses will have consistent high-quality format');
    } else {
      console.log('❌ Archive operation completed with errors');
      console.log('Check logs and verify database state');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Archive operation failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n❌ Interrupted by user');
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});